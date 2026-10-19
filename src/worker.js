import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { x402Discovery, healthCheck, getTokenBalances, getTokenAnalytics, getComplianceScreen, rateLimitMiddleware, getX402Middleware } from "./routes/paid.js";

const app = new Hono();

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
app.use("/api/v1/*", async (c, next) => {
  console.log(`[MIDDLEWARE] ${c.req.method} ${c.req.path} - starting x402 middleware`);
  await next();
  console.log(`[MIDDLEWARE] ${c.req.method} ${c.req.path} - finished`);
});
app.use("/api/v1/*", async (c, next) => {
  const middleware = getX402Middleware(c.env);
  return middleware(c, next);
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
app.onError((err, c) => {
  console.error("Server error:", err);
  console.error("Stack:", err.stack);
  return c.json({ error: "Internal server error", message: err.message }, 500 );
});

// Cloudflare Workers entry point - pass env to app.fetch
export default {
  fetch: function(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};