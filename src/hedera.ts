import { Client, PrivateKey, AccountId, TokenCreateTransaction, TokenType, TokenSupplyType, CustomFixedFee, TokenAssociateTransaction, TransferTransaction, AccountBalanceQuery, TokenId } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

export interface HederaConfig {
  operatorId: AccountId;
  operatorKey: PrivateKey;
  treasuryId: AccountId;
  treasuryKey: PrivateKey;
  mirrorNode: string;
  client: Client;
}

export function loadConfig(): HederaConfig {
  const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY!);
  const treasuryId = AccountId.fromString(process.env.TREASURY_ID!);
  const treasuryKey = PrivateKey.fromStringED25519(process.env.TREASURY_KEY!);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  return {
    operatorId,
    operatorKey,
    treasuryId,
    treasuryKey,
    mirrorNode: process.env.MIRROR_NODE || "https://testnet.mirrornode.hedera.com",
    client,
  };
}

export async function createMicropaymentToken(
  config: HederaConfig,
  opts: {
    name: string;
    symbol: string;
    initialSupply: number;
    feeAmount: number; // in tinybars (1 HBAR = 100,000,000 tinybars)
    decimals?: number;
  }
): Promise<TokenId> {
  const { name, symbol, initialSupply, feeAmount, decimals = 0 } = opts;

  // For tokens that will be minted on purchase, set a reasonable max supply
  // even if initialSupply is 0 (e.g., 1 billion max)
  const maxSupply = initialSupply > 0 ? initialSupply : 1_000_000_000;

  const tokenCreate = new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(decimals)
    .setInitialSupply(initialSupply)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(maxSupply)
    .setTreasuryAccountId(config.treasuryId)
    .setAdminKey(config.operatorKey)
    .setSupplyKey(config.operatorKey)
    .setCustomFees([
      new CustomFixedFee()
        .setAmount(feeAmount)
        .setFeeCollectorAccountId(config.treasuryId)
    ])
    .freezeWith(config.client);

  // Sign with operator (admin/supply key)
  let signTx = await tokenCreate.sign(config.operatorKey);

  // If treasury is different from operator, also need treasury's signature
  if (config.treasuryId.toString() !== config.operatorId.toString()) {
    signTx = await signTx.sign(config.treasuryKey);
  }

  const txResponse = await signTx.execute(config.client);
  const receipt = await txResponse.getReceipt(config.client);
  const tokenId = receipt.tokenId!;

  console.log(`✅ Token created: ${tokenId.toString()}`);
  console.log(`   Name: ${name} (${symbol})`);
  console.log(`   Initial Supply: ${initialSupply}`);
  console.log(`   Max Supply: ${maxSupply}`);
  console.log(`   Fee per transfer: ${feeAmount} tinybars (${feeAmount / 100_000_000} HBAR)`);

  return tokenId;
}

export async function associateToken(
  config: HederaConfig,
  tokenId: TokenId,
  accountId: AccountId,
  accountKey: PrivateKey
): Promise<void> {
  const associateTx = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId])
    .freezeWith(config.client);

  const signTx = await associateTx.sign(accountKey);
  const txResponse = await signTx.execute(config.client);
  const receipt = await txResponse.getReceipt(config.client);

  console.log(`✅ Token associated to ${accountId.toString()}: ${receipt.status.toString()}`);
}

export async function transferTokens(
  config: HederaConfig,
  tokenId: TokenId,
  fromAccountId: AccountId,
  fromKey: PrivateKey,
  toAccountId: AccountId,
  amount: number
): Promise<string> {
  const transferTx = new TransferTransaction()
    .addTokenTransfer(tokenId, fromAccountId, -amount)
    .addTokenTransfer(tokenId, toAccountId, amount)
    .freezeWith(config.client);

  const signTx = await transferTx.sign(fromKey);
  const txResponse = await signTx.execute(config.client);
  const receipt = await txResponse.getReceipt(config.client);

  console.log(`✅ Transferred ${amount} ${tokenId.toString()} from ${fromAccountId} to ${toAccountId}: ${receipt.status.toString()}`);
  return txResponse.transactionId.toString();
}

export async function checkBalances(
  config: HederaConfig,
  tokenId: TokenId,
  accounts: AccountId[]
): Promise<void> {
  for (const accountId of accounts) {
    try {
      // Use mirror node REST API for more reliable balance queries
      const url = `${config.mirrorNode}/api/v1/accounts/${accountId.toString()}/tokens?token.id=${tokenId.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Mirror node error: ${response.status}`);
      const data = await response.json() as { tokens?: Array<{ balance?: string | number }> };
      
      let tokenBalance = 0;
      if (data.tokens && data.tokens.length > 0) {
        tokenBalance = typeof data.tokens[0].balance === 'string' ? parseInt(data.tokens[0].balance) : (data.tokens[0].balance || 0);
      }
      
      // Also get HBAR balance
      const hbarUrl = `${config.mirrorNode}/api/v1/accounts/${accountId.toString()}`;
      const hbarResponse = await fetch(hbarUrl);
      let hbarBalance = 0;
      if (hbarResponse.ok) {
        const hbarData = await hbarResponse.json() as { balance?: { balance?: string | number } };
        const bal = hbarData.balance?.balance;
        hbarBalance = typeof bal === 'string' ? parseInt(bal) : (bal || 0);
      }

      console.log(`📊 ${accountId.toString()}: ${tokenBalance} tokens | ${hbarBalance} tinybars HBAR (${hbarBalance / 100_000_000} HBAR)`);
    } catch (error) {
      console.log(`📊 ${accountId.toString()}: Failed to fetch balance - ${error}`);
    }
  }
}

export async function simulateApiCall(
  config: HederaConfig,
  tokenId: TokenId,
  userId: AccountId,
  userKey: PrivateKey,
  apiCost: number
): Promise<boolean> {
  try {
    console.log(`\n🔄 Simulating API call...`);
    console.log(`   User: ${userId.toString()}`);
    console.log(`   Cost: ${apiCost} tokens`);

    // Transfer tokens from user to treasury (fee auto-collects to treasury)
    await transferTokens(config, tokenId, userId, userKey, config.treasuryId, apiCost);

    console.log(`✅ API call authorized - fee auto-collected to treasury`);
    return true;
  } catch (error) {
    console.error(`❌ API call failed:`, error);
    return false;
  }
}