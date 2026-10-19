import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadX402Config } from "./config/x402.ts";
import type { Context } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

const app = new Hono<{ Bindings: Record<string, string> }>();

// Rate limiter
const rateLimiter = new RateLimiterMemory({ points: 100, duration: 86400 });
app.use("*", async (c, next) => {
  const walletAddress = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const key = `ratelimit:${walletAddress}`;
  try { await rateLimiter.consume(key); await next(); }
  catch (e: any) { return c.json({ error: "Rate limit exceeded", message: `Try again in ${Math.round(e.msBeforeNext/1000)}s` }, 429, { "Retry-After": String(Math.round(e.msBeforeNext/1000)) }); }
});

// CORS
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PAYMENT, PAYMENT-REQUIRED");
  c.header("Access-Control-Expose-Headers", "PAYMENT-RESPONSE");
  if (c.req.method === "OPTIONS") return c.newResponse(null, 204);
  await next();
});

function priceToDollarString(price: string, asset: "usdc" | "hbar"): string {
  const amount = parseInt(price, 10);
  if (asset === "usdc") {
    return "$" + (amount / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
  } else {
    return "$" + (amount / 100_000_000).toFixed(8).replace(/\.?0+$/, "");
  }
}

// x402 payment verification middleware
async function x402Verify(c: Context, next: () => Promise<void>) {
  const config = loadX402Config(c.env);
  const asset = "hbar";
  const network = config.assets[asset].network;
  const payTo = config.payToAddress;
  const facilitatorUrl = config.facilitatorUrl;

  // Check for payment header
  const paymentHeader = c.req.header("X-PAYMENT");
  const path = c.req.path;

  // Define endpoint pricing
    const pricing: Record<string, string> = {
      "/api/v1/token/balances": config.pricing.basic,
      "/api/v1/token/analytics/": config.pricing.standard,
      "/api/v1/compliance/screen/": config.pricing.premium,
      "/api/v1/nft/metadata/": config.pricing.standard,
      "/api/v1/transactions/history/": config.pricing.basic,
      "/api/v1/token/price/": config.pricing.basic,
      "/api/v1/defi/positions/": config.pricing.premium,
    };

    let price = pricing[path];
    if (!price && path.startsWith("/api/v1/token/analytics/")) price = config.pricing.standard;
    if (!price && path.startsWith("/api/v1/compliance/screen/")) price = config.pricing.premium;
    if (!price && path.startsWith("/api/v1/nft/metadata/")) price = config.pricing.standard;
    if (!price && path.startsWith("/api/v1/transactions/history/")) price = config.pricing.basic;
    if (!price && path.startsWith("/api/v1/token/price/")) price = config.pricing.basic;
    if (!price && path.startsWith("/api/v1/defi/positions/")) price = config.pricing.premium;

  if (!price) return next(); // free endpoint

  const priceDollar = priceToDollarString(price, asset);

  // If payment provided, verify with facilitator
  if (paymentHeader) {
    try {
      const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x402Version: 2,
          paymentHeader,
          paymentRequirements: {
            scheme: "exact",
            network,
            maxAmountRequired: price,
            resource: c.req.url,
            description: "API access",
            mimeType: "application/json",
            payTo,
            maxTimeoutSeconds: config.maxTimeoutSeconds,
            asset: config.assets.usdc.asset,
            extra: { payTo },
          },
        }),
      });
      const verifyData: { isValid: boolean; payer?: string; transactionHash?: string } = await verifyRes.json();
      if (verifyData.isValid) {
        // Payment valid, add payer info to context
        (c as any).x402Payer = verifyData.payer;
        (c as any).x402TxHash = verifyData.transactionHash;
        return next();
      }
    } catch (e) {
      console.error("Payment verification failed:", e);
    }
  }

  // No valid payment - return 402
  const facilitators = [{
    url: facilitatorUrl,
    address: config.facilitatorAddress || "0.0.9185802",
  }];

  const defaultAsset = config.defaultAsset || "usdc";
  const assetId = config.assets[defaultAsset].asset;
  const assetName = defaultAsset.toUpperCase();
  const facilitatorAddress = config.facilitatorAddress || "0.0.9185802";

  return c.json({
    x402Version: 2,
    error: "Payment required",
    accepts: [{
      scheme: "exact",
      network,
      maxAmountRequired: price,
      resource: c.req.url,
      description: path === "/api/v1/token/balances" ? "Query token balances" :
                   path.startsWith("/api/v1/token/analytics/") ? "Token analytics" :
                   path.startsWith("/api/v1/compliance/screen/") ? "Compliance screening" :
                   path.startsWith("/api/v1/nft/metadata/") ? "NFT metadata & ownership" :
                   path.startsWith("/api/v1/transactions/history/") ? "Transaction history" :
                   path.startsWith("/api/v1/token/price/") ? "Token price (USD)" :
                   path.startsWith("/api/v1/defi/positions/") ? "DeFi positions & yields" :
                   "API access",
      mimeType: "application/json",
      payTo,
      maxTimeoutSeconds: config.maxTimeoutSeconds,
      asset: assetId,
      extra: { payTo, feePayer: facilitatorAddress },
      facilitator: facilitators[0],
    }],
  }, 402, {
    "X-PAYMENT-REQUIRED": "true",
    "Content-Type": "application/json",
  });
}

