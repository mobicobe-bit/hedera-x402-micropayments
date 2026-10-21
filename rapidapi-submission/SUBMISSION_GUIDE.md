# RapidAPI Submission Package for Hedera Micropayments API

## API Information
- **Name**: Hedera Micropayments API
- **Tagline**: x402 micropayments on Hedera - Pay per API call with USDC
- **Category**: Blockchain / Cryptocurrency / Web3
- **Description**: 
  The first x402-native API on Hedera. 7 endpoints for token data, analytics, compliance, NFTs, and DeFi — each call costs $0.001-$0.02 paid automatically via the x402 protocol (HTTP 402). No API keys, no subscriptions, just pay-per-call.

## Base URL
```
https://hedera-micropayments-api.mobicobe.workers.dev
```

## Authentication
**Type**: x402 (Payment Required Protocol)
- No API keys needed
- Client includes `X-PAYMENT` header with signed payment
- Server responds with `402 Payment Required` + payment details if no payment
- Uses Coinbase x402 facilitator on Hedera testnet
- Payment asset: USDC (testnet: 0.0.429274)

## Endpoints Summary

| Endpoint | Method | Price | Tier | Description |
|----------|--------|-------|------|-------------|
| `/.well-known/x402.json` | GET | Free | Discovery | x402 protocol discovery document |
| `/health` | GET | Free | Health | Service status |
| `/api/v1/token/balances` | GET | $0.001 | Basic | All token balances for an account |
| `/api/v1/token/analytics/{tokenId}` | GET | $0.005 | Standard | Token holders, supply, velocity, top holders |
| `/api/v1/compliance/screen/{accountId}` | GET | $0.02 | Premium | KYC/AML/sanctions/risk screening |
| `/api/v1/nft/metadata/{tokenId}/{serial}` | GET | $0.005 | Standard | NFT metadata & ownership |
| `/api/v1/transactions/history/{accountId}` | GET | $0.001 | Basic | Recent transaction history |
| `/api/v1/token/price/{tokenId}` | GET | $0.001 | Basic | Estimated USD price & volume |
| `/api/v1/defi/positions/{accountId}` | GET | $0.02 | Premium | DeFi LP positions & yields |

## Example x402 Flow

### 1. Client calls endpoint (no payment)
```bash
curl https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.123456
```

### 2. Server returns 402 with payment requirements
```json
{
  "x402Version": 2,
  "error": "Payment required",
  "accepts": [{
    "scheme": "exact",
    "network": "hedera:testnet",
    "maxAmountRequired": "1000",
    "resource": "https://.../api/v1/token/balances?accountId=0.0.123456",
    "description": "Query token balances",
    "mimeType": "application/json",
    "payTo": "0.0.1073622",
    "maxTimeoutSeconds": 300,
    "asset": "0.0.429274",
    "facilitator": { "url": "https://x402.org/facilitator", "address": "0.0.1187135" }
  }]
}
```

### 3. Client pays via facilitator, retries with X-PAYMENT header
```bash
curl -H "X-PAYMENT: <signed_payment>" \
  https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.123456
```

### 4. Server verifies payment, returns data
```json
{
  "accountId": "0.0.123456",
  "tokens": [{"tokenId": "0.0.429274", "symbol": "USDC", "balance": "1000000", "decimals": 6}],
  "hbarBalance": "500000000",
  "source": "mirror-node",
  "paid": true
}
```

## Pricing Tiers
- **Basic**: $0.001 (1,000 USDC base units = 0.001 USDC)
- **Standard**: $0.005 (5,000 USDC base units)
- **Premium**: $0.02 (20,000 USDC base units)

## Network
- **Network**: Hedera Testnet
- **Mirror Node**: https://testnet.mirrornode.hedera.com
- **Facilitator**: https://x402.org/facilitator (Coinbase)
- **Facilitator Account**: 0.0.1187135
- **Pay To Address**: 0.0.1073622
- **Payment Asset**: USDC Testnet (0.0.429274, 6 decimals)

## OpenAPI Spec
File: `openapi.yaml` (included)

## Test Credentials
- **Test Account**: 0.0.123456 (or any valid Hedera testnet account)
- **Test USDC**: Get from https://portal.hedera.com/testnet-faucet
- **Wallets**: HashPack, Blade, MetaMask (Hedera-compatible)

## Screenshots Needed
1. x402 discovery document (`/.well-known/x402.json`)
2. 402 Payment Required response
3. Successful paid response
4. Revenue dashboard (https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard)

## Links
- **GitHub**: https://github.com/mobicobe-bit/hedera-x402-micropayments
- **Live API**: https://hedera-micropayments-api.mobicobe.workers.dev
- **Revenue Dashboard**: https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard
- **x402 Discovery**: https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json
- **Grant Application**: Submitted to Hedera Foundation (10M HBAR)

## Tags
`x402`, `micropayments`, `hedera`, `web3`, `blockchain`, `pay-per-call`, `api-monetization`, `usdc`, `token-analytics`, `compliance`, `defi`, `nft`

## Monetization Model
- **Pay-per-call**: No subscriptions, no monthly fees
- **Revenue**: Direct to API provider via x402 settlement
- **Dashboard**: Real-time revenue tracking at /dashboard
- **Protocol fee**: 0% (x402 facilitator takes small fee)

## Support
- **Email**: mobicobe@gmail.com
- **Issues**: https://github.com/mobicobe-bit/hedera-x402-micropayments/issues
- **Documentation**: OpenAPI spec + README in repo