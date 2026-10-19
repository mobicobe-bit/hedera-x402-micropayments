import { loadConfig, createMicropaymentToken } from "../hedera.ts";

async function main() {
  const config = loadConfig();

  const tokenId = await createMicropaymentToken(config, {
    name: process.env.TOKEN_NAME || "API Credits",
    symbol: process.env.TOKEN_SYMBOL || "APIC",
    initialSupply: parseInt(process.env.INITIAL_SUPPLY || "1000000"),
    feeAmount: parseInt(process.env.FEE_AMOUNT || "10"),
    decimals: parseInt(process.env.DECIMALS || "0"),
  });

  console.log(`\n✅ Done! Token ID: ${tokenId.toString()}`);
  console.log(`Add to .env: TOKEN_ID=${tokenId.toString()}`);
}

main().catch(console.error);