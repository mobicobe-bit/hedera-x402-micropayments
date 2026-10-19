import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client, PrivateKey, AccountId, TransferTransaction, Hbar } from "@hashgraph/sdk";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

// Facilitator config - uses testnet account with HBAR for gas
const FACILITATOR_ACCOUNT_ID = "0.0.1187135"; // Your testnet account with 74 HBAR
const FACILITATOR_PRIVATE_KEY = "1a1f1ce0a9bd8810f2cc44458367be411f2389d71c87e0ad4b397c76e42580f5";
const FACILITATOR_ADDRESS = "0.0.1187135";

function getClient() {
  const { Client, PrivateKey, AccountId } = require("@hashgraph/sdk");
  const client = Client.forTestnet();
  client.setOperator(FACILITATOR_ACCOUNT_ID, PrivateKey.fromStringECDSA(FACILITATOR_PRIVATE_KEY));
  return client;
}

// Verify payment endpoint
app.post("/verify", async (c) => {
  try {
    const body = await c.req.json() as {
      x402Version: number;
      paymentPayload: string; // base64 encoded signed transaction
      paymentRequirements: {
        scheme: string;
        network: string;
        maxAmountRequired: string;
        resource: string;
        description: string;
        mimeType: string;
        payTo: string;
        maxTimeoutSeconds: number;
        asset: string;
        extra: { payTo: string; feePayer: string };
        facilitator: { url: string; address: string };
      };
    };

    const { paymentPayload, paymentRequirements } = body;

    // Verify the network matches
    if (paymentRequirements.network !== "hedera:testnet") {
      return c.json({ isValid: false, invalidReason: "network_mismatch", invalidMessage: "Only hedera:testnet supported" });
    }

    // Decode the base64 transaction
    const txBytes = Buffer.from(paymentPayload, "base64");
    
    // Deserialize the transaction using Hedera SDK
    const { Transaction } = await import("@hashgraph/sdk");
    const tx = Transaction.fromBytes(txBytes);
    
    // Execute the transaction using lazy client
    const client = getClient();
    const txResponse = await tx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    return c.json({
      isValid: receipt.status.toString() === "SUCCESS",
      transactionHash: txResponse.transactionId.toString(),
      payer: paymentRequirements.extra?.feePayer || "unknown",
    });
  } catch (e) {
    return c.json({ isValid: false, invalidReason: "execution_failed", invalidMessage: e instanceof Error ? e.message : "Unknown" });
  }
});

// Settle endpoint (for x402 protocol compliance)
app.post("/settle", async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, message: "Settlement not required for testnet" });
});

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "testnet-facilitator", network: "hedera:testnet" }));

export default { fetch: (request: Request, env: any, ctx: any) => app.fetch(request, env, ctx) };