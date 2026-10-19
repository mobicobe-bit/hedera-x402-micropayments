# Marketplace Submission Instructions

## 1. Fork the Marketplace Repository

1. Go to: https://github.com/proxies-sx/marketplace
2. Click **Fork** (top right)
3. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/marketplace.git
cd marketplace
```

## 2. Add Your Service

```bash
# Create service directory
mkdir -p services/hedera-micropayments-api

# Copy the manifest
cp /mnt/c/Users/c/hedera-micropayments-starter/marketplace-manifest.json \
   services/hedera-micropayments-api/manifest.json

# Create x402 discovery endpoint (for agent discovery)
mkdir -p services/hedera-micropayments-api/.well-known
cat > services/hedera-micropayments-api/.well-known/x402.json << 'X402EOF'
{
  "x402Version": 2,
  "seller": {
    "name": "Hedera Micropayments API",
    "description": "Pay-per-request Hedera data APIs via x402 on testnet",
    "url": "https://hedera-micropayments-api.mobicobe.workers.dev"
  },
  "endpoints": [
    {
      "path": "/api/v1/token/balances",
      "method": "GET",
      "price": "1000",
      "currency": "USDC",
      "asset": "0.0.429274",
      "network": "hedera:testnet",
      "description": "Query token balances for an account via mirror node",
      "params": {"accountId": "Hedera account ID (e.g., 0.0.123456) - required query param"}
    },
    {
      "path": "/api/v1/token/analytics/:tokenId",
      "method": "GET",
      "price": "5000",
      "currency": "USDC",
      "asset": "0.0.429274",
      "network": "hedera:testnet",
      "description": "Token analytics: holder distribution, velocity, top holders",
      "params": {"tokenId": "Hedera token ID (e.g., 0.0.789012) - path param"}
    },
    {
      "path": "/api/v1/compliance/screen/:accountId",
      "method": "GET",
      "price": "20000",
      "currency": "USDC",
      "asset": "0.0.429274",
      "network": "hedera:testnet",
      "description": "Compliance screening: KYC/AML flags, sanctions check via HCS",
      "params": {"accountId": "Hedera account ID (e.g., 0.0.123456) - path param"}
    }
  ],
  "networks": ["hedera:testnet"],
  "assets": {
    "hbar": {"address": "0.0.0", "decimals": 8, "name": "HBAR"},
    "usdc": {"address": "0.0.429274", "decimals": 6, "name": "USDC (testnet)"}
  },
  "facilitator": "https://x402.org/facilitator"
}
X402EOF
```

## 3. Commit and Push

```bash
git add services/hedera-micropayments-api/
git commit -m "Add Hedera Micropayments API service"
git push origin main
```

## 4. Open Pull Request

1. Go to: https://github.com/proxies-sx/marketplace/pulls
2. Click **New Pull Request**
3. Base: `proxies-sx/marketplace:main` ← Head: `YOUR_USERNAME/marketplace:main`
3. Title: `Add Hedera Micropayments API service`
4. Description:
```
## Hedera Micropayments API

Pay-per-request Hedera data APIs via x402 on testnet. Real mirror node queries for:
- Token balances ($0.001/call)
- Token analytics: holder distribution, velocity, top holders ($0.005/call)  
- Compliance screening: KYC/AML flags, sanctions, risk score ($0.02/call)

Built on Hedera Token Service with protocol-layer custom fees.
Payment: USDC on Hedera testnet (0.0.429274) via x402 facilitator.

Live at: https://hedera-micropayments-api.mobicobe.workers.dev
Discovery: https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json
```
5. Click **Create Pull Request**

## 5. Wait for Review

The Proxies.sx team will review and merge. Once merged, your service appears at:
- https://agents.proxies.sx/marketplace/
- Discoverable by AI agents worldwide via x402 protocol

## Quick Test Before Submitting

```bash
# Test discovery
curl https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json

# Test paid endpoint (returns 402)
curl -i https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.123456

# Test with x402 client (requires testnet USDC)
export TEST_PRIVATE_KEY=0xYOUR_KEY
export TEST_ACCOUNT_ID=0.0.YOUR_ACCOUNT
node /mnt/c/Users/c/hedera-micropayments-starter/test-x402-client.js
```
