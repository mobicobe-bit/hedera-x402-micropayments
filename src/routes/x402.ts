import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { loadX402Config } from "../config/x402.ts";
import type { Context, Next } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter: 100 requests per day per wallet (adjust as needed)
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 86400,
});

// Rate limiting middleware
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

// Convert base units to dollar string for x402
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
  
  return c.json({
    x402Version: 2,
    seller: {
      name: "Hedera Micropayments API",
      description: "Pay-per-request Hedera data APIs via x402 on testnet",
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
      },
    ],
    networks: ["hedera:testnet"],
    assets: {
      hbar: { address: "0.0.0", decimals: 8, name: "HBAR" },
      usdc: { address: "0.0.429274", decimals: 6, name: "USDC (testnet)" },
    },
    facilitator: config.facilitatorUrl,
  });
}

// Health check (free)
export async function healthCheck(c: Context) {
  return c.json({ 
    status: "ok", 
    x402: true, 
    network: "hedera:testnet",
    timestamp: new Date().toISOString(),
  });
}