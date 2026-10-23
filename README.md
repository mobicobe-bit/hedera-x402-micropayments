# Crypto Micropayments Starter

**Hedera x402 Micropayments API + MicroLottery Protocol Fees**

![Testnet](https://img.shields.io/badge/Testnet-Live-10b981)
![Mainnet](https://img.shields.io/badge/Mainnet-Ready%20to%20Deploy-f59e0b)
![x402](https://img.shields.io/badge/x402-Protocol-3b82f6)
![Hedera](https://img.shields.io/badge/Hedera-Network-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-6366f1)

A complete system for automated Web3 monetization:
- **x402 API** — 7 priced endpoints ($0.001–$0.02/call) accepting USDC on Hedera
- **MicroLottery** — Hedera PRNG-based lottery with product prizes, 2.5% protocol fee
- **Revenue Dashboard** — Real-time tracking of x402 earnings + lottery fees
- **Weekly Cron** — Automated lottery rounds via Cloudflare Workers

---

## 🌐 Live Deployments

| Environment | API | Dashboard | Network |
|-------------|-----|-----------|---------|
| **Testnet** | [api.mobicobe.com](https://api.mobicobe.com) | [dashboard.mobicobe.com](https://dashboard.mobicobe.com) | Hedera Testnet |
| **Mainnet** | *Ready to deploy* | *Ready to deploy* | Hedera Mainnet |

**Workers.dev aliases (also work):**
- API: `https://hedera-micropayments-api.mobicobe.workers.dev`
- Dashboard: `https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard`

---

## 📁 Project Structure

```
crypto-micropayments-starter/
├── src/
│   ├── config/x402.ts           # x402 configuration (auto testnet/mainnet)
│   ├── routes/paid.ts           # 7 priced API endpoints
│   ├── worker-entry.ts          # Cloudflare Worker entry (API)
│   ├── dashboard-worker.ts      # Cloudflare Worker (Dashboard + KV)
│   ├── dashboard.ts             # Dashboard UI (Tailwind + Chart.js)
│   ├── hedera.ts                # Hedera client helpers
│   ├── lottery-cron.ts          # Weekly lottery cron (Cloudflare)
│   └── agent/                   # Hedera Agent Kit integration
│       ├── hedera-x402-agent.ts # LangChain agent for x402 + Lottery
│       ├── mcp-server.ts        # MCP server (13 tools)
│       └── demo.ts              # Agent demo CLI
├── lottery-contract/
│   ├── contracts/MicroLottery.sol    # Solidity contract (Hedera PRNG 0x16F)
│   ├── scripts/deploy.js             # Deploy to testnet/mainnet
│   ├── scripts/create-round.js       # Create lottery round
│   ├── scripts/buy-ticket.js         # Buy tickets
│   ├── scripts/draw-winner.js        # Request randomness + draw
│   └── deployment-hederaTestnet.json # Testnet deployment record
├── docs/
│   ├── MAINNET_DEPLOYMENT.md    # Mainnet deployment guide
│   ├── API_REFERENCE.md         # Full endpoint specs
│   └── SMART_CONTRACT_AUDIT.md  # Audit checklist
├── wrangler.toml                # API worker config
├── wrangler-dashboard.toml      # Dashboard worker config (KV)
├── wrangler-lottery-cron.toml   # Weekly lottery cron config
└── package.json
```

---

## 🤖 Hedera Agent Kit Integration (Week 3 Bounty)

This project includes a **Hedera Agent Kit v4** integration for the [Hedera AI Agent Bounty](https://ai-bounties.hedera.com/) **Week 3: MCP or x402 Agent**.

### Features
- **Core Dependency**: `@hashgraph/hedera-agent-kit` (v4.1.1) — 44 built-in Hedera tools
- **LangChain Toolkit**: `@hashgraph/hedera-agent-kit-langchain` (v2.0.1) — `HederaLangchainToolkit`
- **MCP Server**: `@hashgraph/hedera-agent-kit-mcp` (v1.1.1) — `HederaMCPToolkit`
- **x402 API Integration**: 7 monetized endpoints ($0.001–$0.02/call)
- **MicroLottery Contract**: Hedera PRNG (0x16F) for verifiable randomness

### Agent Demo
```bash
# Run agent demo (shows all 44 Agent Kit tools + x402 endpoints)
OPERATOR_ID=0.0.XXXXXX OPERATOR_KEY=302e020100... npm run demo:agent
```

### MCP Server
```bash
# Run MCP server (exposes 13 tools via stdio)
OPERATOR_ID=0.0.XXXXXX OPERATOR_KEY=302e020100... npm run agent:mcp
```

**Available MCP Tools:**
- `x402_discover_endpoints` — Discover all x402 endpoints with pricing
- `x402_get_token_balances` — Query token balances (requires $0.001 USDC)
- `x402_get_token_analytics` — Token analytics (requires $0.005 USDC)
- `x402_screen_compliance` — Compliance screening (requires $0.02 USDC)
- `lottery_create_round` — Create MicroLottery round
- `lottery_buy_tickets` — Buy lottery tickets
- `lottery_draw_winner` — Draw winner using Hedera PRNG (0x16F)
- `lottery_get_round_info` — Get round information
- `hedera_get_balance` — Get HBAR/token balances
- `hedera_transfer_hbar` — Transfer HBAR
- `hedera_create_token` — Create HTS token

### Bounty Submission Checklist
- ✅ Public GitHub repo: https://github.com/mobicobe-bit/hedera-x402-micropayments
- ✅ Hedera Agent Kit as core dependency (`@hashgraph/hedera-agent-kit`)
- ✅ Live demo: https://hedera-micropayments-api.mobicobe.workers.dev
- ✅ x402 protocol implementation (7 endpoints)
- ✅ MicroLottery with Hedera PRNG (0x16F)
- ✅ MCP server using `@hashgraph/hedera-agent-kit-mcp`
- ✅ LangChain integration using `@hashgraph/hedera-agent-kit-langchain`
- ✅ Commit history during campaign period
- ⏳ Feedback submission to hedera-agent-kit-js repo (required)

### Bounty Requirements Met
| Requirement | Status |
|-------------|--------|
| Use Hedera Agent Kit (JS/Python) | ✅ `@hashgraph/hedera-agent-kit` v4.1.1 |
| Public GitHub repo | ✅ https://github.com/mobicobe-bit/hedera-x402-micropayments |
| Live hosted demo | ✅ Cloudflare Workers testnet |
| Feedback on Agent Kit repo | ⏳ Required before submission |
| Week 3: MCP or x402 Agent | ✅ Both MCP and x402 implemented |

---

## 📈 Traffic & Growth (Automated)

### Directory Submissions (One-Time)
| Directory | Status | Traffic |
|-----------|--------|---------|
| [x402.org](https://x402.org/submit) | *Needs custom domain* | AI agents (auto-pay) |
| [RapidAPI](https://rapidapi.com/provider) | ✅ Published | Developers |
| [HashPack dApps](https://hashpack.app/dapps/submit) | ✅ Submitted | Wallet users |
| [APILayer](https://apilayer.com/marketplace/submit) | Pending | Enterprise |

### Automated Recurring
- **Weekly Lottery Cron** → New round every Sunday 12:00 UTC
- **AI Agent Discovery** → x402.org + RapidAPI = automatic agent traffic
- **SEO** → GitHub README + live demo URLs

### Manual Amplification (Optional)
```bash
# Tweet template
"🎰 First x402-native API on Hedera: 7 endpoints, $0.001-$0.02/call
MicroLottery with 2.5% protocol fee, Hedera PRNG 0x16F
Revenue dashboard: live metrics
https://hedera-micropayments-api.mobicobe.workers.dev #Hedera #x402 #Web3"
```

---

## 🚀 Quick Start (Testnet)

### 1. Prerequisites
- Node.js 20+
- Cloudflare account + `wrangler` (`npm i -g wrangler`)
- Hedera testnet accounts (Operator + Treasury)

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your testnet credentials
```

Required:
```env
OPERATOR_ID=0.0.XXXXXX        # Operator (pays tx fees)
OPERATOR_KEY=302e020100...    # Operator DER private key
TREASURY_ID=0.0.YYYYYY        # Treasury (collects x402 payments)
TREASURY_KEY=302e020100...    # Treasury DER private key
MIRROR_NODE=https://testnet.mirrornode.hedera.com
JSON_RPC_URL=https://testnet.hashio.io/api
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_PAY_TO_ADDRESS=0.0.YYYYYY
X402_DEFAULT_ASSET=usdc
X402_PRICE_BASIC=1000         # $0.001
X402_PRICE_STANDARD=5000      # $0.005
X402_PRICE_PREMIUM=20000      # $0.02
```

### 3. Install & Build
```bash
npm install
npm run build
```

### 4. Deploy to Cloudflare Workers
```bash
wrangler login                    # or export CLOUDFLARE_API_TOKEN
wrangler deploy                   # API worker
wrangler deploy -c wrangler-dashboard.toml  # Dashboard worker
```

### 5. Set Secrets (one-time)
```bash
# API worker secrets
wrangler secret put OPERATOR_ID <<< "0.0.XXXXXX"
wrangler secret put OPERATOR_KEY <<< "302e020100..."
wrangler secret put TREASURY_ID <<< "0.0.YYYYYY"
wrangler secret put TREASURY_KEY <<< "302e020100..."
wrangler secret put MIRROR_NODE <<< "https://testnet.mirrornode.hedera.com"
wrangler secret put JSON_RPC_URL <<< "https://testnet.hashio.io/api"
wrangler secret put X402_FACILITATOR_URL <<< "https://x402.org/facilitator"
wrangler secret put X402_PAY_TO_ADDRESS <<< "0.0.YYYYYY"
wrangler secret put X402_DEFAULT_ASSET <<< "usdc"
wrangler secret put X402_PRICE_BASIC <<< "1000"
wrangler secret put X402_PRICE_STANDARD <<< "5000"
wrangler secret put X402_PRICE_PREMIUM <<< "20000"
wrangler secret put DASHBOARD_URL <<< "https://hedera-revenue-dashboard.mobicobe.workers.dev"
```

### 6. Deploy Lottery Cron (Weekly Automated Rounds)
```bash
# Set secrets
wrangler secret put ADMIN_PRIVATE_KEY <<< "0x..."      # Your admin wallet private key
wrangler secret put DISCORD_WEBHOOK_URL <<< "https://..."  # Optional: notifications

# Deploy
wrangler deploy -c wrangler-lottery-cron.toml

# Test manually
curl -X POST https://hedera-lottery-cron.mobicobe.workers.dev/trigger
```

---

## 🎰 MicroLottery (Smart Contract)

### Testnet Deployment
```bash
cd lottery-contract
npm install
# Edit .env with PRIVATE_KEY, HEDERA_TESTNET_RPC
npx hardhat run scripts/deploy.js --network hederaTestnet
```

**Testnet Contract**: `0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB`  
**Deployer**: `0xCc7Cc2c2c11e82F175cAc1249038eB338bA099Bd`  
**Protocol Fee**: 2.5% (250 bps) → goes to deployer

### Create Round
```bash
npx hardhat run scripts/create-round.js --network hederaTestnet
```

### Buy Ticket / Draw Winner
```bash
npx hardhat run scripts/buy-ticket.js --network hederaTestnet
npx hardhat run scripts/draw-winner.js --network hederaTestnet
```

### Mainnet Deployment
See [docs/MAINNET_DEPLOYMENT.md](docs/MAINNET_DEPLOYMENT.md) — one-command deploy when funded.

---

## 💰 Revenue Model

| Source | Price | Recipient |
|--------|-------|-----------|
| `/api/v1/token/balances` | $0.001 | Treasury (USDC) |
| `/api/v1/token/analytics/:tokenId` | $0.005 | Treasury (USDC) |
| `/api/v1/compliance/screen/:accountId` | $0.02 | Treasury (USDC) |
| `/api/v1/nft/metadata/:tokenId/:serial` | $0.005 | Treasury (USDC) |
| `/api/v1/transactions/history/:accountId` | $0.001 | Treasury (USDC) |
| `/api/v1/token/price/:tokenId` | $0.001 | Treasury (USDC) |
| `/api/v1/defi/positions/:accountId` | $0.02 | Treasury (USDC) |
| **MicroLottery tickets** | 10 HBAR/ticket (configurable) | 2.5% → Protocol fee receiver |

---

## 📊 Dashboard

Visit: `https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard`

Tracks:
- x402 revenue by endpoint / day / payer
- Lottery protocol fees by round / day
- Combined USD revenue (USDC 1:1, HBAR × $0.05)
- Recent transactions with HashScan links

Webhooks (called by API/lottery scripts):
- `POST /api/dashboard/webhook/x402-settlement`
- `POST /api/dashboard/webhook/lottery-fee`

---

## 🧪 Testing x402 Payment Flow

```bash
# Returns 402 with payment details
curl -i https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.1073622

# With x402 client (auto-pays)
npx ts-node src/demo-purchase.ts
```

---

## 📚 Documentation

- [Mainnet Deployment Guide](docs/MAINNET_DEPLOYMENT.md)
- [API Reference](docs/API_REFERENCE.md)
- [Smart Contract Audit Checklist](docs/SMART_CONTRACT_AUDIT.md)
- [Grant Application Outline](../GRANT_APPLICATION_OUTLINE.md)

---

## 🎁 Grant Application (HBAR Foundation)

**Phase 1 (Complete)**: Testnet PoC — 2M HBAR  
**Phase 2 (This)**: Mainnet prep — 3M HBAR  
**Phase 3**: Ecosystem growth — 3M HBAR  
**Phase 4**: Sustainability — 2M HBAR  

**Total Request**: 10M HBAR (~$250K)

Key differentiators:
- **Hedera native PRNG (0x16F)** — unique verifiable randomness
- **x402 on Hedera** — demonstrates HTS for agent-to-agent micropayments
- **Revenue dashboard** — transparent metrics (novel for grants)
- **MIT open source** — working testnet lowers barrier for others

---

## 🔗 Useful Links

- [x402 Protocol](https://x402.org/)
- [Hedera PRNG System Contract](https://docs.hedera.com/hedera/core-concepts/smart-contracts/system-contracts#prng)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [Hashio JSON-RPC](https://docs.hashio.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

---

## 📝 License

MIT — Free to use, modify, deploy.