import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

// Landing page
app.get("/", (c) => c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hedera x402 Micropayments API</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Inter', sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.3); }
  </style>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">
  <!-- Navigation -->
  <nav class="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span class="text-xl font-bold">Crypto x402 API</span>
      </div>
      <div class="hidden md:flex items-center gap-6">
        <a href="#endpoints" class="text-gray-400 hover:text-white transition">Endpoints</a>
        <a href="#pricing" class="text-gray-400 hover:text-white transition">Pricing</a>
        <a href="#docs" class="text-gray-400 hover:text-white transition">Docs</a>
        <a href="https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard" target="_blank" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition">Dashboard</a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="gradient-bg pt-32 pb-20 px-6">
    <div class="max-w-7xl mx-auto text-center">
      <div class="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Live on Hedera Mainnet • Coinbase Facilitator
      </div>
      <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        Pay-Per-Request<br>
        <span class="text-blue-400">Hedera Data APIs</span>
      </h1>
      <p class="text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
        Monetize your data with HTTP 402 payments. Agents pay per request using USDC on Hedera — no API keys, no subscriptions, just micropayments.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="#endpoints" class="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold text-lg transition shadow-lg shadow-blue-600/25">
          View Endpoints
        </a>
        <a href="https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard" target="_blank" class="border border-gray-700 hover:border-gray-600 px-8 py-3 rounded-lg font-semibold text-lg transition">
          Live Dashboard
        </a>
      </div>
      
      <!-- Stats Bar -->
      <div class="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div class="text-3xl font-bold text-blue-400">7</div>
          <div class="text-gray-400 mt-1">API Endpoints</div>
        </div>
        <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div class="text-3xl font-bold text-green-400">$0.001</div>
          <div class="text-gray-400 mt-1">Starting Price</div>
        </div>
        <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div class="text-3xl font-bold text-purple-400">3s</div>
          <div class="text-gray-400 mt-1">Finality</div>
        </div>
        <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div class="text-3xl font-bold text-orange-400">$0.0001</div>
          <div class="text-gray-400 mt-1">Network Fee</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Endpoints Section -->
  <section id="endpoints" class="py-20 px-6 bg-gray-900">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Available Endpoints</h2>
        <p class="text-gray-400 text-lg max-w-2xl mx-auto">7 specialized endpoints for token data, NFTs, transactions, compliance, and DeFi</p>
      </div>
      
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Endpoint cards will be rendered by JS -->
        <div id="endpoints-grid" class="contents"></div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="py-20 px-6 bg-gray-950">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
        <p class="text-gray-400 text-lg max-w-2xl mx-auto">Pay only for what you use. No monthly fees, no rate limits, no commitments.</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 card-hover">
          <div class="flex items-center gap-2 mb-4">
            <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Basic</span>
          </div>
          <h3 class="text-xl font-bold mb-2">$0.001 / call</h3>
          <p class="text-gray-400 mb-6">High-volume, low-cost data</p>
          <ul class="space-y-2 text-gray-300">
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-green-400">✓</span> Token Balances</li>
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-green-400">✓</span> Transaction History</li>
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-green-400">✓</span> Token Price</li>
          </ul>
        </div>
        
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 card-hover relative">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">Most Popular</div>
          <div class="flex items-center gap-2 mb-4">
            <span class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">Standard</span>
          </div>
          <h3 class="text-xl font-bold mb-2">$0.005 / call</h3>
          <p class="text-gray-400 mb-6">Rich analytics & metadata</p>
          <ul class="space-y-2 text-gray-300">
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-blue-400">✓</span> Token Analytics</li>
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-blue-400">✓</span> NFT Metadata</li>
          </ul>
        </div>
        
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 card-hover">
          <div class="flex items-center gap-2 mb-4">
            <span class="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">Premium</span>
          </div>
          <h3 class="text-xl font-bold mb-2">$0.02 / call</h3>
          <p class="text-gray-400 mb-6">High-value intelligence</p>
          <ul class="space-y-2 text-gray-300">
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-purple-400">✓</span> Compliance Screening</li>
            <li class="flex items-center gap-2"><span class="w-5 h-5 text-purple-400">✓</span> DeFi Positions</li>
          </ul>
        </div>
      </div>
      
      <div class="mt-12 text-center">
        <p class="text-gray-500">All prices in USDC on Hedera Mainnet • Network fees paid by facilitator</p>
      </div>
    </div>
  </section>

  <!-- How It Works -->
  <section id="how-it-works" class="py-20 px-6 bg-gray-900">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">How It Works</h2>
        <p class="text-gray-400 text-lg max-w-2xl mx-auto">Built on the x402 protocol — the open standard for machine-to-machine payments</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center p-6">
          <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">1</span>
          </div>
          <h3 class="text-xl font-bold mb-2">Agent Requests</h3>
          <p class="text-gray-400">AI agent calls your API endpoint</p>
        </div>
        <div class="text-center p-6">
          <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">2</span>
          </div>
          <h3 class="text-xl font-bold mb-2">402 Response</h3>
          <p class="text-gray-400">API returns payment requirements</p>
        </div>
        <div class="text-center p-6">
          <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">3</span>
          </div>
          <h3 class="text-xl font-bold mb-2">Auto Payment</h3>
          <p class="text-gray-400">Agent pays USDC via Coinbase facilitator</p>
        </div>
        <div class="text-center p-6">
          <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">4</span>
          </div>
          <h3 class="text-xl font-bold mb-2">Data Delivered</h3>
          <p class="text-gray-400">API returns requested data instantly</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Docs Section -->
  <section id="docs" class="py-20 px-6 bg-gray-950">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Developer Quickstart</h2>
        <p class="text-gray-400 text-lg max-w-2xl mx-auto">Integrate in minutes with any x402-compatible client</p>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            JavaScript / TypeScript
          </h3>
          <pre class="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300"><code>import { x402axios } from "hedera-x402";

const response = await x402axios.get(
  "https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.4606490",
  {
    privateKey: process.env.HEDERA_PRIVATE_KEY,
    accountId: "0.0.YOUR_ACCOUNT_ID",
  }
);
console.log(response.data);</code></pre>
        </div>
        
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            cURL (see 402 flow)
          </h3>
          <pre class="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300"><code># 1. Request (returns 402)
curl https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.4606490

# 2. Pay with x402 client, then retry with X-PAYMENT header
curl -H "X-PAYMENT: <base64_tx>" \\
  https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.4606490</code></pre>
        </div>
        
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 md:col-span-2">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Discovery Endpoint
          </h3>
          <pre class="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300"><code># Discover all endpoints, prices, and facilitators
curl https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json</code></pre>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-6 bg-gray-900 border-t border-gray-800">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span class="text-xl font-bold">Crypto x402 API</span>
          </div>
          <p class="text-gray-400 text-sm">Pay-per-request data APIs on Hedera via x402 protocol</p>
        </div>
        <div>
          <h4 class="font-bold mb-4">Endpoints</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><a href="#endpoints" class="hover:text-white transition">Token Balances</a></li>
            <li><a href="#endpoints" class="hover:text-white transition">Token Analytics</a></li>
            <li><a href="#endpoints" class="hover:text-white transition">Compliance Screening</a></li>
            <li><a href="#endpoints" class="hover:text-white transition">NFT Metadata</a></li>
            <li><a href="#endpoints" class="hover:text-white transition">Transaction History</a></li>
            <li><a href="#endpoints" class="hover:text-white transition">Token Price</a></li>
            <li><a href="#endpoints" class="hover:text-white transition">DeFi Positions</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-4">Resources</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><a href="https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard" target="_blank" class="hover:text-white transition">Revenue Dashboard</a></li>
            <li><a href="https://x402.org" target="_blank" class="hover:text-white transition">x402 Protocol</a></li>
            <li><a href="https://hedera.com" target="_blank" class="hover:text-white transition">Hedera Network</a></li>
            <li><a href="https://github.com/coinbase/x402" target="_blank" class="hover:text-white transition">x402 Spec</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-4">Network</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li>Hedera Mainnet</li>
            <li>USDC (0.0.456858)</li>
            <li>Coinbase Facilitator</li>
            <li>3s Finality</li>
            <li>$0.0001 Fees</li>
          </ul>
        </div>
      </div>
      <div class="pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        Built on Hedera • Powered by x402 • Coinbase Facilitator
      </div>
    </div>
  </footer>
</body>
</html>`));

export default { fetch: (request: Request, env: any, ctx: any) => app.fetch(request, env, ctx) };