import { Client, PrivateKey, AccountId, TransferTransaction, Hbar } from "@hashgraph/sdk";

async function testFacilitator() {
  const privateKeyStr = "1a1f1ce0a9bd8810f2cc44458367be411f2389d71c87e0ad4b397c76e42580f5";
  const accountId = "0.0.1187135";
  const baseUrl = "https://hedera-micropayments-api.mobicobe.workers.dev";
  const facilitatorUrl = "https://hedera-testnet-facilitator.mobicobe.workers.dev";

  // Create Hiero client for signing
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr);
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  // Step 1: Get 402 response
  console.log("📍 Step 1: Getting 402 response...");
  const response = await fetch(`${baseUrl}/api/v1/token/balances?accountId=${accountId}`);
  const data = await response.json();
  
  if (response.status !== 402) {
    console.log("❌ Expected 402, got:", response.status, data);
    return;
  }
  
  console.log("✅ Got 402 response");
  const paymentReq = data.accepts[0];
  console.log("Payment requirements:", JSON.stringify(paymentReq, null, 2));

  // Step 2: Create payment transaction
  console.log("\n📍 Step 2: Creating payment transaction...");
  const amount = paymentReq.maxAmountRequired; // in base units
  const asset = paymentReq.asset;
  const payTo = paymentReq.payTo;
  const feePayer = paymentReq.extra?.feePayer;

  console.log(`Amount: ${amount} base units`);
  console.log(`Asset: ${asset}`);
  console.log(`Pay to: ${payTo}`);
  console.log(`Fee payer: ${feePayer}`);

  // Create HBAR transfer transaction (since asset is 0.0.0 for HBAR)
  // But wait - the asset is 0.0.5449 (USDC testnet) based on the 402 response
  // Let me check the asset
  
  let transaction;
  if (asset === "0.0.0") {
    // HBAR transfer
    transaction = new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(accountId), -parseInt(amount))
      .addHbarTransfer(AccountId.fromString(payTo), parseInt(amount))
      .freezeWith(client);
  } else {
    // Token transfer
    const { TokenId } = await import("@hashgraph/sdk");
    transaction = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(asset), AccountId.fromString(accountId), -parseInt(amount))
      .addTokenTransfer(TokenId.fromString(asset), AccountId.fromString(payTo), parseInt(amount))
      .freezeWith(client);
  }

  const signedTx = await transaction.sign(privateKey);
  const base64Tx = Buffer.from(signedTx.toBytes()).toString("base64");
  console.log(`✅ Signed transaction (base64 length: ${base64Tx.length})`);

  // Step 3: Submit payment to facilitator
  console.log("\n📍 Step 3: Submitting payment to facilitator...");
  
  const paymentPayload = {
    x402Version: 2,
    paymentPayload: base64Tx,
    paymentRequirements: {
      x402Version: 2,
      scheme: paymentReq.scheme,
      network: paymentReq.network,
      maxAmountRequired: paymentReq.maxAmountRequired,
      resource: paymentReq.resource,
      description: paymentReq.description,
      mimeType: paymentReq.mimeType,
      payTo: paymentReq.payTo,
      maxTimeoutSeconds: paymentReq.maxTimeoutSeconds,
      asset: paymentReq.asset,
      extra: paymentReq.extra,
      facilitator: paymentReq.facilitator,
    },
  };

  const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentPayload),
  });

  const verifyData = await verifyRes.json();
  console.log("Verification result:", JSON.stringify(verifyData, null, 2));

  if (!verifyData.isValid) {
    console.log("❌ Payment verification failed");
    return;
  }

  console.log("✅ Payment verified!");
  console.log("Transaction hash:", verifyData.transactionHash);
  console.log("Payer:", verifyData.payer);

  // Step 4: Retry request with payment header
  console.log("\n📍 Step 4: Retrying request with payment header...");
  const finalResponse = await fetch(`${baseUrl}/api/v1/token/balances?accountId=${accountId}`, {
    headers: {
      "X-PAYMENT": base64Tx,
    },
  });

  const finalData = await finalResponse.json();
  console.log("Final response status:", finalResponse.status);
  console.log("Final response:", JSON.stringify(finalData, null, 2));
}

testFacilitator().catch(console.error);