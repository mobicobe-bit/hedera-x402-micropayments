import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { MiddlewareHandler, Env } from "hono";

import { x402Discovery, healthCheck, getTokenBalances, getTokenAnalytics, getComplianceScreen, rateLimitMiddleware } from "./routes/paid.ts";
import { createX402Middleware } from "./x402-middleware-factory.ts";
import { loadX402Config } from "./config/x402.ts";

const app = new Hono<{ Bindings: Record<string, string> }>();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-PAYMENT", "PAYMENT-SIGNATURE", "PAYMENT-REQUIRED"],
  exposeHeaders: ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE"],
}));

// Rate limiting (applies to all routes)
app.use("*", rateLimitMiddleware);

// x402 payment middleware (applies to protected routes) - lazy initialized
let x402MiddlewareInstance: MiddlewareHandler | null = null;

function priceToDollarString(price: string, asset: "hbar" | "usdc"): string {
  const amount = parseInt(price, 10);
  if (asset === "usdc") {
    return "$" + (amount / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
  } else {
    return "$" + (amount / 100_000_000).toFixed(8).replace(/\.?0+$/, "");
  }
}

app.use("/api/v1/*", async (c, next) => {
  console.log(`[MIDDLEWARE] ${c.req.method} ${c.req.path} - starting x402 middleware`);
  await next();
  console.log(`[MIDDLEWARE] ${c.req.method} ${c.req.path} - finished`);
});
app.use("/api/v1/*", async (c, next) => {
  if (!x402MiddlewareInstance) {
    const config = loadX402Config(c.env);
    const dashboardUrl = c.env.DASHBOARD_URL || `http://localhost:${c.env.DASHBOARD_PORT || 3002}`;
    x402MiddlewareInstance = await createX402Middleware(c.env, config, priceToDollarString, dashboardUrl);
  }
  return x402MiddlewareInstance(c, next);
});

// Free endpoints
app.get("/", healthCheck);
app.get("/health", healthCheck);

// x402 Discovery (well-known endpoint)
app.get("/.well-known/x402.json", x402Discovery);

// Paid API endpoints
app.get("/api/v1/token/balances", getTokenBalances);
app.get("/api/v1/token/analytics/:tokenId", getTokenAnalytics);
app.get("/api/v1/compliance/screen/:accountId", getComplianceScreen);

// 404 handler
app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

// Error handler
app.onError((err: Error, c) => {
  console.error("Server error:", err);
  console.error("Stack:", err.stack);
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

export default {
  fetch: (request: Request, env: any, ctx: any) => {
    return app.fetch(request, env, ctx);
  },
};