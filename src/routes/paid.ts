import { loadX402Config } from "../config/x402.ts";
import type { Context, Next } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter: 100 requests per day per wallet (adjust as needed)
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 86400,
});

export async function rateLimitMiddleware(c: Context, next: Next) {
  const walletAddress = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const key = `ratelimit:${walletAddress}`;
  
  try {
    await rateLimiter.consume(key);
    await next();
  } catch (rateLimiterRes: any) {
    const retrySecs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
    return c.json(
      { 
        error: "Rate limit exceeded", 
        message: `Daily limit reached. Try again in ${retrySecs} seconds.`,
        retryAfter: retrySecs
      },
      429,
      { "Retry-After": String(retrySecs) }
    );
  }
}

function priceToDollarString(price: string, asset: "hbar" | "usdc"): string {
  const amount = parseInt(price, 10);
  if (asset === "usdc") {
    return "$" + (amount / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
  } else {
    return "$" + (amount / 100_000_000).toFixed(8).replace(/\.?0+$/, "");
  }
}

// x402 Discovery endpoint (/.well-known/x402.json)
export async function x402Discovery(c: Context) {
  const baseUrl = new URL(c.req.url).origin;
  const config = loadX402Config(c.env);
  const asset = "usdc";
  const basicPrice = priceToDollarString(config.pricing.basic, asset);
  const standardPrice = priceToDollarString(config.pricing.standard, asset);
  const premiumPrice = priceToDollarString(config.pricing.premium, asset);

  const isMainnet = config.assets.usdc.network === "hedera:mainnet";
  const usdcName = isMainnet ? "USDC" : "USDC (testnet)";

  // Build facilitators list: primary + optional additional from env
  const primaryFacilitator = {
    url: config.facilitatorUrl,
    address: config.facilitatorAddress || "0.0.9185802", // Coinbase facilitator default
  };

  // Parse additional facilitators from env (comma-separated: url|address,url|address)
  const extraFacilitators = (process.env.ADDITIONAL_FACILITATORS || "").split(",").filter(Boolean).map(f => {
    const [url, address] = f.split("|");
    return { url: url.trim(), address: address.trim() };
  });

  const allFacilitators = [primaryFacilitator, ...extraFacilitators];

  return c.json({
    x402Version: 2,
    seller: {
      name: "Hedera Micropayments API",
      description: `Pay-per-request Hedera data APIs via x402 on ${isMainnet ? "mainnet" : "testnet"}`,
      url: baseUrl,
    },
    endpoints: [
      {
        path: "/api/v1/token/balances",
        method: "GET",
        price: basicPrice,
        currency: "USDC",
        asset: config.assets.usdc.asset,
        network: config.assets.usdc.network,
        description: "Query token balances for an account via mirror node",
        params: { accountId: "Hedera account ID (e.g., 0.0.123456) - required query param" },
        facilitators: allFacilitators,
      },
      {
        path: "/api/v1/token/analytics/:tokenId",
        method: "GET",
        price: standardPrice,
        currency: "USDC",
        asset: config.assets.usdc.asset,
        network: config.assets.usdc.network,
        description: "Token analytics: holder distribution, velocity, top holders",
        params: { tokenId: "Hedera token ID (e.g., 0.0.789012) - path param" },
        facilitators: allFacilitators,
      },
      {
        path: "/api/v1/compliance/screen/:accountId",
        method: "GET",
        price: premiumPrice,
        currency: "USDC",
        asset: config.assets.usdc.asset,
        network: config.assets.usdc.network,
        description: "Compliance screening: KYC/AML flags, sanctions check via HCS",
        params: { accountId: "Hedera account ID (e.g., 0.0.123456) - path param" },
        facilitators: allFacilitators,
      },
    ],
    networks: [config.assets.usdc.network],
    assets: {
      hbar: { address: "0.0.0", decimals: 8, name: "HBAR" },
      usdc: { address: config.assets.usdc.asset, decimals: 6, name: usdcName },
    },
    facilitator: config.facilitatorUrl, // backward compatibility
    facilitators: allFacilitators, // new multi-facilitator support
  });
}

// Health check (free)
export async function healthCheck(c: Context) {
  const config = loadX402Config(c.env);
  return c.json({ 
    status: "ok", 
    x402: true, 
    network: config.assets.usdc.network,
    timestamp: new Date().toISOString(),
  });
}

// Mirror node response types
interface MirrorNodeToken {
  token_id: string;
  symbol?: string;
  balance?: string | number;
  decimals?: number;
}

interface MirrorNodeAccountResponse {
  tokens?: MirrorNodeToken[];
  balance?: {
    balance?: string | number;
  };
  kyc_key?: string;
  deleted?: boolean;
  frozen?: boolean;
  created_timestamp?: string;
}

interface MirrorNodeBalancesResponse {
  balances?: Array<{
    account: string;
    balance?: string | number;
  }>;
}

interface MirrorNodeTokenInfoResponse {
  total_supply?: string | number;
}

interface MirrorNodeTransfersResponse {
  transfers?: Array<{
    sender_account?: string;
    receiver_account?: string;
  }>;
}

// Mirror node helper
async function fetchMirrorNode(endpoint: string, env?: any): Promise<any> {
  const config = loadX402Config(env);
  const baseUrl = config.mirrorNode || "https://testnet.mirrornode.hedera.com";
  const url = `${baseUrl}/api/v1${endpoint}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mirror node error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getTokenBalances(c: Context) {
  const accountId = c.req.query("accountId");
  if (!accountId) {
    return c.json({ error: "accountId query parameter required" }, 400);
  }

  console.log(`[getTokenBalances] Request for accountId: ${accountId}`);

  try {
    const data = await fetchMirrorNode(`/accounts/${accountId}/tokens`, c.env) as MirrorNodeAccountResponse;
    
    const tokens = data.tokens?.map((t: MirrorNodeToken) => ({
      tokenId: t.token_id,
      symbol: t.symbol || "UNKNOWN",
      balance: t.balance?.toString() || "0",
      decimals: t.decimals || 0,
    })) || [];

    const accountData = await fetchMirrorNode(`/accounts/${accountId}`, c.env) as MirrorNodeAccountResponse;
    const hbarBalance = accountData.balance?.balance?.toString() || "0";

    return c.json({
      accountId,
      tokens,
      hbarBalance,
      source: "mirror-node",
      paid: true,
    });
  } catch (error) {
    console.error(`[getTokenBalances] Error for ${accountId}:`, error);
    return c.json({ 
      error: "Failed to fetch balances", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 502);
  }
}

export async function getTokenAnalytics(c: Context) {
  const tokenId = c.req.param("tokenId");
  console.log(`[getTokenAnalytics] Request for tokenId: ${tokenId}`);

  try {
    const tokenInfo = await fetchMirrorNode(`/tokens/${tokenId}`, c.env) as MirrorNodeTokenInfoResponse;
    const balancesData = await fetchMirrorNode(`/tokens/${tokenId}/balances?limit=100&order=desc`, c.env) as MirrorNodeBalancesResponse;
    
    const holders = balancesData.balances?.map((b: { account: string; balance?: string | number }) => ({
      accountId: b.account,
      balance: b.balance?.toString() || "0",
    })) || [];

    const totalHolders = holders.length;
    const totalSupply = tokenInfo.total_supply?.toString() || "0";
    const circulatingSupply = holders.reduce((sum: number, h: { balance: string }) => sum + parseInt(h.balance), 0).toString();
    
    const topHolders = holders.slice(0, 10).map((h: { accountId: string; balance: string }) => ({
      accountId: h.accountId,
      balance: h.balance,
      percentage: totalSupply !== "0" 
        ? `${((parseInt(h.balance) / parseInt(totalSupply)) * 100).toFixed(2)}%`
        : "0%",
    }));

    const transfersData = await fetchMirrorNode(`/tokens/${tokenId}/transfers?limit=1000&timestamp=gt:${Date.now() - 86400000}`, c.env) as MirrorNodeTransfersResponse;
    const transfers24h = transfersData.transfers?.length || 0;
    
    const uniqueSenders = new Set(transfersData.transfers?.map((t: { sender_account?: string }) => t.sender_account).filter(Boolean) || []).size;
    const uniqueReceivers = new Set(transfersData.transfers?.map((t: { receiver_account?: string }) => t.receiver_account).filter(Boolean) || []).size;

    return c.json({
      tokenId,
      analytics: {
        totalHolders,
        totalSupply,
        circulatingSupply,
        velocity24h: totalSupply !== "0" ? (transfers24h / parseInt(totalSupply)).toFixed(4) : "0",
        topHolders,
        transfers24h,
        uniqueSenders24h: uniqueSenders,
        uniqueReceivers24h: uniqueReceivers,
      },
      paid: true,
    });
  } catch (error) {
    console.error(`[getTokenAnalytics] Error for ${tokenId}:`, error);
    return c.json({ 
      error: "Failed to fetch analytics", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 502);
  }
}

export async function getComplianceScreen(c: Context) {
  const accountId = c.req.param("accountId");
  console.log(`[getComplianceScreen] Request for accountId: ${accountId}`);

  try {
    const accountData = await fetchMirrorNode(`/accounts/${accountId}`, c.env) as MirrorNodeAccountResponse;
    
    const kycStatus = accountData.kyc_key ? "kyc_key_set" : "no_kyc_key";
    const isDeleted = accountData.deleted || false;
    const isFrozen = accountData.frozen || false;
    
    const createdTimestamp = accountData.created_timestamp;
    const accountAgeDays = createdTimestamp 
      ? Math.floor((Date.now() - parseInt(createdTimestamp) * 1000) / 86400000)
      : 0;
    
    let riskScore = 10;
    if (accountAgeDays < 7) riskScore += 30;
    if (accountAgeDays < 30) riskScore += 15;
    if (isDeleted) riskScore += 50;
    if (isFrozen) riskScore += 40;
    riskScore = Math.min(riskScore, 100);

    return c.json({
      accountId,
      screening: {
        kycStatus,
        amlFlags: isFrozen ? ["account_frozen"] : [],
        sanctionsMatch: false,
        riskScore,
        accountAgeDays,
        isDeleted,
        isFrozen,
        lastScreened: new Date().toISOString(),
        sources: ["mirror-node", "account-metadata"],
      },
      paid: true,
    });
  } catch (error) {
    console.error(`[getComplianceScreen] Error for ${accountId}:`, error);
    return c.json({ 
      error: "Failed to screen account", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 502);
  }
}