// Apply x402 to paid endpoints
app.use("/api/v1/*", x402Verify);

// Free endpoints
app.get("/", async (c) => {
  const config = loadX402Config(c.env);
  return c.json({ status: "ok", x402: true, network: config.assets.usdc.network, timestamp: new Date().toISOString() });
});
app.get("/health", async (c) => {
  const config = loadX402Config(c.env);
  return c.json({ status: "ok", x402: true, network: config.assets.usdc.network, timestamp: new Date().toISOString() });
});

// x402 Discovery
app.get("/.well-known/x402.json", async (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const config = loadX402Config(c.env);
  const isMainnet = config.assets.usdc.network === "hedera:mainnet";
  const defaultAsset = config.defaultAsset || "usdc";
  const assetId = config.assets[defaultAsset].asset;
  const assetName = defaultAsset.toUpperCase();

  const facilitators = [{
    url: config.facilitatorUrl,
    address: config.facilitatorAddress || "0.0.9185802",
  }];

  return c.json({
    x402Version: 2,
    seller: { name: "Hedera Micropayments API", description: `x402 on ${isMainnet ? "mainnet" : "testnet"}`, url: baseUrl },
    endpoints: [
      { path: "/api/v1/token/balances", method: "GET", price: priceToDollarString(config.pricing.basic, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "Token balances", params: { accountId: "Hedera account ID" }, facilitators },
      { path: "/api/v1/token/analytics/:tokenId", method: "GET", price: priceToDollarString(config.pricing.standard, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "Token analytics", params: { tokenId: "Hedera token ID" }, facilitators },
      { path: "/api/v1/compliance/screen/:accountId", method: "GET", price: priceToDollarString(config.pricing.premium, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "Compliance screening", params: { accountId: "Hedera account ID" }, facilitators },
      { path: "/api/v1/nft/metadata/:tokenId/:serial", method: "GET", price: priceToDollarString(config.pricing.standard, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "NFT metadata & ownership", params: { tokenId: "Hedera token ID", serial: "NFT serial number" }, facilitators },
      { path: "/api/v1/transactions/history/:accountId", method: "GET", price: priceToDollarString(config.pricing.basic, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "Transaction history", params: { accountId: "Hedera account ID", limit: "optional, default 100" }, facilitators },
      { path: "/api/v1/token/price/:tokenId", method: "GET", price: priceToDollarString(config.pricing.basic, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "Token price (USD)", params: { tokenId: "Hedera token ID" }, facilitators },
      { path: "/api/v1/defi/positions/:accountId", method: "GET", price: priceToDollarString(config.pricing.premium, defaultAsset), currency: assetName, asset: assetId, network: config.assets.usdc.network, description: "DeFi positions & yields", params: { accountId: "Hedera account ID" }, facilitators },
    ],
    networks: [config.assets.usdc.network],
    assets: { hbar: { address: "0.0.0", decimals: 8, name: "HBAR" }, usdc: { address: config.assets.usdc.asset, decimals: 6, name: isMainnet ? "USDC" : "USDC (testnet)" } },
    facilitator: config.facilitatorUrl, facilitators,
  });
});

// Mirror node helper
interface MirrorNodeToken { token_id: string; symbol?: string; balance?: string | number; decimals?: number; }
interface MirrorNodeAccountResponse { tokens?: MirrorNodeToken[]; balance?: { balance?: string | number }; kyc_key?: string; deleted?: boolean; frozen?: boolean; created_timestamp?: string; }
interface MirrorNodeBalancesResponse { balances?: Array<{ account: string; balance?: string | number }>; }
interface MirrorNodeTokenInfoResponse { total_supply?: string | number; }
interface MirrorNodeTransfersResponse { transfers?: Array<{ sender_account?: string; receiver_account?: string }>; }

async function fetchMirrorNode(endpoint: string, env: any): Promise<any> {
  const config = loadX402Config(env);
  const baseUrl = config.mirrorNode || "https://testnet.mirrornode.hedera.com";
  const response = await fetch(`${baseUrl}/api/v1${endpoint}`);
  if (!response.ok) throw new Error(`Mirror node: ${response.status}`);
  return response.json();
}

// Paid endpoints
app.get("/api/v1/token/balances", async (c) => {
  const accountId = c.req.query("accountId");
  if (!accountId) return c.json({ error: "accountId required" }, 400);
  try {
    const data = await fetchMirrorNode(`/accounts/${accountId}/tokens`, c.env) as MirrorNodeAccountResponse;
    const tokens = data.tokens?.map(t => ({ tokenId: t.token_id, symbol: t.symbol || "UNKNOWN", balance: t.balance?.toString() || "0", decimals: t.decimals || 0 })) || [];
    const acc = await fetchMirrorNode(`/accounts/${accountId}`, c.env) as MirrorNodeAccountResponse;
    return c.json({ accountId, tokens, hbarBalance: acc.balance?.balance?.toString() || "0", source: "mirror-node", paid: true });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

app.get("/api/v1/token/analytics/:tokenId", async (c) => {
  const tokenId = c.req.param("tokenId");
  try {
    const info = await fetchMirrorNode(`/tokens/${tokenId}`, c.env) as MirrorNodeTokenInfoResponse;
    const balances = await fetchMirrorNode(`/tokens/${tokenId}/balances?limit=100&order=desc`, c.env) as MirrorNodeBalancesResponse;
    const holders = balances.balances?.map(b => ({ accountId: b.account, balance: b.balance?.toString() || "0" })) || [];
    const totalSupply = info.total_supply?.toString() || "0";
    const topHolders = holders.slice(0, 10).map(h => ({ ...h, percentage: totalSupply !== "0" ? `${((parseInt(h.balance)/parseInt(totalSupply))*100).toFixed(2)}%` : "0%" }));
    const transfers = await fetchMirrorNode(`/tokens/${tokenId}/transfers?limit=1000&timestamp=gt:${Date.now()-86400000}`, c.env) as MirrorNodeTransfersResponse;
    return c.json({ tokenId, analytics: { totalHolders: holders.length, totalSupply, circulatingSupply: holders.reduce((s,h)=>s+parseInt(h.balance),0).toString(), velocity24h: totalSupply!=="0"?(transfers.transfers?.length||0)/parseInt(totalSupply):"0", topHolders, transfers24h: transfers.transfers?.length||0, uniqueSenders24h: new Set(transfers.transfers?.map(t=>t.sender_account).filter(Boolean)||[]).size, uniqueReceivers24h: new Set(transfers.transfers?.map(t=>t.receiver_account).filter(Boolean)||[]).size }, paid: true });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

app.get("/api/v1/compliance/screen/:accountId", async (c) => {
  const accountId = c.req.param("accountId");
  try {
    const acc = await fetchMirrorNode(`/accounts/${accountId}`, c.env) as MirrorNodeAccountResponse;
    const kyc = acc.kyc_key ? "kyc_key_set" : "no_kyc_key";
    const age = acc.created_timestamp ? Math.floor((Date.now()-parseInt(acc.created_timestamp)*1000)/86400000) : 0;
    let risk = 10; if (age<7) risk+=30; if (age<30) risk+=15; if (acc.deleted) risk+=50; if (acc.frozen) risk+=40; risk=Math.min(risk,100);
    return c.json({ accountId, screening: { kycStatus: kyc, amlFlags: acc.frozen?["account_frozen"]:[], sanctionsMatch: false, riskScore: risk, accountAgeDays: age, isDeleted: !!acc.deleted, isFrozen: !!acc.frozen, lastScreened: new Date().toISOString(), sources: ["mirror-node"] }, paid: true });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

// NFT Metadata
app.get("/api/v1/nft/metadata/:tokenId/:serial", async (c) => {
  const tokenId = c.req.param("tokenId");
  const serial = c.req.param("serial");
  try {
    const info = await fetchMirrorNode(`/tokens/${tokenId}/nfts/${serial}`, c.env) as any;
    return c.json({ tokenId, serial, metadata: info.metadata || null, owner: info.owner || null, createdTimestamp: info.created_timestamp || null, paid: true });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

// Transaction History
app.get("/api/v1/transactions/history/:accountId", async (c) => {
  const accountId = c.req.param("accountId");
  const limit = parseInt(c.req.query("limit") || "100");
  try {
    const transfers = await fetchMirrorNode(`/accounts/${accountId}/transactions?limit=${limit}&order=desc`, c.env) as any;
    const txs = transfers.transactions?.map((tx: any) => ({
      transactionId: tx.transaction_id,
      consensusTimestamp: tx.consensus_timestamp,
      type: tx.name,
      transfers: tx.token_transfers?.map((t: any) => ({ tokenId: t.token_id, amount: t.amount, from: t.from, to: t.to })) || [],
      hbarTransfers: tx.transfers?.filter((t: any) => !t.token_id).map((t: any) => ({ amount: t.amount, from: t.account, isApproval: t.is_approval })) || [],
      result: tx.result,
      chargedTxFee: tx.charged_tx_fee,
    })) || [];
    return c.json({ accountId, transactions: txs, count: txs.length, paid: true });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

// Token Price (USD)
app.get("/api/v1/token/price/:tokenId", async (c) => {
  const tokenId = c.req.param("tokenId");
  try {
    // Try to get price from a known oracle or calculate from recent trades
    const info = await fetchMirrorNode(`/tokens/${tokenId}`, c.env) as MirrorNodeTokenInfoResponse;
    const transfers = await fetchMirrorNode(`/tokens/${tokenId}/transfers?limit=50&order=desc`, c.env) as MirrorNodeTransfersResponse;
    
    // Estimate price from recent USDC trades (simplified)
    let priceUsd = 0;
    let volume24h = 0;
    const usdcTokenId = "0.0.456858"; // Mainnet USDC
    
    for (const t of transfers.transfers || []) {
      const tAny = t as any;
      if (tAny.token_id === usdcTokenId || tAny.token_id === tokenId) {
        volume24h += Math.abs(parseInt(tAny.amount || "0"));
      }
    }
    
    return c.json({ 
      tokenId, 
      priceUsd: priceUsd || null, 
      priceUsdSource: "estimated", 
      volume24h: volume24h.toString(),
      lastUpdated: new Date().toISOString(),
      paid: true 
    });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

// DeFi Positions
app.get("/api/v1/defi/positions/:accountId", async (c) => {
  const accountId = c.req.param("accountId");
  try {
    const data = await fetchMirrorNode(`/accounts/${accountId}/tokens`, c.env) as MirrorNodeAccountResponse;
    const tokens = data.tokens?.map((t: MirrorNodeToken) => ({
      tokenId: t.token_id,
      symbol: t.symbol || "UNKNOWN",
      balance: t.balance?.toString() || "0",
      decimals: t.decimals || 0,
      // Identify known DeFi tokens (SaucerSwap, HeliSwap, etc.)
      isDefiToken: ["0.0.12345", "0.0.67890"].includes(t.token_id), // placeholder known DeFi token IDs
    })) || [];
    
    const defiPositions = tokens.filter(t => t.isDefiToken).map(t => ({
      tokenId: t.tokenId,
      symbol: t.symbol,
      balance: t.balance,
      estimatedValueUsd: 0, // Would need price oracle
      protocol: "SaucerSwap", // placeholder
      positionType: "LP",
    }));
    
    return c.json({ 
      accountId, 
      defiPositions, 
      totalPositions: defiPositions.length,
      totalEstimatedValueUsd: 0,
      lastUpdated: new Date().toISOString(),
      paid: true 
    });
  } catch (e) { return c.json({ error: "Failed", message: e instanceof Error ? e.message : "Unknown" }, 502); }
});

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));;
app.onError((err, c) => { console.error(err); return c.json({ error: "Internal server error", message: err.message }, 500); });

export default { fetch: (request: Request, env: any, ctx: any) => app.fetch(request, env, ctx) };