#!/usr/bin/env node
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { PrivateKey, Client, AccountId, TokenId, TransferTransaction } from "@hiero-ledger/sdk";

const BASE_URL = "https://hedera-micropayments-api.mobicobe.workers.dev";

// Test credentials - MUST be a valid testnet private key with USDC balance
// Get one from: https://portal.hedera.com (create account, claim HBAR, then associate USDC 0.0.429274)
// Then: export TEST_PRIVATE_KEY=0xYOUR_KEY_HERE
// And: export TEST_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;
const TEST_ACCOUNT_ID = process.env.TEST_ACCOUNT_ID;

if (!TEST_PRIVATE_KEY || TEST_PRIVATE_KEY === "0xYOUR_TESTNET_PRIVATE_KEY_HERE") {
  console.error("❌ ERROR: Please set TEST_PRIVATE_KEY environment variable");
  console.error("   Get a testnet key from https://portal.hedera.com");
  console.error("   1. Create testnet account");
  console.error("   2. Claim HBAR from faucet");
  console.error("   3. Associate USDC (0.0.429274) via HashPack/Blade");
  console.error("   4. Export private key (DER-encoded, e.g., 302e020100300506032b657004220420...)");
  console.error("   5. Run: export TEST_PRIVATE_KEY=302e020100300506032b657004220420...");
  console.error("   6. Also set: export TEST_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID");
  process.exit(1);
}

if (!TEST_ACCOUNT_ID || TEST_ACCOUNT_ID === "0.0.YOUR_ACCOUNT_ID") {
  console.error("❌ ERROR: Please set TEST_ACCOUNT_ID environment variable");
  console.error("   Your Hedera account ID (e.g., 0.0.123456)");
  console.error("   Run: export TEST_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID");
  process.exit(1);
}

async function testX402Client() {
  console.log("🔑 Initializing x402 client with Hedera scheme (WORKAROUND)...");
  
  // Create Hiero SDK PrivateKey from DER-encoded string
  const privateKey = PrivateKey.fromString(TEST_PRIVATE_KEY);
  console.log("PrivateKey created:", privateKey.toString());
  
  // WORKAROUND: Custom signer that bypasses the buggy @x402/hedera client library
  // The @x402/hedera client has a bug in createPaymentPayload that causes
  // "Cannot read properties of undefined (reading 'startsWith')"
  // 
  // This workaround implements the signer interface manually using Hiero SDK directly
  const signer = {
    accountId: TEST_ACCOUNT_ID,
    
    // Implement the ClientHederaSigner interface manually
    createPartiallySignedTransferTransaction: async (requirements) => {
      console.log("  Creating partially signed transfer for requirements:", JSON.stringify(requirements, null, 2));
      
      // Create a client for the network
      const client = Client.forTestnet();
      client.setOperator(TEST_ACCOUNT_ID, privateKey);
      
      // Parse the payment requirements
      const amount = requirements.amount; // e.g., "1000" (in smallest units)
      const asset = requirements.asset; // e.g., "0.0.429274" (USDC testnet)
      const payTo = requirements.payTo; // e.g., "0.0.1073622"
      
      // Create transfer transaction
      const transaction = new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(asset), AccountId.fromString(TEST_ACCOUNT_ID), -parseInt(amount))
        .addTokenTransfer(TokenId.fromString(asset), AccountId.fromString(payTo), parseInt(amount))
        .freezeWith(client);
      
      // Sign with payer's private key
      const signedTx = await transaction.sign(privateKey);
      
      // Return base64 encoded transaction
      const base64Tx = Buffer.from(signedTx.toBytes()).toString("base64");
      console.log("  Created base64 transaction (length:", base64Tx.length, ")");
      return base64Tx;
    }
  };
  
  console.log("Signer created with accountId:", signer.accountId);
  
  const client = new x402Client();
  client.register("hedera:testnet", new ExactHederaScheme(signer));
  
  const fetchWithPay = wrapFetchWithPayment(fetch, client);
  
  console.log("📍 Testing discovery endpoint...");
  try {
    const discovery = await fetchWithPay(`${BASE_URL}/.well-known/x402.json`);
    const discoveryData = await discovery.json();
    console.log("✅ Discovery successful:");
    console.log(JSON.stringify(discoveryData, null, 2));
  } catch (error) {
    console.error("❌ Discovery failed:", error.message);
    return;
  }
  
  console.log("\n📍 Testing paid endpoint: /api/v1/token/balances");
  try {
    const response = await fetchWithPay(`${BASE_URL}/api/v1/token/balances?accountId=0.0.1187135`);
    const data = await response.json();
    console.log("✅ Paid endpoint response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Paid endpoint failed:", error.message);
  }
  
  console.log("\n📍 Testing paid endpoint: /api/v1/token/analytics");
  try {
    const response = await fetchWithPay(`${BASE_URL}/api/v1/token/analytics/0.0.123456`);
    const data = await response.json();
    console.log("✅ Analytics endpoint response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Analytics endpoint failed:", error.message);
  }
  
  console.log("\n📍 Testing paid endpoint: /api/v1/compliance/screen");
  try {
    const response = await fetchWithPay(`${BASE_URL}/api/v1/compliance/screen/0.0.1187135`);
    const data = await response.json();
    console.log("✅ Compliance endpoint response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Compliance endpoint failed:", error.message);
  }
  
  console.log("\n✅ All tests completed!");
}

testX402Client().catch(console.error);