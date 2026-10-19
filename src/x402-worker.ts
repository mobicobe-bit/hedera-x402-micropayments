import { Hono } from "hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { loadX402Config } from "./config/x402.ts";
import type { Context, Next } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Custom scheme that preserves payTo in the 402 response
class HederaSchemeWithPayTo extends ExactHederaScheme {
  constructor(config = {}) {
    super(config);
  }

  async enrichPaymentRequiredResponse(context: any) {
    const { requirements } = context;
    return requirements.map((req: any) => ({
      ...req,
      payTo: req.payTo || req.extra?.payTo,
      extra: {
        ...req.extra,
        payTo: req.payTo || req.extra?.payTo
      }
    }));
  }

  async enhancePaymentRequirements(paymentRequirements: any, supportedKind: any, extensionKeys: any) {
    const base = await super.enhancePaymentRequirements(paymentRequirements, supportedKind, extensionKeys);
    return {
      ...base,
      payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo,
      extra: {
        ...base.extra,
        payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo
      }
    };
  }
}

const app = new Hono();

// Rate limiter: 100 requests per day per wallet
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 86400,
});

// Rate limiting middleware
app.use("*", async (c, next) => {
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
});

// CORS
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PAYMENT, PAYMENT-SIGNATURE, PAYMENT-REQUIRED");
  c.header("Access-Control-Expose-Headers", "PAYMENT-RESPONSE, X-PAYMENT-RESPONSE");
  if (c.req.method === "OPTIONS") {
    return c.newResponse(null, 204);
  }
  await next();
});

// Lazy-initialized x402 middleware
let x402MiddlewareInstance: ReturnType<typeof paymentMiddleware> | null = null;

function getX402Middleware(env?: any) {
  if (x402MiddlewareInstance) return x402MiddlewareInstance;

  const config = loadX402Config(env);
  const asset = "usdc";
  const network = config.assets[asset].network;
  const payTo = config.payToAddress;
  const basicPrice = priceToDollarString(config.pricing.basic, asset);
  const standardPrice = priceToDollarString(config.pricing.standard, asset);
  const premiumPrice = priceToDollarString(config.pricing.premium, asset);

  // Initialize facilitator and resource server
  const facilitator = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
  });

  const resourceServer = new x402ResourceServer(facilitator)
    .register("hedera:*", new (class extends ExactHederaScheme {
      constructor(config = {}) {
        super(config);
      }

      async enrichPaymentRequiredResponse(context: any) {
        const { requirements } = context;
        return requirements.map((req: any) => ({
          ...req,
          payTo: req.payTo || req.extra?.payTo,
          extra: {
            ...req.extra,
            payTo: req.payTo || req.extra?.payTo
          }
        }));
      }

      async enhancePaymentRequirements(paymentRequirements: any, supportedKind: any, extensionKeys: any) {
        const base = await super.enhancePaymentRequirements(paymentRequirements, supportedKind, extensionKeys);
        return {
          ...base,
          payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo,
          extra: {
            ...base.extra,
            payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo
          }
        };
      }
    })({
      defaultAssets: {
        "hedera:testnet": config.assets.usdc,
      },
    }));

  x402MiddlewareInstance = paymentMiddleware({
    "GET /api/v1/token/balances": {
      accepts: [{ scheme: "exact", price: basicPrice, network, payTo, extra: { payTo } }],
      description: "Query token balances for an account via mirror node",
    },
    "GET /api/v1/token/analytics/:tokenId": {
      accepts: [{ scheme: "exact", price: standardPrice, network, payTo, extra: { payTo } }],
      description: "Token analytics: holder distribution, velocity, top holders",
    },
    "GET /api/v1/compliance/screen/:accountId": {
      accepts: [{ scheme: "exact", price: premiumPrice, network, payTo, extra: { payTo } }],
      description: "Compliance screening: KYC/AML flags, sanctions check via HCS",
    },
  }, resourceServer, undefined, undefined, true);

  return x402MiddlewareInstance;
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

export default {
  fetch: (request: Request, env: any, ctx: any) => {
    return app.fetch(request, env, ctx);
  },
};