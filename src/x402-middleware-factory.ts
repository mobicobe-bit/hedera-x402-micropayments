// Factory for creating x402 middleware with Hedera scheme
// This file MUST be dynamically imported at runtime to avoid bundling protobufjs

export interface X402Config {
  facilitatorUrl: string;
  payToAddress: string;
  pricing: { basic: string; standard: string; premium: string };
  assets: {
    hbar: { asset: string; decimals: number; network: string };
    usdc: { asset: string; decimals: number; network: string };
  };
  defaultAsset: "hbar" | "usdc";
  maxTimeoutSeconds: number;
  mirrorNode: string;
}

export async function createX402Middleware(
  env: any,
  config: X402Config,
  priceToDollarString: (price: string, asset: "hbar" | "usdc") => string,
  dashboardUrl?: string
) {
  // Dynamic imports - only evaluated at runtime in Workers
  const [hederaModule, coreModule, honoModule] = await Promise.all([
    import("@x402/hedera/exact/server"),
    import("@x402/core/server"),
    import("@x402/hono"),
  ]);

  const { ExactHederaScheme } = hederaModule;
  const { HTTPFacilitatorClient, x402ResourceServer } = coreModule;
  const { paymentMiddleware: paymentMiddlewareFn } = honoModule;

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
        extra: { ...req.extra, payTo: req.payTo || req.extra?.payTo }
      }));
    }

    async enhancePaymentRequirements(paymentRequirements: any, supportedKind: any, extensionKeys: any) {
      const base = await super.enhancePaymentRequirements(paymentRequirements, supportedKind, extensionKeys);
      return {
        ...base,
        payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo,
        extra: { ...base.extra, payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo }
      };
    }
  }

  const asset = "usdc";
  const network = config.assets[asset].network as `${string}:${string}`;
  const payTo = config.payToAddress;
  const basicPrice = priceToDollarString(config.pricing.basic, asset);
  const standardPrice = priceToDollarString(config.pricing.standard, asset);
  const premiumPrice = priceToDollarString(config.pricing.premium, asset);

  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });

  const resourceServer = new (await import("@x402/core/server")).x402ResourceServer(facilitator)
    .register("hedera:*", new (class HederaSchemeWithPayTo extends ExactHederaScheme {
      constructor(config = {}) { super(config); }
      async enrichPaymentRequiredResponse(context: any) {
        const { requirements } = context;
        return requirements.map((req: any) => ({
          ...req,
          payTo: req.payTo || req.extra?.payTo,
          extra: { ...req.extra, payTo: req.payTo || req.extra?.payTo }
        }));
      }
      async enhancePaymentRequirements(paymentRequirements: any, supportedKind: any, extensionKeys: any) {
        const base = await super.enhancePaymentRequirements(paymentRequirements, supportedKind, extensionKeys);
        return {
          ...base,
          payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo,
          extra: { ...base.extra, payTo: paymentRequirements.payTo || paymentRequirements.extra?.payTo }
        };
      }
    })({
      defaultAssets: { "hedera:testnet": config.assets.usdc },
    }));

  const middleware = paymentMiddlewareFn({
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

  // Wrap middleware to capture successful payments and send to dashboard
  return async (c: any, next: any) => {
    await middleware(c, next);

    // Check if payment was processed (PAYMENT-RESPONSE header present)
    const paymentResponse = c.res.headers.get("PAYMENT-RESPONSE") || c.res.headers.get("X-PAYMENT-RESPONSE");
    if (paymentResponse && dashboardUrl) {
      try {
        // Parse the payment response to get details
        const paymentData = JSON.parse(paymentResponse);
        const endpoint = c.req.path;
        const payer = paymentData.payer || "unknown";
        const amount = paymentData.amount || "0";
        const currency = "USDC";
        const txHash = paymentData.transactionHash || paymentData.txHash || "unknown";

        // Fire-and-forget webhook to dashboard
        fetch(`${dashboardUrl}/api/dashboard/webhook/x402-settlement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, payer, amount, currency, network, txHash }),
        }).catch(() => {}); // Silent fail
      } catch (e) {
        // Silent fail - don't break the response
      }
    }
  };
}