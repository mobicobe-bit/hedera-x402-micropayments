import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Client, PrivateKey, AccountId, TokenMintTransaction, Transaction, Hbar, TransferTransaction, AccountBalanceQuery, TokenId } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

interface Config {
  operatorId: AccountId;
  operatorKey: PrivateKey;
  treasuryId: AccountId;
  treasuryKey: PrivateKey;
  client: Client;
  port: number;
}

function loadConfig(): Config {
  const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY!);
  const treasuryId = AccountId.fromString(process.env.TREASURY_ID!);
  const treasuryKey = PrivateKey.fromStringECDSA(process.env.TREASURY_KEY!);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  return {
    operatorId,
    operatorKey,
    treasuryId,
    treasuryKey,
    client,
    port: parseInt(process.env.PORT || "3001"),
  };
}

const config = loadConfig();
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * POST /api/purchase
 * 
 * Receives signed HBAR transfer from frontend, submits it,
 * then mints tokens to buyer on success.
 * 
 * Request body:
 * {
 *   signedTransaction: string (base64 encoded signed Transaction),
 *   tokenId: string (e.g. "0.0.123456"),
 *   tokenAmount: number,
 *   buyerAccountId: string (e.g. "0.0.789012")
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   hbarTxId?: string,
 *   mintTxId?: string,
 *   tokensReceived?: number,
 *   error?: string
 * }
 */
app.post("/api/purchase", async (req: Request, res: Response) => {
  try {
    const { signedTransaction, tokenId, tokenAmount, buyerAccountId } = req.body;

    // Validate input
    if (!signedTransaction || !tokenId || !tokenAmount || !buyerAccountId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: signedTransaction, tokenId, tokenAmount, buyerAccountId",
      });
    }

    if (typeof tokenAmount !== "number" || tokenAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "tokenAmount must be a positive number",
      });
    }

    console.log(`Processing purchase: ${tokenAmount} tokens for ${buyerAccountId}`);

    // 1. Deserialize and submit the signed HBAR transfer transaction
    const signedTxBytes = Buffer.from(signedTransaction, "base64");
    const transaction = Transaction.fromBytes(signedTxBytes);

    console.log("Submitting HBAR transfer to network...");
    const hbarResponse = await transaction.execute(config.client);
    const hbarReceipt = await hbarResponse.getReceipt(config.client);

    if (hbarReceipt.status.toString() !== "SUCCESS") {
      console.error(`HBAR transfer failed: ${hbarReceipt.status}`);
      return res.status(400).json({
        success: false,
        error: `HBAR transfer failed: ${hbarReceipt.status}`,
        hbarTxId: hbarResponse.transactionId.toString(),
      });
    }

    const hbarTxId = hbarResponse.transactionId.toString();
    console.log(`✅ HBAR transfer successful: ${hbarTxId}`);

    // 2. Mint tokens to buyer (requires supply key - held by operator)
    console.log(`Minting ${tokenAmount} tokens to ${buyerAccountId}...`);
    
    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .setAmount(tokenAmount)
      .freezeWith(config.client);

    const signMint = await mintTx.sign(config.operatorKey);
    const mintResponse = await signMint.execute(config.client);
    const mintReceipt = await mintResponse.getReceipt(config.client);

    if (mintReceipt.status.toString() !== "SUCCESS") {
      console.error(`Mint failed: ${mintReceipt.status}`);
      // NOTE: In production, you'd want to compensate/refund the HBAR
      // This is a critical failure - HBAR was received but tokens not minted
      return res.status(500).json({
        success: false,
        error: `Mint failed: ${mintReceipt.status} - HBAR received but tokens NOT minted! Manual intervention required.`,
        hbarTxId,
      });
    }

    const mintTxId = mintResponse.transactionId.toString();
    console.log(`✅ Mint successful: ${mintTxId}`);

    // 3. Verify buyer received tokens (optional but good for confirmation)
    const buyerId = AccountId.fromString(buyerAccountId);
    const balance = await new AccountBalanceQuery()
      .setAccountId(buyerId)
      .execute(config.client);
    
    const tokenBalance = balance.tokens.get(tokenId) || 0;
    console.log(`Buyer ${buyerAccountId} now has ${tokenBalance} tokens`);

    // 4. Return success
    res.json({
      success: true,
      hbarTxId,
      mintTxId,
      tokensReceived: tokenAmount,
      buyerTokenBalance: tokenBalance,
    });

  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/quote
 * 
 * Returns a quote for purchasing tokens (no wallet interaction needed)
 * 
 * Request body:
 * {
 *   tokenAmount: number
 * }
 * 
 * Response:
 * {
 *   tokenAmount: number,
 *   hbarCost: number (tinybars),
 *   feeBreakdown: { tokenPrice, networkFee }
 * }
 */
