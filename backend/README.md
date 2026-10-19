# Hedera Micropayments Backend

Node.js/Express backend that receives signed HBAR transfers from frontend wallets, submits them to Hedera, and mints tokens to buyers.

## Quick Start

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/purchase` | Process token purchase (signed HBAR transfer → mint) |
| `POST` | `/api/quote` | Get price quote for token amount |
| `GET` | `/api/token/:tokenId/balance/:accountId` | Check token balance |

## Purchase Flow

```
Frontend (Wallet)                          Backend
     │                                         │
     ├─ signed HBAR transfer (base64) ──────► │
     │     + tokenId, tokenAmount,            │
     │       buyerAccountId                   │
     │                                         │
     │                    1. Submit HBAR tx   │
     │                    2. Wait for receipt │
     │                    3. If SUCCESS:      │
     │                       Mint tokens      │
     │                    4. Return result    │
     │                                         │
     ◄────── { success, hbarTxId, mintTxId,  │
          tokensReceived } ──────────────────┤
```

### POST /api/purchase

**Request:**
```json
{
  "signedTransaction": "base64_encoded_signed_transaction",
  "tokenId": "0.0.123456",
  "tokenAmount": 100,
  "buyerAccountId": "0.0.789012"
}
```

**Success Response:**
```json
{
  "success": true,
  "hbarTxId": "0.0.123456@1234567890.123456789",
  "mintTxId": "0.0.345678@1234567890.123456789",
  "tokensReceived": 100,
  "buyerTokenBalance": 100
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "HBAR transfer failed: INSUFFICIENT_PAYER_BALANCE",
  "hbarTxId": "0.0.123456@1234567890.123456789"
}
```

### POST /api/quote

**Request:**
```json
{ "tokenAmount": 100 }
```

**Response:**
```json
{
  "tokenAmount": 100,
  "hbarCost": 105000000,
  "feeBreakdown": {
    "tokenPrice": 1000,
    "networkFee": 5000000,
    "platformFee": 0
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPERATOR_ID` | Account that submits transactions (pays fees) |
| `OPERATOR_KEY` | Operator private key (DER hex) - holds token supply key |
| `TREASURY_ID` | Account that receives HBAR payments |
| `TREASURY_KEY` | Treasury private key |
| `PORT` | Server port (default: 3001) |
| `PRICE_PER_TOKEN_TINYBARS` | Price per token in tinybars (default: 1000) |
| `CORS_ORIGIN` | Frontend origin for CORS (default: http://localhost:3000) |

## Critical: Failure Handling

If HBAR transfer succeeds but mint fails:
- HBAR is in treasury
- Tokens NOT minted to buyer
- **Manual intervention required**

Production systems should:
1. Log all failed mints with full details
2. Alert ops team immediately
3. Implement compensation (refund HBAR or retry mint)
4. Consider idempotency keys for retry safety

## Security Notes

- Operator holds token **supply key** - only backend can mint
- Never expose operator private key to frontend
- Validate all inputs server-side
- Use HTTPS in production
- Rate limit `/api/purchase` endpoint
- Consider JWT/auth for buyer identification

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Get quote
curl -X POST http://localhost:3001/api/quote \
  -H "Content-Type: application/json" \
  -d '{"tokenAmount": 100}'

# Check balance
curl http://localhost:3001/api/token/0.0.123456/balance/0.0.789012
```