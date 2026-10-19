import { AccountId, PrivateKey } from "@hashgraph/sdk";
import { loadConfig, createMicropaymentToken, checkBalances } from "./hedera.ts";
import { purchaseTokensFixedPrice, getPurchaseQuote, canAffordPurchase } from "./purchase.ts";

async function main() {
  console.log("🛒 Crypto Token Purchase Demo\n");

  const config = loadConfig();

  // 1. Create token (or use existing)
  let tokenId: any;
  if (process.env.TOKEN_ID) {
    tokenId = AccountId.fromString(process.env.TOKEN_ID);
    console.log(`Using existing token: ${tokenId.toString()}`);
  } else {
    console.log("Creating new token...");
    tokenId = await createMicropaymentToken(config, {
      name: "API Credits",
      symbol: "APIC",
      initialSupply: 0,        // Start with 0, mint on purchase
      feeAmount: 10,           // 10 tinybars per API call transfer
      decimals: 0,
    });
  }

  // 2. Set price: 1000 tinybars per token (0.00001 HBAR = ~$0.0000005)
  const PRICE_PER_TOKEN = 1000; // tinybars
  const TOKENS_TO_BUY = 100;

  console.log(`\n💰 Price: ${PRICE_PER_TOKEN} tinybars per token (${PRICE_PER_TOKEN / 100_000_000} HBAR)`);
  console.log(`📦 Buying: ${TOKENS_TO_BUY} tokens`);

  // 3. Show quote
  const quote = getPurchaseQuote(TOKENS_TO_BUY, PRICE_PER_TOKEN);
  console.log(`\n📋 Quote:`);
  console.log(`   Tokens: ${quote.tokenAmount}`);
  console.log(`   Total: ${quote.hbarCost} tinybars (${quote.hbarCost / 100_000_000} HBAR)`);
  console.log(`   Network fee est: ${quote.feeBreakdown.networkFee} tinybars`);

  // 4. Demo buyer (in production: user's wallet)
  const buyerKey = PrivateKey.generateECDSA();
  const buyerId = config.operatorId; // using operator for demo

  console.log(`\n👤 Buyer: ${buyerId.toString()}`);

  // 5. Check affordability
  const afford = await canAffordPurchase(config, buyerId, quote.hbarCost);
  console.log(`💳 Balance: ${afford.balance} tinybars | Can afford: ${afford.canAfford}`);

  if (!afford.canAfford) {
    console.log("❌ Insufficient HBAR. Fund account from faucet.");
    return;
  }

  // 6. Execute purchase
  console.log(`\n🔄 Processing purchase...`);
  const result = await purchaseTokensFixedPrice(config, {
    tokenId,
    buyerId,
    buyerKey,
    tokenAmount: TOKENS_TO_BUY,
    pricePerTokenTinybars: PRICE_PER_TOKEN,
    treasuryId: config.treasuryId,
  });

  if (result.success) {
    console.log(`\n✅ Purchase successful!`);
    console.log(`   Tx ID: ${result.transactionId}`);
    console.log(`   Tokens received: ${result.tokensReceived}`);
  } else {
    console.log(`\n❌ Purchase failed: ${result.error}`);
    return;
  }

  // 7. Verify balances
  console.log(`\n📊 Final balances:`);
  await checkBalances(config, tokenId, [config.treasuryId, buyerId]);

  console.log(`\n🎉 Done! Buyer can now use tokens for API calls.`);
}

main().catch(console.error);