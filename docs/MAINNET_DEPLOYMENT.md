# Mainnet Deployment Guide

## Prerequisites

1. **Mainnet HBAR** for deployer account (0x11B253B1755D102c615DA8fC0CAD207E84400E95)
   - Account must exist on Hedera mainnet with ≥ 10 HBAR for deployment + gas
   - Purchase via exchange → HashPack/Blade wallet → transfer to EVM address

2. **HashScan API Key** for contract verification
   - Get from https://hashscan.io → API Keys

3. **Mainnet USDC Association**
   - Treasury account (0.0.1073622) must associate with mainnet USDC (0.0.456858)

---

## Step 1: Deploy MicroLottery Contract

```bash
cd ~/hedera-micropayments-starter/lottery-contract

# Verify .env has mainnet credentials:
# PRIVATE_KEY=0x...
# HEDERA_MAINNET_RPC=https://mainnet.hashio.io/api
# HASHSCAN_API_KEY=your_key

npx hardhat run scripts/deploy.js --network hederaMainnet
```

Expected output:
```
✅ MicroLottery deployed to: 0xCONTRACT_ADDRESS
Transaction hash: 0xTX_HASH
🔍 Verifying contract on HashScan...
✅ Contract verified on HashScan
📄 Deployment info saved to deployment-hederaMainnet.json
```

---

## Step 2: Create First Mainnet Round

Edit `scripts/create-round.js` with real product details:
```javascript
const TICKET_PRICE_HBAR = 10;           // 10 HBAR/ticket
const PRODUCT_NAME = "iPhone 15 Pro";   // Real product
const PRODUCT_DESCRIPTION = "256GB, Natural Titanium, Unlocked";
const PRODUCT_IMAGE_URL = "https://your-cdn.com/iphone15pro.jpg";
const DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days auto-draw
```

Then:
```bash
npx hardhat run scripts/create-round.js --network hederaMainnet
```

---

## Step 3: Update x402 API for Mainnet

Update Cloudflare Worker secrets:

```bash
export CLOUDFLARE_API_TOKEN="your_token"

# Mainnet mirror node
npx wrangler secret put MIRROR_NODE <<< "https://mainnet.mirrornode.hedera.com"

# Mainnet JSON-RPC
npx wrangler secret put JSON_RPC_URL <<< "https://mainnet.hashio.io/api"

# Mainnet USDC (0.0.456858) - auto-detected from mirror node
# No extra secret needed - config auto-switches

# Mainnet treasury (same or new)
npx wrangler secret put TREASURY_ID <<< "0.0.YOUR_MAINNET_TREASURY"
npx wrangler secret put OPERATOR_ID <<< "0.0.YOUR_MAINNET_OPERATOR"
npx wrangler secret put OPERATOR_KEY <<< "YOUR_MAINNET_OPERATOR_KEY"

# Pricing stays same (USDC base units)
# X402_PRICE_BASIC=1000 ($0.001)
# X402_PRICE_STANDARD=5000 ($0.005)
# X402_PRICE_PREMIUM=20000 ($0.02)
```

Redeploy API worker:
```bash
cd ~/hedera-micropayments-starter
npx wrangler deploy
```

---

## Step 4: Deploy Dashboard for Mainnet

```bash
npx wrangler deploy -c wrangler-dashboard.toml
```

Update webhook URL in API worker:
```bash
npx wrangler secret put DASHBOARD_URL <<< "https://hedera-revenue-dashboard.mobicobe.workers.dev"
```

---

## Step 5: Associate Mainnet USDC with Treasury

```bash
cd ~/hedera-micropayments-starter
node src/scripts/associate-token.ts 0.0.456858 0.0.YOUR_MAINNET_TREASURY
```

---

## Step 6: Verify End-to-End

```bash
# Health check
curl https://hedera-micropayments-api.mobicobe.workers.dev/health
# Should show: "network": "hedera:mainnet"

# x402 discovery
curl https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json
# Should show mainnet USDC (0.0.456858), hedera:mainnet

# Test payment flow (returns 402)
curl https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.YOUR_TEST_ACCOUNT
```

---

## Mainnet Addresses Reference

| Asset | Mainnet Address |
|-------|-----------------|
| HBAR | 0.0.0 |
| USDC | 0.0.456858 |
| Mirror Node | https://mainnet.mirrornode.hedera.com |
| JSON-RPC | https://mainnet.hashio.io/api |
| HashScan | https://hashscan.io/mainnet |
| x402 Facilitator | https://x402.org/facilitator |

---

## Cost Estimates (Mainnet)

| Operation | Est. HBAR |
|-----------|-----------|
| Contract deploy | ~2-5 HBAR |
| Create round | ~0.5-1 HBAR |
| Treasury USDC association | ~0.001 HBAR |
| Monthly worker costs | Free tier covers it |

---

## Rollback Plan

If issues arise:
1. Keep testnet workers running on separate subdomains
2. Mainnet deploy to new worker names (e.g., `hedera-micropayments-api-mainnet`)
3. DNS switch after verification

---

## Grant Milestone 2 Deliverables

- [ ] MicroLottery deployed to Hedera mainnet (contract address)
- [ ] First mainnet lottery round created
- [ ] x402 API running on mainnet (7 endpoints)
- [ ] Revenue dashboard tracking mainnet revenue
- [ ] Documentation: API reference, contract audit, deployment scripts
- [ ] GitHub repo public with mainnet addresses in README