app.post("/api/quote", async (req: Request, res: Response) => {
  try {
    const { tokenAmount } = req.body;
    
    if (!tokenAmount || typeof tokenAmount !== "number" || tokenAmount <= 0) {
      return res.status(400).json({ error: "tokenAmount must be a positive number" });
    }

    // Price configuration (in production, fetch from config/database)
    const PRICE_PER_TOKEN_TINYBARS = parseInt(process.env.PRICE_PER_TOKEN_TINYBARS || "1000");
    const ESTIMATED_NETWORK_FEE_TINYBARS = 5_000_000; // ~$0.00025

    const tokenCost = tokenAmount * PRICE_PER_TOKEN_TINYBARS;
    const totalCost = tokenCost + ESTIMATED_NETWORK_FEE_TINYBARS;

    res.json({
      tokenAmount,
      hbarCost: totalCost,
      feeBreakdown: {
        tokenPrice: PRICE_PER_TOKEN_TINYBARS,
        networkFee: ESTIMATED_NETWORK_FEE_TINYBARS,
        platformFee: 0, // included in tokenPrice
      },
    });
  } catch (error) {
    console.error("Quote error:", error);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

/**
 * GET /api/token/:tokenId/balance/:accountId
 * 
 * Check token balance for an account (via mirror node REST API - free, no HBAR cost)
 */
app.get("/api/token/:tokenId/balance/:accountId", async (req: Request, res: Response) => {
  try {
    const { tokenId, accountId } = req.params;
    
    // Use mirror node REST API directly for free balance reads
    // Eventually consistent (~1-3s lag), but no HBAR cost
    const mirrorNodeUrl = process.env.MIRROR_NODE || "https://testnet.mirrornode.hedera.com";
    const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`);
    
    if (!response.ok) {
      throw new Error(`Mirror node error: ${response.status}`);
    }
    
    const data = await response.json() as { tokens?: Array<{ balance: number }> };
    const tokenInfo = data.tokens?.[0];
    const tokenBalance = tokenInfo?.balance || 0;
    
    // Also get HBAR balance from mirror node
    const hbarResponse = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
    const hbarData = await hbarResponse.json() as { balance?: { balance: number } };
    const hbarBalance = hbarData.balance?.balance || 0;
    
    res.json({
      accountId,
      tokenId,
      tokenBalance,
      hbarBalanceTinybars: hbarBalance,
      hbarBalance: hbarBalance / 100_000_000,
      source: "mirror-node-rest" // indicates eventual consistency, free
    });
  } catch (error) {
    console.error("Balance check error:", error);
    res.status(500).json({ error: "Failed to check balance" });
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(config.port, () => {
  console.log(`🚀 Backend running on http://localhost:${config.port}`);
  console.log(`   Health: http://localhost:${config.port}/health`);
  console.log(`   Purchase: POST http://localhost:${config.port}/api/purchase`);
  console.log(`   Quote: POST http://localhost:${config.port}/api/quote`);
  console.log(`   Balance: GET http://localhost:${config.port}/api/token/:tokenId/balance/:accountId`);
});

export { app, config };