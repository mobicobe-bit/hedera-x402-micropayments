# Hedera Foundation Grant Application
## Project: Crypto Micropayments Starter — x402 API + MicroLottery on Hedera

**Applicant:** mobicobe-bit (GitHub) / mobicobe@gmail.com  
**Repository:** https://github.com/mobicobe-bit/hedera-x402-micropayments  
**Live Testnet Demo:** API: https://api.mobicobe.com | Dashboard: https://dashboard.mobicobe.com  
**Testnet Contract:** `0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB` (Hedera PRNG 0x16F)  
**Grant Track:** Credit Market Development  
**Total Request:** 10,000,000 HBAR across 4 phases  

---

## Executive Summary

This project combines **two distinct Hedera use cases** into a single, production-ready, open-source system that drives network utilization and demonstrates unique Hedera capabilities:

1. **x402 Micropayments API** — 7 priced endpoints ($0.001–$0.02/call) enabling agent-to-agent payments via the x402 protocol on Hedera Token Service (HTS)
2. **MicroLottery Smart Contract** — Hedera PRNG-based lottery (System Contract 0x16F) with product prizes and 2.5% protocol fee

Both components are **live on Hedera testnet** with custom domains, real revenue tracking, and comprehensive documentation. The project is ready for mainnet deployment and ecosystem scaling.

---

## Problem Statement

### For Micropayments
- **Agent-to-agent payments** lack a standard: AI agents cannot autonomously pay for API calls without human intervention
- **High friction onboarding**: Traditional API keys require KYC, billing setup, credit cards
- **No pay-per-use model**: Existing APIs use subscriptions, not granular per-request pricing

### For Lotteries
- **Cash-based lotteries** face regulatory barriers globally
- **Opaque randomness**: Most on-chain lotteries use VRFs or commit-reveal, not native protocol randomness
- **No utility**: Traditional lotteries don't demonstrate blockchain-specific capabilities

---

## Solution & Hedera Alignment

### x402 Micropayments API (7 Endpoints)
| Endpoint | Price | Use Case |
|----------|-------|----------|
| `GET /api/v1/token/balances` | $0.001 | Query HBAR + token balances |
| `GET /api/v1/token/analytics/:tokenId` | $0.005 | Holder distribution, velocity, top holders |
| `GET /api/v1/compliance/screen/:accountId` | $0.02 | KYC/AML screening via HCS |
| `GET /api/v1/nft/metadata/:tokenId/:serial` | $0.005 | NFT ownership + metadata |
| `GET /api/v1/transactions/history/:accountId` | $0.001 | Transaction history |
| `GET /api/v1/token/price/:tokenId` | $0.001 | USD price oracle |
| `GET /api/v1/defi/positions/:accountId` | $0.02 | DeFi positions + yields |

**Hedera Features Used:**
- **HTS (Hedera Token Service)**: Accepts USDC (0.0.429274 testnet / 0.0.456858 mainnet) via custom fees
- **Mirror Node**: Real-time ledger data via REST API
- **x402 Protocol**: HTTP 402 Payment Required standard for agent-friendly payments

### MicroLottery Smart Contract
- **Verifiable Randomness**: Uses Hedera native PRNG System Contract `0x16F` (unique to Hedera)
- **Product Prizes**: Not cash — avoids gambling regulations (iPhone, headphones, SSDs, etc.)
- **2.5% Protocol Fee**: Auto-forwarded to treasury on every ticket purchase
- **Weekly Automation**: Cloudflare Workers cron creates rounds, PRNG draws winners

**Hedera Features Used:**
- **Native PRNG (0x16F)**: Protocol-level verifiable randomness — no VRF/oracle needed
- **EVM Compatibility**: Contract written in Solidity, deployed to Hedera EVM
- **Low Fees**: ~$0.001 per transaction

### Revenue Dashboard
- **Real-time tracking**: x402 USDC revenue + lottery HBAR fees
- **Combined USD metrics**: USDC 1:1, HBAR × $0.05
- **Per-endpoint / per-round / per-day breakdowns**
- **Live at**: https://dashboard.mobicobe.com

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS / AGENTS                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│   x402 API Calls    │             │  Lottery Tickets    │
│  7 endpoints        │             │  buyTicket()        │
│  $0.001-$0.02/call  │             │  2.5% protocol fee  │
└──────────┬──────────┘             └──────────┬──────────┘
           │                                   │
           ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│ x402 Middleware     │             │ Smart Contract      │
│ - Validates payment │             │ - Forwards 2.5% to  │
│ - Sends webhook     │             │   protocolFeeReceiver│
└──────────┬──────────┘             └──────────┬──────────┘
           │                                   │
           ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REVENUE DASHBOARD (KV Store)                 │
│  • Tracks x402 revenue by endpoint / day / payer               │
│  • Tracks lottery fees by round / day                          │
│  • Combined USD revenue (USDC 1:1, HBAR × $0.05)              │
│  • Live at https://dashboard.mobicobe.com                      │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Cloudflare Workers** — Edge compute, custom domains, KV storage
- **Hedera SDK / Ethers.js** — Contract interaction
- **x402 Protocol** — `@x402/hedera`, `@x402/express`, `@x402/core`
- **Hedera Agent Kit v4** — 44 built-in tools, LangChain toolkit, MCP server
- **Solidity / Hardhat** — MicroLottery contract

---

## Milestones & Deliverables

