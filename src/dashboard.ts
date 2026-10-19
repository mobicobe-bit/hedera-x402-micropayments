/**
 * Combined Revenue Dashboard
 * Tracks earnings from x402 API micropayments + MicroLottery protocol fees
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

interface X402RevenueRecord {
  timestamp: string;
  endpoint: string;
  payer: string;
  amount: string; // USDC base units (6 decimals)
  currency: "USDC";
  network: "hedera:testnet" | "hedera:mainnet";
  txHash: string;
}

interface LotteryRevenueRecord {
  timestamp: string;
  roundId: number;
  ticketPriceTinybars: number;
  ticketsSold: number;
  protocolFeeBps: number;
  protocolFeeTinybars: number;
  protocolFeeReceiver: string;
  txHash: string;
}

interface CombinedMetrics {
  x402: {
    totalRevenueUSDC: number;
    totalCalls: number;
    revenueByEndpoint: Record<string, { calls: number; revenue: number }>;
    revenueByDay: Record<string, number>;
    uniquePayers: number;
  };
  lottery: {
    totalProtocolFeeHBAR: number;
    totalRounds: number;
    totalTicketsSold: number;
    revenueByRound: Record<number, { tickets: number; feeHBAR: number }>;
    revenueByDay: Record<string, number>;
  };
  combined: {
    totalRevenueUSD: number; // approximate
    x402RevenueUSD: number;
    lotteryRevenueUSD: number;
  };
}

// In-memory stores (replace with DB in production)
const x402RevenueStore: X402RevenueRecord[] = [];
const lotteryRevenueStore: LotteryRevenueRecord[] = [];

// Load from persistent storage on startup
async function loadRevenueData() {
  try {
    const fs = await import("fs/promises");
    const x402Data = await fs.readFile("./data/x402-revenue.json", "utf-8");
    x402RevenueStore.push(...JSON.parse(x402Data));
  } catch {}
  try {
    const fs = await import("fs/promises");
    const lotteryData = await fs.readFile("./data/lottery-revenue.json", "utf-8");
    lotteryRevenueStore.push(...JSON.parse(lotteryData));
  } catch {}
}

// Persist to disk
async function persistRevenueData() {
  const fs = await import("fs/promises");
  await fs.mkdir("./data", { recursive: true });
  await fs.writeFile("./data/x402-revenue.json", JSON.stringify(x402RevenueStore, null, 2));
  await fs.writeFile("./data/lottery-revenue.json", JSON.stringify(lotteryRevenueStore, null, 2));
}

// Record x402 payment (called from middleware after successful settlement)
export function recordX402Payment(record: Omit<X402RevenueRecord, "timestamp">) {
  const fullRecord: X402RevenueRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  x402RevenueStore.push(fullRecord);
  persistRevenueData();
}

// Record lottery protocol fee
export function recordLotteryFee(record: Omit<LotteryRevenueRecord, "timestamp">) {
  const fullRecord: LotteryRevenueRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  lotteryRevenueStore.push(fullRecord);
  persistRevenueData();
}

// Compute combined metrics
function computeMetrics(): CombinedMetrics {
  const now = new Date();
  const hbarToUsd = 0.05; // Approximate, replace with real oracle
  const usdcToUsd = 1.0;

  // X402 metrics
  const x402RevenueUSDC = x402RevenueStore.reduce((sum, r) => sum + parseInt(r.amount) / 1_000_000, 0);
  const x402Calls = x402RevenueStore.length;
  const revenueByEndpoint: Record<string, { calls: number; revenue: number }> = {};
  const revenueByDayX402: Record<string, number> = {};
  const uniquePayers = new Set(x402RevenueStore.map(r => r.payer)).size;

  for (const r of x402RevenueStore) {
    const day = r.timestamp.split("T")[0];
    revenueByDayX402[day] = (revenueByDayX402[day] || 0) + parseInt(r.amount) / 1_000_000;
    const ep = revenueByEndpoint[r.endpoint] || { calls: 0, revenue: 0 };
    ep.calls++;
    ep.revenue += parseInt(r.amount) / 1_000_000;
    revenueByEndpoint[r.endpoint] = ep;
  }

  // Lottery metrics
  let totalProtocolFeeTinybars = 0;
  const revenueByRound: Record<number, { tickets: number; feeHBAR: number }> = {};
  const revenueByDayLottery: Record<string, number> = {};

  for (const r of lotteryRevenueStore) {
    const feeHBAR = r.protocolFeeTinybars / 100_000_000;
    totalProtocolFeeTinybars += r.protocolFeeTinybars;
    const day = r.timestamp.split("T")[0];
    revenueByDayLottery[day] = (revenueByDayLottery[day] || 0) + feeHBAR;
    const rr = revenueByRound[r.roundId] || { tickets: 0, feeHBAR: 0 };
    rr.tickets += r.ticketsSold;
    rr.feeHBAR += feeHBAR;
    revenueByRound[r.roundId] = rr;
  }

  const totalProtocolFeeHBAR = totalProtocolFeeTinybars / 100_000_000;

  return {
    x402: {
      totalRevenueUSDC: x402RevenueUSDC,
      totalCalls: x402Calls,
      revenueByEndpoint,
      revenueByDay: revenueByDayX402,
      uniquePayers,
    },
    lottery: {
      totalProtocolFeeHBAR,
      totalRounds: Object.keys(revenueByRound).length,
      totalTicketsSold: lotteryRevenueStore.reduce((sum, r) => sum + r.ticketsSold, 0),
      revenueByRound,
      revenueByDay: revenueByDayLottery,
    },
    combined: {
      x402RevenueUSD: x402RevenueUSDC * usdcToUsd,
      lotteryRevenueUSD: totalProtocolFeeHBAR * hbarToUsd,
      totalRevenueUSD: x402RevenueUSDC * usdcToUsd + totalProtocolFeeHBAR * hbarToUsd,
    },
  };
}

// Create dashboard API
const app = new Hono();

app.use("*", cors({ origin: "*" }));

// Health
app.get("/health", (c) => c.json({ status: "ok", service: "revenue-dashboard" }));

// Get combined metrics
app.get("/api/dashboard/metrics", (c) => c.json(computeMetrics()));

// Get x402 revenue records (paginated)
app.get("/api/dashboard/x402/revenue", (c) => {
  const limit = parseInt(c.req.query("limit") || "100");
  const offset = parseInt(c.req.query("offset") || "0");
  const sorted = [...x402RevenueStore].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return c.json({
    records: sorted.slice(offset, offset + limit),
    total: x402RevenueStore.length,
    limit,
    offset,
  });
});

// Get lottery revenue records (paginated)
app.get("/api/dashboard/lottery/revenue", (c) => {
  const limit = parseInt(c.req.query("limit") || "100");
  const offset = parseInt(c.req.query("offset") || "0");
  const sorted = [...lotteryRevenueStore].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return c.json({
    records: sorted.slice(offset, offset + limit),
    total: lotteryRevenueStore.length,
    limit,
    offset,
  });
});

// Webhook: called by x402 middleware after payment settles
app.post("/api/dashboard/webhook/x402-settlement", async (c) => {
  const body = await c.req.json() as {
    endpoint: string;
    payer: string;
    amount: string;
    currency: string;
    network: string;
    txHash: string;
  };
  recordX402Payment({
    endpoint: body.endpoint,
    payer: body.payer,
    amount: body.amount,
    currency: body.currency as "USDC",
    network: body.network as "hedera:testnet" | "hedera:mainnet",
    txHash: body.txHash,
  });
  return c.json({ success: true });
});

// Webhook: called by lottery backend after draw
app.post("/api/dashboard/webhook/lottery-fee", async (c) => {
  const body = await c.req.json() as {
    roundId: number;
    ticketPriceTinybars: number;
    ticketsSold: number;
    protocolFeeBps: number;
    protocolFeeReceiver: string;
    txHash: string;
  };
  const protocolFeeTinybars = Math.floor(
    (body.ticketPriceTinybars * body.ticketsSold * body.protocolFeeBps) / 10000
  );
  recordLotteryFee({
    roundId: body.roundId,
    ticketPriceTinybars: body.ticketPriceTinybars,
    ticketsSold: body.ticketsSold,
    protocolFeeBps: body.protocolFeeBps,
    protocolFeeTinybars,
    protocolFeeReceiver: body.protocolFeeReceiver,
    txHash: body.txHash,
  });
  return c.json({ success: true });
});

// HTML Dashboard UI
app.get("/dashboard", (c) => {
  const metrics = computeMetrics();
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crypto Revenue Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    .metric-card { @apply bg-gray-900 border border-gray-700 rounded-xl p-6; }
    .stat-value { @apply text-3xl font-bold text-white; }
    .stat-label { @apply text-sm text-gray-400; }
    .revenue-positive { @apply text-green-400; }
    .tab-active { @apply border-b-2 border-blue-500 text-blue-400; }
    .tab-inactive { @apply text-gray-500 hover:text-gray-200; }
  </style>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">
  <div class="max-w-7xl mx-auto p-6">
    <header class="mb-8">
      <h1 class="text-3xl font-bold flex items-center gap-3">
        <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        Hedera Revenue Dashboard
      </h1>
      <p class="text-gray-400 mt-1">x402 API Micropayments + MicroLottery Protocol Fees</p>
    </header>

    <!-- Combined Revenue Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="metric-card">
        <div class="stat-label">Total Combined Revenue</div>
        <div class="stat-value revenue-positive mt-2">$${metrics.combined.totalRevenueUSD.toFixed(2)}</div>
        <div class="text-sm text-gray-500 mt-2">≈ ${metrics.combined.x402RevenueUSD.toFixed(2)} (x402) + $${metrics.combined.lotteryRevenueUSD.toFixed(2)} (Lottery)</div>
      </div>
      <div class="metric-card">
        <div class="stat-label">x402 API Revenue</div>
        <div class="stat-value revenue-positive mt-2">$${metrics.x402.totalRevenueUSDC.toFixed(4)} USDC</div>
        <div class="text-sm text-gray-500 mt-2">${metrics.x402.totalCalls} calls • ${metrics.x402.uniquePayers} unique payers</div>
      </div>
      <div class="metric-card">
        <div class="stat-label">Lottery Protocol Fees</div>
        <div class="stat-value revenue-positive mt-2">${metrics.lottery.totalProtocolFeeHBAR.toFixed(4)} HBAR</div>
        <div class="text-sm text-gray-500 mt-2">${metrics.lottery.totalRounds} rounds • ${metrics.lottery.totalTicketsSold} tickets</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="metric-card">
      <div class="flex border-b border-gray-700 mb-6">
        <button class="tab-active px-4 py-3 font-medium" data-tab="overview">Overview</button>
        <button class="tab-inactive px-4 py-3 font-medium" data-tab="x402">x402 API</button>
        <button class="tab-inactive px-4 py-3 font-medium" data-tab="lottery">MicroLottery</button>
        <button class="tab-inactive px-4 py-3 font-medium" data-tab="recent">Recent Activity</button>
      </div>

      <!-- Overview Tab -->
      <div id="tab-overview" class="tab-content">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold mb-4">Revenue by Day (Last 30 Days)</h3>
            <canvas id="combinedChart" height="300"></canvas>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-4">Revenue Split</h3>
            <canvas id="splitChart" height="300"></canvas>
          </div>
        </div>
      </div>

      <!-- x402 Tab -->
      <div id="tab-x402" class="tab-content hidden">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold mb-4">Revenue by Endpoint</h3>
            <canvas id="endpointChart" height="300"></canvas>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-4">x402 Revenue by Day</h3>
            <canvas id="x402DayChart" height="300"></canvas>
          </div>
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-4">Recent x402 Payments</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-400 border-b border-gray-700">
                  <th class="pb-2">Time</th>
                  <th class="pb-2">Endpoint</th>
                  <th class="pb-2">Payer</th>
                  <th class="pb-2">Amount (USDC)</th>
                  <th class="pb-2">Tx Hash</th>
                </tr>
              </thead>
              <tbody id="x402TableBody" class="text-gray-300"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Lottery Tab -->
      <div id="tab-lottery" class="tab-content hidden">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold mb-4">Revenue by Round</h3>
            <canvas id="roundChart" height="300"></canvas>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-4">Lottery Revenue by Day</h3>
            <canvas id="lotteryDayChart" height="300"></canvas>
          </div>
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-4">Recent Lottery Fees</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-400 border-b border-gray-700">
                  <th class="pb-2">Time</th>
                  <th class="pb-2">Round</th>
                  <th class="pb-2">Tickets Sold</th>
                  <th class="pb-2">Protocol Fee (HBAR)</th>
                  <th class="pb-2">Tx Hash</th>
                </tr>
              </thead>
              <tbody id="lotteryTableBody" class="text-gray-300"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Recent Activity Tab -->
      <div id="tab-recent" class="tab-content hidden">
        <h3 class="text-lg font-semibold mb-4">All Recent Revenue Events</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-400 border-b border-gray-700">
                <th class="pb-2">Time</th>
                <th class="pb-2">Source</th>
                <th class="pb-2">Details</th>
                <th class="pb-2">Revenue</th>
                <th class="pb-2">Tx Hash</th>
              </tr>
            </thead>
            <tbody id="recentTableBody" class="text-gray-300"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    const metrics = ${JSON.stringify(computeMetrics())};
    const x402Records = ${JSON.stringify([...x402RevenueStore].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20))};
    const lotteryRecords = ${JSON.stringify([...lotteryRevenueStore].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20))};

    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tab]').forEach(b => {
          b.classList.remove('tab-active');
          b.classList.add('tab-inactive');
        });
        btn.classList.remove('tab-inactive');
        btn.classList.add('tab-active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
      });
    });

    // Format helpers
    const fmtDate = (iso) => new Date(iso).toLocaleString();
    const shortHash = (h) => h.slice(0,12) + '...' + h.slice(-8);
    const linkHash = (h, network = 'testnet') => \`<a href="https://hashscan.io/\${network}/tx/\${h}" target="_blank" class="text-blue-400 hover:underline">\${shortHash(h)}</a>\`;

    // Combined Chart
    new Chart(document.getElementById('combinedChart'), {
      type: 'bar',
      data: {
        labels: Object.keys({...metrics.x402.revenueByDay, ...metrics.lottery.revenueByDay}).sort(),
        datasets: [
          { label: 'x402 (USDC)', data: Object.keys({...metrics.x402.revenueByDay, ...metrics.lottery.revenueByDay}).sort().map(d => metrics.x402.revenueByDay[d] || 0), backgroundColor: 'rgba(59,130,246,0.7)' },
          { label: 'Lottery (HBAR × $0.05)', data: Object.keys({...metrics.x402.revenueByDay, ...metrics.lottery.revenueByDay}).sort().map(d => (metrics.lottery.revenueByDay[d] || 0) * 0.05), backgroundColor: 'rgba(139,92,246,0.7)' }
        ]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#9ca3af' } } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } } } }
    });

    // Split Chart
    new Chart(document.getElementById('splitChart'), {
      type: 'doughnut',
      data: {
        labels: ['x402 API', 'MicroLottery'],
        datasets: [{ data: [metrics.combined.x402RevenueUSD, metrics.combined.lotteryRevenueUSD], backgroundColor: ['#3b82f6', '#8b5cf6'], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#9ca3af' } } } }
    });

    // Endpoint Chart
    new Chart(document.getElementById('endpointChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(metrics.x402.revenueByEndpoint),
        datasets: [{ label: 'Revenue (USDC)', data: Object.values(metrics.x402.revenueByEndpoint).map(v => v.revenue), backgroundColor: 'rgba(59,130,246,0.7)' }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } } } }
    });

    // x402 Day Chart
    new Chart(document.getElementById('x402DayChart'), {
      type: 'line',
      data: {
        labels: Object.keys(metrics.x402.revenueByDay).sort(),
        datasets: [{ label: 'Daily Revenue (USDC)', data: Object.keys(metrics.x402.revenueByDay).sort().map(d => metrics.x402.revenueByDay[d]), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3 }]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#9ca3af' } } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } } } }
    });

    // Round Chart
    new Chart(document.getElementById('roundChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(metrics.lottery.revenueByRound).map(r => 'Round ' + r),
        datasets: [{ label: 'Protocol Fee (HBAR)', data: Object.values(metrics.lottery.revenueByRound).map(v => v.feeHBAR), backgroundColor: 'rgba(139,92,246,0.7)' }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } } } }
    });

    // Lottery Day Chart
    new Chart(document.getElementById('lotteryDayChart'), {
      type: 'line',
      data: {
        labels: Object.keys(metrics.lottery.revenueByDay).sort(),
        datasets: [{ label: 'Daily Fee (HBAR)', data: Object.keys(metrics.lottery.revenueByDay).sort().map(d => metrics.lottery.revenueByDay[d]), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3 }]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#9ca3af' } } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#374151' } } } }
    });

    // Populate tables
    const x402Body = document.getElementById('x402TableBody');
    x402Records.forEach(r => {
      x402Body.innerHTML += \`<tr class="border-b border-gray-800 hover:bg-gray-800">
        <td class="py-2">\${fmtDate(r.timestamp)}</td>
        <td class="py-2 font-mono text-xs">\${r.endpoint}</td>
        <td class="py-2 font-mono text-xs">\${r.payer.slice(0,10)}...</td>
        <td class="py-2 text-green-400">\${(parseInt(r.amount)/1_000_000).toFixed(6)}</td>
        <td class="py-2">\${linkHash(r.txHash, r.network.split(':')[1])}</td>
      </tr>\`;
    });

    const lotteryBody = document.getElementById('lotteryTableBody');
    lotteryRecords.forEach(r => {
      lotteryBody.innerHTML += \`<tr class="border-b border-gray-800 hover:bg-gray-800">
        <td class="py-2">\${fmtDate(r.timestamp)}</td>
        <td class="py-2">#\${r.roundId}</td>
        <td class="py-2">\${r.ticketsSold}</td>
        <td class="py-2 text-green-400">\${(r.protocolFeeTinybars/100_000_000).toFixed(8)}</td>
        <td class="py-2">\${linkHash(r.txHash)}</td>
      </tr>\`;
    });

    // Recent combined
    const allEvents = [
      ...x402Records.map(r => ({ ...r, source: 'x402', revenue: parseInt(r.amount)/1_000_000, unit: 'USDC', detail: r.endpoint })),
      ...lotteryRecords.map(r => ({ ...r, source: 'lottery', revenue: r.protocolFeeTinybars/100_000_000, unit: 'HBAR', detail: 'Round #' + r.roundId + ' • ' + r.ticketsSold + ' tickets' }))
    ].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30);

    const recentBody = document.getElementById('recentTableBody');
    allEvents.forEach(r => {
      recentBody.innerHTML += \`<tr class="border-b border-gray-800 hover:bg-gray-800">
        <td class="py-2">\${fmtDate(r.timestamp)}</td>
        <td class="py-2">\${r.source === 'x402' ? '<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">x402</span>' : '<span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Lottery</span>'}</td>
        <td class="py-2 text-sm">\${r.detail}</td>
        <td class="py-2 text-green-400">\${r.revenue.toFixed(r.unit === 'USDC' ? 6 : 8)} \${r.unit}</td>
        <td class="py-2">\${linkHash(r.txHash)}</td>
      </tr>\`;
    });
  </script>
</body>
</html>
  `);
});

// Start server
const port = parseInt(process.env.DASHBOARD_PORT || "3002", 10);

await loadRevenueData();

console.log(`📊 Revenue Dashboard starting on port ${port}`);
console.log(`   Dashboard UI: http://localhost:${port}/dashboard`);
console.log(`   Metrics API:  http://localhost:${port}/api/dashboard/metrics`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });