import { Hono } from "hono";
import { ethers } from "ethers";

interface Env {
  // Contract config
  LOTTERY_CONTRACT_ADDRESS: string;
  LOTTERY_RPC_URL: string;
  ADMIN_PRIVATE_KEY: string;
  // Optional: webhook for notifications
  DISCORD_WEBHOOK_URL?: string;
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_SECRET?: string;
}

// Lottery contract ABI (minimal for cron)
const LOTTERY_ABI = [
  "function createRound(uint256 _ticketPriceHbar, string _productName, string _productDescription, string _productImageUrl, uint256 _durationSeconds) external",
  "function getCurrentRound() external view returns (uint256 roundId, uint256 ticketPrice, uint256 startTime, uint256 endTime, uint256 totalTickets, address winner, bytes32 prngRequestId, bool prngRequested, bool drawn, string productName, string productDescription, string productImageUrl)",
  "function protocolFeeBps() external view returns (uint256)",
  "function protocolFeeReceiver() external view returns (address)",
];

// Product pool for variety
const PRODUCTS = [
  {
    name: "Wireless Pro Headphones",
    description: "Premium noise-cancelling, 40hr battery",
    image: "https://via.placeholder.com/300/3b82f6/ffffff?text=Headphones",
    priceHbar: 10,
  },
  {
    name: "Mechanical Keyboard",
    description: "Hot-swappable switches, RGB backlight",
    image: "https://via.placeholder.com/300/8b5cf6/ffffff?text=Keyboard",
    priceHbar: 15,
  },
  {
    name: "4K Webcam",
    description: "Auto-focus, HDR, privacy cover",
    image: "https://via.placeholder.com/300/10b981/ffffff?text=Webcam",
    priceHbar: 8,
  },
  {
    name: "Portable SSD 2TB",
    description: "USB 3.2 Gen 2, 2000MB/s",
    image: "https://via.placeholder.com/300/f59e0b/ffffff?text=SSD",
    priceHbar: 20,
  },
  {
    name: "Smart Watch",
    description: "Health monitoring, 7-day battery",
    image: "https://via.placeholder.com/300/ef4444/ffffff?text=Watch",
    priceHbar: 25,
  },
  {
    name: "Tablet 10\"",
    description: "Stylus support, 120Hz display",
    image: "https://via.placeholder.com/300/6366f1/ffffff?text=Tablet",
    priceHbar: 30,
  },
];

function pickRandomProduct(): typeof PRODUCTS[0] {
  return PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
}

async function sendDiscordWebhook(url: string, content: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }
}

async function postTweet(env: Env, text: string) {
  // Placeholder - would need Twitter API v2 OAuth 1.0a implementation
  console.log("Would tweet:", text);
}

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "lottery-cron" }));

// Manual trigger endpoint (for testing)
app.post("/trigger", async (c) => {
  try {
    const result = await createWeeklyRound(c.env);
    return c.json({ success: true, ...result });
  } catch (e) {
    return c.json({ success: false, error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

// Main cron handler - runs weekly
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("Weekly lottery cron triggered at:", new Date().toISOString());
    
    try {
      const result = await createWeeklyRound(env);
      console.log("Weekly round created:", result);
      
      // Notify Discord
      if (env.DISCORD_WEBHOOK_URL) {
        await sendDiscordWebhook(
          env.DISCORD_WEBHOOK_URL,
          `🎰 **New Lottery Round Created!**\n` +
          `Round #${result.roundId}: ${result.product.name}\n` +
          `Ticket: ${result.ticketPriceHbar} HBAR | Duration: ${result.durationHours}h\n` +
          `🔗 Play: https://hedera-micropayments-api.mobicobe.workers.dev/lottery`
        );
      }
      
      // Tweet (if configured)
      if (env.TWITTER_API_KEY) {
        await postTweet(env, 
          `🎰 New MicroLottery round live!\n` +
          `Prize: ${result.product.name}\n` +
          `Ticket: ${result.ticketPriceHbar} HBAR\n` +
          `Enter via HashPack: https://hedera-micropayments-api.mobicobe.workers.dev/lottery\n` +
          `#Hedera #x402 #Web3`
        );
      }
    } catch (e) {
      console.error("Cron failed:", e);
      if (env.DISCORD_WEBHOOK_URL) {
        await sendDiscordWebhook(
          env.DISCORD_WEBHOOK_URL,
          `❌ **Lottery Cron Failed**\n${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
  },
  
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};

async function createWeeklyRound(env: Env) {
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(env.LOTTERY_RPC_URL);
  const signer = new ethers.Wallet(env.ADMIN_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(env.LOTTERY_CONTRACT_ADDRESS, LOTTERY_ABI, signer);

  // Check current round status
  const currentRound = await contract.getCurrentRound();
  const isDrawn = currentRound.drawn;
  const hasTickets = currentRound.totalTickets > 0;

  // If current round is still active and not drawn, don't create new one
  if (!isDrawn && hasTickets) {
    // Check if round has expired (7 days)
    const roundAge = Math.floor(Date.now() / 1000) - Number(currentRound.startTime);
    const sevenDays = 7 * 24 * 60 * 60;
    
    if (roundAge < sevenDays) {
      throw new Error(`Current round #${currentRound.roundId} still active (${Math.floor(roundAge/3600)}h old)`);
    }
  }

  // Pick random product
  const product = pickRandomProduct();
  const durationSeconds = 7 * 24 * 60 * 60; // 7 days

  // Create new round
  console.log(`Creating round with ${product.name} at ${product.priceHbar} HBAR`);
  
  const tx = await contract.createRound(
    product.priceHbar,
    product.name,
    product.description,
    product.image,
    durationSeconds
  );

  const receipt = await tx.wait();
  console.log("Round created, tx:", receipt.hash);

  // Get the new round ID (should be current + 1)
  const newRound = await contract.getCurrentRound();
  const newRoundId = Number(newRound.roundId);

  return {
    roundId: newRoundId,
    product,
    ticketPriceHbar: product.priceHbar,
    durationHours: durationSeconds / 3600,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}