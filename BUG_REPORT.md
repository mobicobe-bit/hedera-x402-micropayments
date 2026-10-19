# Bug Report: @x402/hedera client SDK - `createPaymentPayload` fails with "Cannot read properties of undefined (reading 'startsWith')"

## Environment
- **Package**: `@x402/hedera` v2.28.0
- **Node.js**: v26.7.0
- **OS**: Linux (WSL2)

## Expected Behavior
`ExactHederaScheme.createPaymentPayload()` should return a valid payment payload with a base64-encoded partially signed Hedera transaction.

## Actual Behavior
```
TypeError: Cannot read properties of undefined (reading 'startsWith')
    at ExactHederaScheme.createPaymentPayload (chunk-WP6D5IUW.mjs:88:21)
```

## Reproduction Steps

1. Install `@x402/fetch`, `@x402/hedera`, `@x402/core`, `viem`
2. Create a signer using `createClientHederaSigner()` from `@x402/hedera`
3. Register the scheme: `client.register("hedera:testnet", new ExactHederaScheme(signer))`
4. Wrap fetch: `const fetchWithPay = wrapFetchWithPayment(fetch, client)`
5. Call a paid endpoint: `await fetchWithPay("https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.1187135")`

## Error Stack
```
TypeError: Cannot read properties of undefined (reading 'startsWith')
    at ExactHederaScheme.createPaymentPayload (file:///.../node_modules/@x402/hedera/dist/esm/chunk-WP6D5IUW.mjs:88:21)
    at x402Client.createPaymentPayload (file:///.../node_modules/@x402/core/dist/esm/chunk-FV2JN4FK.mjs:1070:51)
    at x402HTTPClient.createPaymentPayload (...)
    at wrapFetchWithPayment (...)
```

## Server Details (Working Correctly)
The server at `https://hedera-micropayments-api.mobicobe.workers.dev` correctly returns 402 responses with proper payment requirements:

```json
{
  "x402Version": 2,
  "resource": {
    "url": "https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.1187135",
    "description": "Query token balances for an account via mirror node",
    "mimeType": "application/json"
  },
  "accepts": [{
    "scheme": "exact",
    "network": "hedera:testnet",
    "amount": "1000",
    "asset": "0.0.429274",
    "payTo": "0.0.1073622",
    "maxTimeoutSeconds": 300,
    "extra": {
      "facilitatorAddress": "0.0.9185802"
    }
  }]
}
```

## Test Setup
- **Signer**: Created via `createClientHederaSigner(accountId, privateKey, { network: "hedera:testnet" })` from `@x402/hedera`
- **Private Key**: DER-encoded ECDSA key (302e020100300506032b657004220420...)
- **Account ID**: `0.0.1073622` (testnet treasury)
- **Network**: `hedera:testnet`
- **Asset**: `0.0.429274` (USDC testnet)

## Workaround
Use a custom signer implementation that manually creates the partially signed transaction:

```javascript
const signer = {
  accountId: TEST_ACCOUNT_ID,
  createPartiallySignedTransferTransaction: async (requirements) => {
    const client = Client.forTestnet();
    client.setOperator(TEST_ACCOUNT_ID, privateKey);
    
    const { TransferTransaction, AccountId, TokenId } = await import("@hiero-ledger/sdk");
    
    const amount = requirements.amount;
    const asset = requirements.asset;
    const payTo = requirements.payTo;
    
    const transaction = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(asset), AccountId.fromString(TEST_ACCOUNT_ID), -parseInt(amount))
      .addTokenTransfer(TokenId.fromString(asset), AccountId.fromString(requirements.payTo), parseInt(amount))
      .freezeWith(client);
    
    const signedTx = await transaction.sign(privateKey);
    return Buffer.from(signedTx.toBytes()).toString("base64");
  }
};
```

## Server Status
The server is **fully deployed and working** at:
- **Discovery**: https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json
- **Health**: https://hedera-micropayments-api.mobicobe.workers.dev/health
- **Paid endpoints**: All return proper 402 responses with correct payment requirements

## Request
Please fix the `createPaymentPayload` method in `@x402/hedera` to properly handle the payment requirements object and signer interface.