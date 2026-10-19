# API Reference — Hedera Micropayments x402 API

## Base URL
```
https://hedera-micropayments-api.mobicobe.workers.dev
```

## Discovery Endpoint
```
GET /.well-known/x402.json
```
Returns x402 v2 manifest with all priced endpoints, facilitators, and asset info.

---

## Endpoints

All endpoints require **x402 payment** (402 response with payment details on first call).

### 1. Token Balances
```
GET /api/v1/token/balances?accountId=0.0.123456
```
**Price**: $0.001 (1,000 USDC base units)
**Description**: Query all token balances for a Hedera account via mirror node.

**Query Params**:
- `accountId` (required): Hedera account ID (e.g., `0.0.123456`)

**Response**:
```json
{
  "accountId": "0.0.123456",
  "tokens": [
    { "tokenId": "0.0.456858", "symbol": "USDC", "balance": "1000000", "decimals": 6 }
  ],
  "hbarBalance": "5000000000",
  "source": "mirror-node",
  "paid": true
}
```

---

### 2. Token Analytics
```
GET /api/v1/token/analytics/:tokenId
```
**Price**: $0.005 (5,000 USDC base units)
**Description**: Token holder distribution, velocity, top holders (last 24h).

**Path Params**:
- `tokenId` (required): Hedera token ID (e.g., `0.0.789012`)

**Response**:
```json
{
  "tokenId": "0.0.789012",
  "analytics": {
    "totalHolders": 1250,
    "totalSupply": "1000000000000",
    "circulatingSupply": "850000000000",
    "velocity24h": "0.0034",
    "topHolders": [
      { "accountId": "0.0.111111", "balance": "50000000000", "percentage": "5.00%" }
    ],
    "transfers24h": 3421,
    "uniqueSenders24h": 890,
    "uniqueReceivers24h": 912
  },
  "paid": true
}
```

---

### 3. Compliance Screening
```
GET /api/v1/compliance/screen/:accountId
```
**Price**: $0.02 (20,000 USDC base units)
**Description**: KYC/AML flags, sanctions check, risk scoring via account metadata.

**Path Params**:
- `accountId` (required): Hedera account ID

**Response**:
```json
{
  "accountId": "0.0.123456",
  "screening": {
    "kycStatus": "kyc_key_set",
    "amlFlags": [],
    "sanctionsMatch": false,
    "riskScore": 15,
    "accountAgeDays": 180,
    "isDeleted": false,
    "isFrozen": false,
    "lastScreened": "2026-10-19T12:00:00.000Z",
    "sources": ["mirror-node", "account-metadata"]
  },
  "paid": true
}
```

---

### 4. NFT Metadata
```
GET /api/v1/nft/metadata/:tokenId/:serial
```
**Price**: $0.005
**Description**: NFT metadata + ownership for a specific serial.

---

### 5. Transaction History
```
GET /api/v1/transactions/history/:accountId?limit=100
```
**Price**: $0.001
**Description**: Recent transactions for an account.

---

### 6. Token Price (USD)
```
GET /api/v1/token/price/:tokenId
```
**Price**: $0.001
**Description**: Current USD price via mirror node / oracle.

---

### 7. DeFi Positions
```
GET /api/v1/defi/positions/:accountId
```
**Price**: $0.02
**Description**: DeFi protocol positions, yields, collateral.

---

## Payment Flow

1. **Client calls endpoint** → Receives `402 Payment Required`
2. **Response includes** `x-payment-required: true` + payment details:
   - `payTo`: Treasury account (0.0.1073622)
   - `asset`: USDC (0.0.429274 testnet / 0.0.456858 mainnet)
   - `maxAmountRequired`: Price in base units
   - `facilitator`: https://x402.org/facilitator
3. **Client creates payment** via x402 SDK / wallet
4. **Client retries with** `X-PAYMENT` header
5. **Facilitator verifies** → settles on Hedera
6. **API returns data** + `PAYMENT-RESPONSE` header

---

## x402 Client Example (JavaScript)

```javascript
import { x402Fetch } from "@x402/fetch";

const response = await x402Fetch(
  "https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.1073622",
  { method: "GET" }
);

const data = await response.json();
console.log(data);
```

---

## Rate Limits
- 100 requests/day per IP (configurable)
- Returns 429 with `Retry-After` header

---

## Error Responses

| Code | Meaning |
|------|---------|
| 400 | Missing required params |
| 402 | Payment required (see payment details in body) |
| 429 | Rate limited |
| 502 | Mirror node / upstream error |
| 500 | Internal server error |

---

## Headers

| Header | Purpose |
|--------|---------|
| `X-PAYMENT` | x402 payment payload (client → API) |
| `PAYMENT-RESPONSE` | Settlement receipt (API → client) |
| `X-PAYMENT-REQUIRED` | Indicates 402 flow active |

---

## Networks & Assets

| Network | HBAR | USDC |
|---------|------|------|
| Testnet | 0.0.0 | 0.0.429274 |
| Mainnet | 0.0.0 | 0.0.456858 |

---

## Facilitators

| Facilitator | Address |
|-------------|---------|
| Coinbase (default) | 0.0.1187135 |
| Custom | Via `ADDITIONAL_FACILITATORS` env |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-19 | Initial testnet deployment, 7 endpoints |
| 1.1.0 | TBD | Mainnet deployment, NFT/DeFi endpoints |