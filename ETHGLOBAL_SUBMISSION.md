# ETHGlobal Hedera Prize Submission

## Project: Hedera x402 Micropayments API

**Prize Category**: Hedera - AI & Agentic Payments on Hedera ($6,000 total, up to 3 teams × $2,000)

---

## 🎯 **Prize Criteria Met**

| Requirement | How We Meet It |
|-------------|----------------|
| **Real x402-gated service on Hedera** | ✅ 7 production endpoints on Hedera Mainnet with Coinbase facilitator |
| **Build the platform that consumes it** | ✅ Revenue dashboard, landing page, testnet facilitator, test clients |
| **Agent discovers & pays without API key/subscription** | ✅ x402 protocol - agents pay per request via USDC/HBAR |
| **Pay-per-call / metered data / agent marketplace** | ✅ 7 endpoints with tiered pricing ($0.001-$0.02) |
| **Micropayment streaming** | ✅ Per-request settlement, 3s finality |

---

## 🚀 **Live Deployment (Mainnet)**

| Service | URL | Status |
|---------|-----|--------|
| **x402 API (7 endpoints)** | `https://hedera-micropayments-api.mobicobe.workers.dev` | ✅ Live |
| **Revenue Dashboard** | `https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard` | ✅ Live |
| **Landing Page / Docs** | `https://hedera-x402-landing.mobicobe.workers.dev` | ✅ Live |
| **Testnet Facilitator** | `https://hedera-testnet-facilitator.mobicobe.workers.dev` | ✅ Live |

---

## 📡 **7 x402 Endpoints (Mainnet, USDC, Coinbase Facilitator)**

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/v1/token/balances?accountId=` | $0.001 | Token balances + HBAR balance |
| `GET /api/v1/token/analytics/:tokenId` | $0.005 | Holders, velocity, top 10, 24h stats |
| `GET /api/v1/compliance/screen/:accountId` | $0.02 | KYC/AML flags, risk score, account age |
| `GET /api/v1/nft/metadata/:tokenId/:serial` | $0.005 | NFT metadata, owner, creation timestamp |
| `GET /api/v1/transactions/history/:accountId` | $0.001 | Last 100 transactions with details |
| `GET /api/v1/token/price/:tokenId` | $0.001 | Price estimate + 24h volume |
| `GET /api/v1/defi/positions/:accountId` | $0.02 | DeFi LP positions & yields |

**Facilitator**: Coinbase (`https://x402.org/facilitator`, account `0.0.9185802`)

**Revenue Address**: `0.0.4606490` (EVM: `0x464a1a`)

---

## 🏗 **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                      AGENT / CLIENT                          │
│  • hedera-x402 SDK / x402axios / any x402 client            │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP 402 + X-PAYMENT
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              HEDERA X402 API (Cloudflare Workers)           │
│  • 7 x402-gated endpoints                                   │
│  • Mirror Node queries (token balances, analytics, etc.)    │
│  • Rate limiting (100 req/day per IP)                       │
│  • CORS enabled for browser/agent access                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ x402 verification
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              FACILITATOR (Coinbase / Custom)                │
│  • Verifies payment signatures                              │
│  • Submits transactions to Hedera (pays gas)                │
│  • Returns settlement proof                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ Hedera Consensus (3s finality)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    HEDERA MAINNET                            │
│  • USDC (0.0.456858) payments                               │
│  • Revenue to 0.0.4606490 (EVM: 0x464a1a)                   │
│  • $0.0001 fees, 10,000 TPS, 3s finality                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 **Revenue Tracking**

- **Dashboard**: `https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard`
- **Webhooks**: Real-time settlement tracking
- **Metrics**: Per-endpoint revenue, unique payers, daily charts
- **Combined**: x402 API + MicroLottery protocol fees

---

## 🧪 **Test Results**

| Test | Result |
|------|--------|
| Discovery endpoint (`/.well-known/x402.json`) | ✅ Returns all 7 endpoints with correct pricing |
| 402 Payment Required responses | ✅ Proper format with facilitator info |
| Payment verification (testnet facilitator) | ✅ Works (testnet reliability varies) |
| Revenue dashboard webhooks | ✅ Real-time tracking |
| Mainnet deployment | ✅ Live with Coinbase facilitator |

---

## 📦 **Repository Structure**

```
├── src/
│   ├── x402-manual.ts          # Main x402 API (7 endpoints)
│   ├── dashboard-worker.ts     # Revenue dashboard (KV + webhooks)
│   ├── landing.ts              # Landing page with docs
│   ├── testnet-facilitator.ts  # Custom testnet facilitator
│   ├── config/x402.ts          # Config loader (auto-detects network)
│   └── ...
├── wrangler.toml               # Main API deployment
├── wrangler-dashboard.toml     # Dashboard deployment
├── wrangler-landing.toml       # Landing page deployment
├── wrangler-facilitator.toml   # Testnet facilitator deployment
└── package.json                # Dependencies
```

---

## 🎬 **Demo Video Script (3 min)**

1. **Intro (30s)**: Show landing page, explain x402 + Hedera
2. **Discovery (30s)**: `curl /.well-known/x402.json` → shows 7 endpoints
3. **Payment Flow (60s)**: 
   - Show 402 response
   - Run `hedera-x402` client payment
   - Show successful data return
4. **Dashboard (30s)**: Open revenue dashboard, show real-time metrics
4. **Architecture (30s)**: Diagram walkthrough

---

## ✅ **Submission Checklist**

- [ ] GitHub repo created and pushed
- [ ] README.md with setup instructions
- [ ] Live demo URLs documented
- [ ] Demo video recorded (≤3 min)
- [ ] ETHGlobal submission form filled
- [ ] Prize criteria explicitly addressed

---

## 🔗 **Quick Start for Judges**

```bash
# 1. Install client
npm install -g hedera-x402

# 2. Test with your mainnet account (needs USDC)
hedera-x402 get "https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.4606490" \
  --account-id 0.0.YOUR_ACCOUNT_ID \
  --private-key YOUR_PRIVATE_KEY

# 3. View dashboard
open https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard

# 4. Read docs
open https://hedera-x402-landing.mobicobe.workers.dev
```

---

## 💡 **Why This Wins**

1. **Complete x402 implementation** - Not a toy, 7 real endpoints
2. **Production on Mainnet** - Coinbase facilitator, real USDC
3. **Revenue-generating** - Dashboard proves monetization
4. **Agent-ready** - No API keys, pure x402 protocol
5. **Hedera-native** - USDC, Mirror Nodes, 3s finality, $0.0001 fees
5. **Extensible** - Easy to add SaucerSwap, HeliSwap, Bonzo endpoints