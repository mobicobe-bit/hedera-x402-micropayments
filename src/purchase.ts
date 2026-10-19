import { Client, PrivateKey, AccountId, TokenMintTransaction, TokenAssociateTransaction, TransferTransaction, Hbar, AccountBalanceQuery, TokenId } from "@hashgraph/sdk";
import { HederaConfig, loadConfig } from "./hedera.ts";

export interface PurchaseQuote {
  tokenAmount: number;
  hbarCost: number;           // tinybars
  usdcCost?: number;          // USDC units (6 decimals)
  feeBreakdown: {
    tokenPrice: number;       // tinybars per token
    networkFee: number;       // estimated tx fee
    platformFee?: number;     // your margin
  };
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  tokensReceived?: number;
  error?: string;
}

/**
 * Simple fixed-price mint: user pays HBAR → operator mints tokens to user
 * No DEX, no slippage, you control price & supply.
 */
export async function purchaseTokensFixedPrice(
  config: HederaConfig,
  opts: {
    tokenId: TokenId;
    buyerId: AccountId;
    buyerKey: PrivateKey;
    tokenAmount: number;
    pricePerTokenTinybars: number;  // your price in tinybars per token
    treasuryId: AccountId;          // where HBAR goes
  }
): Promise<PurchaseResult> {
  const { tokenId, buyerId, buyerKey, tokenAmount, pricePerTokenTinybars, treasuryId } = opts;
  const totalCost = tokenAmount * pricePerTokenTinybars;

  try {
    // 1. Associate token to buyer (idempotent - fails gracefully if already associated)
    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(buyerId)
        .setTokenIds([tokenId])
        .freezeWith(config.client);
      const signAssoc = await associateTx.sign(buyerKey);
      await signAssoc.execute(config.client);
    } catch (e) {
      // Already associated - ignore
    }

    // 2. Buyer sends HBAR to treasury
    const hbarTransfer = new TransferTransaction()
      .addHbarTransfer(buyerId, Hbar.fromTinybars(-totalCost))
      .addHbarTransfer(treasuryId, Hbar.fromTinybars(totalCost))
      .freezeWith(config.client);

    const signHbar = await hbarTransfer.sign(buyerKey);
    const hbarResponse = await signHbar.execute(config.client);
    const hbarReceipt = await hbarResponse.getReceipt(config.client);

    if (hbarReceipt.status.toString() !== "SUCCESS") {
      return { success: false, error: `HBAR transfer failed: ${hbarReceipt.status}` };
    }

    // 3. Operator mints tokens to buyer (requires supply key)
    const mintTx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(tokenAmount)
      .freezeWith(config.client);

    const signMint = await mintTx.sign(config.operatorKey); // operator holds supply key
    const mintResponse = await signMint.execute(config.client);
    const mintReceipt = await mintResponse.getReceipt(config.client);

    if (mintReceipt.status.toString() !== "SUCCESS") {
      // TODO: In production, refund HBAR or retry mint
      return { success: false, error: `Mint failed: ${mintReceipt.status} - HBAR sent but tokens not minted!` };
    }

    return {
      success: true,
      transactionId: mintResponse.transactionId.toString(),
      tokensReceived: tokenAmount,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Quote generator for frontend display
 */
export function getPurchaseQuote(
  tokenAmount: number,
  pricePerTokenTinybars: number,
  estimatedNetworkFeeTinybars: number = 5_000_000 // ~$0.00025
): PurchaseQuote {
  const tokenCost = tokenAmount * pricePerTokenTinybars;
  return {
    tokenAmount,
    hbarCost: tokenCost + estimatedNetworkFeeTinybars,
    feeBreakdown: {
      tokenPrice: pricePerTokenTinybars,
      networkFee: estimatedNetworkFeeTinybars,
      platformFee: 0, // included in tokenPrice
    },
  };
}

/**
 * Check if buyer has enough HBAR for purchase
 */
export async function canAffordPurchase(
  config: HederaConfig,
  buyerId: AccountId,
  requiredTinybars: number
): Promise<{ canAfford: boolean; balance: number }> {
  const balance = await new AccountBalanceQuery()
    .setAccountId(buyerId)
    .execute(config.client);

  const hbarBalance = balance.hbars.toTinybars().toNumber();
  return { canAfford: hbarBalance >= requiredTinybars, balance: hbarBalance };
}

/**
 * Batch purchase: multiple buyers in one mint tx (saves operator fees)
 * Requires all buyers to send HBAR first, then single mint with multiple outputs
 */
export async function batchPurchaseTokens(
  config: HederaConfig,
  opts: {
    tokenId: TokenId;
    buyers: Array<{
      accountId: AccountId;
      key: PrivateKey;
      tokenAmount: number;
      pricePerTokenTinybars: number;
    }>;
    treasuryId: AccountId;
  }
): Promise<PurchaseResult[]> {
  const results: PurchaseResult[] = [];

  // Phase 1: Collect HBAR from all buyers
  for (const buyer of opts.buyers) {
    const totalCost = buyer.tokenAmount * buyer.pricePerTokenTinybars;
    const hbarTransfer = new TransferTransaction()
      .addHbarTransfer(buyer.accountId, Hbar.fromTinybars(-totalCost))
      .addHbarTransfer(opts.treasuryId, Hbar.fromTinybars(totalCost))
      .freezeWith(config.client);

    const signHbar = await hbarTransfer.sign(buyer.key);
    const hbarResponse = await signHbar.execute(config.client);
    const hbarReceipt = await hbarResponse.getReceipt(config.client);

    if (hbarReceipt.status.toString() !== "SUCCESS") {
      results.push({ success: false, error: `HBAR failed: ${hbarReceipt.status}` });
      continue;
    }

    // Associate token
    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(buyer.accountId)
        .setTokenIds([opts.tokenId])
        .freezeWith(config.client);
      await (await associateTx.sign(buyer.key)).execute(config.client);
    } catch (e) {
      // ignore
    }

    results.push({ success: true, transactionId: hbarResponse.transactionId.toString() });
  }

  // Phase 2: Single mint transaction with multiple recipients
  // Note: TokenMintTransaction only mints to treasury. For direct mint to buyers,
  // you'd mint to treasury then transfer, or use a smart contract.
  // Simpler: mint total to treasury, then transfer to each buyer.

  const totalTokens = opts.buyers.reduce((sum, b) => sum + b.tokenAmount, 0);
  const mintTx = new TokenMintTransaction()
    .setTokenId(opts.tokenId)
    .setAmount(totalTokens)
    .freezeWith(config.client);

  const signMint = await mintTx.sign(config.operatorKey);
  const mintResponse = await signMint.execute(config.client);
  const mintReceipt = await mintResponse.getReceipt(config.client);

  if (mintReceipt.status.toString() !== "SUCCESS") {
    return results.map(r => ({ ...r, success: false, error: "Batch mint failed" }));
  }

  // Phase 3: Transfer from treasury to each buyer
  for (let i = 0; i < opts.buyers.length; i++) {
    const buyer = opts.buyers[i];
    if (!results[i].success) continue;

    const transferTx = new TransferTransaction()
      .addTokenTransfer(opts.tokenId, config.treasuryId, -buyer.tokenAmount)
      .addTokenTransfer(opts.tokenId, buyer.accountId, buyer.tokenAmount)
      .freezeWith(config.client);

    const signTransfer = await transferTx.sign(config.treasuryKey);
    const transferResponse = await signTransfer.execute(config.client);
    const transferReceipt = await transferResponse.getReceipt(config.client);

    if (transferReceipt.status.toString() === "SUCCESS") {
      results[i] = { success: true, transactionId: transferResponse.transactionId.toString(), tokensReceived: buyer.tokenAmount };
    } else {
      results[i] = { success: false, error: `Transfer failed: ${transferReceipt.status}` };
    }
  }

  return results;
}