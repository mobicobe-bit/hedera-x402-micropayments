import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { x402Discovery, healthCheck, rateLimitMiddleware } from "./routes/x402.js";

type Bindings = {
  HEDERA_SERVICE_URL?: string;
  HEDERA_SERVICE_TOKEN?: string;
  X402_MIDDLEWARE: Fetcher;
  [key: string]: string | Fetcher | undefined;
};

const app = new Hono<{ Bindings: Bindings }>();

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

// x402 payment middleware - forward to dedicated x402 worker
app.use("/api/v1/*", async (c, next) => {
  const x402Worker = c.env.X402_MIDDLEWARE;
  
  // Forward the request to the x402 middleware worker
  const response = await x402Worker.fetch(c.req.raw);
  
  // If it's a 402, return it directly
  if (response.status === 402) {
    return response;
  }
  
  // If it's not a 402, continue to our handlers
  if (response.ok || response.status >= 400) {
    return response;
  }
  
  await next();
});

// Free endpoints
app.get("/", healthCheck);
app.get("/health", healthCheck);

// x402 Discovery (well-known endpoint)
app.get("/.well-known/x402.json", x402Discovery);

// Paid API endpoints - use fetch to external service instead of direct SDK calls
app.get("/api/v1/token/balances", async (c) => {
  const accountId = c.req.query("accountId");
  if (!accountId) {
    return c.json({ error: "accountId query parameter required" }, 400);
  }
  
  console.log(`[getTokenBalances] Request for accountId: ${accountId}`);
  
  // Call external Hedera service
  const serviceUrl = c.env.HEDERA_SERVICE_URL || "https://hedera-micropayments-api-minimal.mobicobe.workers.dev";
  try {
    const response = await fetch(`${serviceUrl}/internal/balances/${accountId}`, {
      headers: { "Authorization": `Bearer ${c.env.HEDERA_SERVICE_TOKEN || ""}` }
    });
    if (!response.ok) throw new Error(`Service error: ${response.status}`);
    const data: Record<string, unknown> = await response.json();
    return c.json({ ...data, paid: true });
  } catch (error) {
    console.error(`[getTokenBalances] Error for ${accountId}:`, error);
    return c.json({ 
      error: "Failed to fetch balances", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 502);
  }
});

app.get("/api/v1/token/analytics/:tokenId", async (c) => {
  const tokenId = c.req.param("tokenId");
  console.log(`[getTokenAnalytics] Request for tokenId: ${tokenId}`);
  
  const serviceUrl = c.env.HEDERA_SERVICE_URL || "https://hedera-micropayments-api-minimal.mobicobe.workers.dev";
  try {
    const response = await fetch(`${serviceUrl}/internal/analytics/${tokenId}`, {
      headers: { "Authorization": `Bearer ${c.env.HEDERA_SERVICE_TOKEN || ""}` }
    });
    if (!response.ok) throw new Error(`Service error: ${response.status}`);
    const data: Record<string, unknown> = await response.json();
    return c.json({ ...data, paid: true });
  } catch (error) {
    console.error(`[getTokenAnalytics] Error for ${tokenId}:`, error);
    return c.json({ 
      error: "Failed to fetch analytics", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 502);
  }
});

app.get("/api/v1/compliance/screen/:accountId", async (c) => {
  const accountId = c.req.param("accountId");
  console.log(`[getComplianceScreen] Request for accountId: ${accountId}`);
  
  const serviceUrl = c.env.HEDERA_SERVICE_URL || "https://hedera-micropayments-api-minimal.mobicobe.workers.dev";
  try {
    const response = await fetch(`${serviceUrl}/internal/screen/${accountId}`, {
      headers: { "Authorization": `Bearer ${c.env.HEDERA_SERVICE_TOKEN || ""}` }
    });
    if (!response.ok) throw new Error(`Service error: ${response.status}`);
    const data: Record<string, unknown> = await response.json();
    return c.json({ ...data, paid: true });
  } catch (error) {
    console.error(`[getComplianceScreen] Error for ${accountId}:`, error);
    return c.json({ 
      error: "Failed to screen account", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 502);
  }
});

// 404 handler
app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  console.error("Stack:", err.stack);
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

export default {
  fetch: (request: Request, env: any, ctx: any) => {
    return app.fetch(request, env, ctx);
  },
};