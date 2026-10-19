import { AccountId, PrivateKey } from "@hashgraph/sdk";
import { loadConfig, associateToken } from "../hedera.ts";

async function main() {
  const config = loadConfig();

  const tokenId = process.env.TOKEN_ID;
  const accountId = process.env.ACCOUNT_ID;
  const accountKey = process.env.ACCOUNT_KEY;

  if (!tokenId || !accountId || !accountKey) {
    console.error("Missing required env vars: TOKEN_ID, ACCOUNT_ID, ACCOUNT_KEY");
    process.exit(1);
  }

  await associateToken(config, AccountId.fromString(tokenId), AccountId.fromString(accountId), PrivateKey.fromStringECDSA(accountKey));

  console.log(`\n✅ Token associated successfully`);
}

main().catch(console.error);