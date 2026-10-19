import { AccountId } from "@hashgraph/sdk";
import { loadConfig, checkBalances } from "../hedera.ts";

async function main() {
  const config = loadConfig();

  const tokenId = process.env.TOKEN_ID;
  const accountIds = process.env.ACCOUNT_IDS?.split(",") || [config.operatorId.toString(), config.treasuryId.toString()];

  if (!tokenId) {
    console.error("Missing required env var: TOKEN_ID");
    process.exit(1);
  }

  await checkBalances(config, AccountId.fromString(tokenId), accountIds.map(AccountId.fromString));

  console.log(`\n✅ Balance check complete`);
}

main().catch(console.error);