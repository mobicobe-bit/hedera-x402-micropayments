import { Client, PrivateKey, AccountId, TokenId, TokenAssociateTransaction } from "@hashgraph/sdk";

async function main() {
  const operatorId = AccountId.fromString("0.0.1187135");
  const operatorKey = PrivateKey.fromStringECDSA("1a1f1ce0a9bd8810f2cc44458367be411f2389d71c87e0ad4b397c76e42580f5");
  
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  const tokenId = TokenId.fromString("0.0.5449");
  const accountId = AccountId.fromString("0.0.1187135");
  
  console.log("Associating token", tokenId.toString(), "to account", accountId.toString());
  
  const associateTx = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId])
    .freezeWith(client);
  
  const signTx = await associateTx.sign(operatorKey);
  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  
  console.log("✅ Token associated:", receipt.status.toString());
}

main().catch(console.error);