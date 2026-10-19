import { AccountId, PrivateKey } from "@hashgraph/sdk";
import { loadConfig, createMicropaymentToken, associateToken, transferTokens, checkBalances, simulateApiCall } from "./hedera.ts";

async function main() {
  console.log("🚀 Crypto Micropayment Starter - API Credit Demo\n");

  const config = loadConfig();

  // 1. Create token with per-transfer fee (10 tinybars = 0.0000001 HBAR per API call)
  const tokenId = await createMicropaymentToken(config, {
    name: "API Credits",
    symbol: "APIC",
    initialSupply: 1_000_000,
    feeAmount: 10, // 10 tinybars per transfer
    decimals: 0,
  });

  // 2. Create a test user account (in real app, this would be user's wallet)
  const userKey = PrivateKey.generateECDSA();
  const userId = AccountId.fromString("0.0.0"); // placeholder - would be real account

  console.log(`\n👤 Test user generated:`);
  console.log(`   Account ID: (create on testnet portal and fund with HBAR)`);
  console.log(`   Private Key: ${userKey.toString()}`);

  // For demo, we'll use operator as user (since we can't create accounts via SDK easily)
  // In production: user creates account via wallet, you associate token for them
  const demoUserId = config.operatorId;
  const demoUserKey = config.operatorKey;

  // 3. Associate token to user (required before they can receive/hold tokens)
  await associateToken(config, tokenId, demoUserId, demoUserKey);

  // 4. Give user some initial tokens (mint from treasury or transfer)
  console.log(`\n💰 Funding user with 1000 APIC tokens...`);
  await transferTokens(config, tokenId, config.treasuryId, config.treasuryKey, demoUserId, 1000);

  // 5. Check initial balances
  console.log(`\n📊 Initial balances:`);
  await checkBalances(config, tokenId, [config.treasuryId, demoUserId]);

  // 6. Simulate API calls (each costs 1 token + auto-fee to treasury)
  console.log(`\n--- Simulating API Calls ---`);
  for (let i = 1; i <= 5; i++) {
    console.log(`\n📡 API Call #${i}`);
    await simulateApiCall(config, tokenId, demoUserId, demoUserKey, 1);
    
    // Check balances after each call
    await checkBalances(config, tokenId, [config.treasuryId, demoUserId]);
  }

  console.log(`\n✅ Demo complete!`);
  console.log(`\nKey points:`);
  console.log(`- Each transfer auto-charges 10 tinybars to treasury (no contract call)`);
  console.log(`- Fee is paid in HBAR, tokens move 1:1`);
  console.log(`- Mirror node can index all transfers for analytics`);
  console.log(`- Scale: 10,000 API calls = ~$0.01 in fees`);
}

main().catch(console.error);