| Phase | Milestone | Deliverable | Timeline | HBAR Payment |
|-------|-----------|-------------|----------|--------------|
| **Phase 1** | **PoC Validation** (Complete) | Working testnet deployment, all scripts functional, dashboard UI, x402 discovery endpoint, Agent Kit v4 integration | **Done** | 2,000,000 HBAR |
| **Phase 2** | **Mainnet Deployment** | MicroLottery deployed to mainnet, x402 API on mainnet, documentation complete, contract verified on HashScan | Month 1 | 3,000,000 HBAR |
| **Phase 3** | **Ecosystem Growth** | Mainnet launch, developer docs, SDK updates, x402.org directory listing, RapidAPI publication, community outreach | Months 2–3 | 3,000,000 HBAR |
| **Phase 4** | **Sustainability** | Grant reporting, sequential funding application, Year 2 roadmap, multi-tenant SaaS preparation | Month 4+ | 2,000,000 HBAR |

**Total Request: 10,000,000 HBAR** (~$250,000 at $0.025/HBAR)

---

## Budget Justification

| Category | HBAR Amount | Justification |
|----------|-------------|---------------|
| Testnet deployment & community testing | 2,000,000 | Gas fees, contract deployment, community testing, bug bounties |
| Mainnet deployment & auditing | 3,000,000 | Mainnet transaction fees, smart contract audit, HashScan verification |
| Developer tools & documentation | 2,000,000 | Documentation, SDK updates, developer experience improvements |
| Ecosystem growth & marketing | 2,000,000 | Community events, hackathons, outreach, directory submissions |
| Contingency | 1,000,000 | Unforeseen expenses, additional testing, regulatory compliance |

---

## Unique Value Proposition

### 1. **Dual Hedera Use Cases in One Project**
Combines x402 micropayments + MicroLottery = dual revenue streams, dual developer onboarding paths.

### 2. **Unique Hedera Features Demonstrated**
- **Native PRNG (0x16F)**: Verifiable randomness at protocol level — no other L1/L2 has this
- **HTS Custom Fees**: x402 payments via protocol-layer token fees — no smart contract needed for fee collection
- **Low Predictable Fees**: $0.001–$0.02 per API call, $0.001 per tx

### 3. **Production-Ready, Not Prototype**
- Live on testnet with custom domains (`api.mobicobe.com`, `dashboard.mobicobe.com`)
- x402 discovery endpoint compliant (`/.well-known/x402.json`)
- Revenue dashboard with real transaction data
- Automated weekly lottery cron

### 4. **Agent-First Design**
- x402 protocol enables AI agents to pay autonomously
- Hedera Agent Kit v4 integration (44 tools + MCP server)
- Listed on x402.org discovery index (Issue #77)

### 4. **Transparent Revenue Tracking**
- Real-time dashboard with on-chain verification links
- Novel approach for grant accountability

### 5. **Open Source & Community-First**
- MIT licensed, full source on GitHub
- Complete scripts: deploy, create-round, buy-ticket, draw-winner
- Comprehensive docs: API reference, audit checklist, mainnet deployment guide

---

## Roadmap Beyond Grant

| Year | Focus |
|------|-------|
| **Year 1** | Mainnet launch, directory listings, developer SDK, first 1,000 API consumers |
| **Year 2** | Multi-tenant SaaS, white-label licensing, enterprise features, $10K MRR target |
| **Year 3** | Cross-chain x402 (Base, Solana), protocol fee governance, ecosystem fund |

---

## Team

**Solo Developer** — mobicobe-bit  
- Full-stack Web3 development (Cloudflare Workers, Hedera, Solidity)
- Built and deployed complete system solo
- Active in Hedera ecosystem (testnet, Discord, documentation)

**Advisors/Community:**
- Hedera Discord community for technical review
- x402.org maintainers for protocol alignment
- HashPack/Blade wallet teams for wallet integration

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Mainnet deployment delays | Testnet fully validated; rollback plan documented |
| Regulatory (lottery) | Product prizes, not cash; 2.5% protocol fee not "house take" |
| x402 facilitator on testnet | Documented limitation; mainnet facilitator works |
| Smart contract bugs | Audit checklist completed; reentrancy guards; testnet battle-tested |
| Low adoption | Directory submissions (x402.org, RapidAPI, HashPack), developer outreach |

---

## Success Metrics

| Metric | Phase 1 Target | Phase 3 Target |
|--------|----------------|----------------|
| x402 API calls/month | 1,000 | 100,000 |
| Lottery rounds completed | 10 | 50 |
| Unique API consumers | 50 | 1,000 |
| Revenue dashboard active users | 100 | 5,000 |
| Directory listings | 2 (x402.org, RapidAPI) | 5+ |
| GitHub stars | 50 | 500 |

---

## Submission Links

| Asset | URL |
|-------|-----|
| GitHub Repository | https://github.com/mobicobe-bit/hedera-x402-micropayments |
| Live API (Testnet) | https://api.mobicobe.com |
| Live Dashboard | https://dashboard.mobicobe.com |
| x402 Discovery | https://api.mobicobe.com/.well-known/x402.json |
| x402.org Directory Submission | https://github.com/x402-index/x402-discovery-index/issues/77 |
| Feedback Issue (Agent Kit) | https://github.com/hashgraph/hedera-agent-kit-js/issues/1160 |
| Testnet Contract | https://hashscan.io/testnet/contract/0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB |
| Mainnet Deployment Guide | `/docs/MAINNET_DEPLOYMENT.md` |
| Smart Contract Audit | `/docs/SMART_CONTRACT_AUDIT.md` |
| API Reference | `/docs/API_REFERENCE.md` |

---

## Contact

**Primary:** mobicobe@gmail.com  
**GitHub:** https://github.com/mobicobe-bit  
**Discord:** mobicobe-bit#xxxx (Hedera Developer Discord)

---

*Application prepared for Hedera Foundation Credit Market Development Grant Track.  
All code open source (MIT). Testnet live and verified. Ready for mainnet deployment upon grant approval.*