import { Client, PrivateKey, AccountId, TransferTransaction, Hbar } from "@hashgraph/sdk";

// From .env.mainnet
const operatorId = AccountId.fromString("0.0.4606490");
const operatorKeyDer = "302e020100300506032b65700422042043e878ec8fd4207f0acd43af4332d8ddd667adbcf4d3ddc3e25c4a014ebd3a48";

// Parse DER to get raw ED25519 key
const derBytes = Buffer.from(operatorKeyDer, "hex");
let rawKey = null;
for (let i = 0; i < derBytes.length - 1; i++) {
  if (derBytes[i] === 0x04 && derBytes[i+1] === 0x20) {
    rawKey = derBytes.slice(i+2, i+34);
    break;
  }
}

if (!rawKey || rawKey.length !== 32) {
  console.error("Could not extract 32-byte key from DER");
  process.exit(1);
}

console.log("Raw key (hex):", rawKey.toString("hex"));

const client = Client.forMainnet();
client.setOperator(operatorId, PrivateKey.fromStringED25519(rawKey.toString("hex")));

// Target EVM alias
const evmAlias = "0xcc7cc2c2c11e82f175cac1249038eb338ba099bd";
const targetAccountId = AccountId.fromEvmAddress(0, 0, evmAlias);

console.log("Target account ID:", targetAccountId.toString());

// Send 10 HBAR to fund the alias
const tx = await new TransferTransaction()
  .addHbarTransfer(operatorId, Hbar.fromTinybars(-1_000_000_000))
  .addHbarTransfer(targetAccountId, Hbar.fromTinybars(1_000_000_000))
  .setMaxTransactionFee(new Hbar(1))
  .execute(client);

const receipt = await tx.getReceipt(client);
console.log("Transfer status:", receipt.status.toString());
console.log("Account should now exist on mainnet");

client.close();
