import * as dotenv from "dotenv";

dotenv.config();

export interface X402Config {
  // Facilitator (verifies + settles payments)
  facilitatorUrl: string;
  facilitatorAddress: string; // Hedera account ID of facilitator (e.g., 0.0.9185802)

  // Your receiving address (where payments land)
  payToAddress: string;

  // Default pricing (USDC base units = 6 decimals)
  pricing: {
    basic: string;      // $0.001 = "1000"
    standard: string;   // $0.005 = "5000"
    premium: string;    // $0.02  = "20000"
  };

  // Supported assets on Hedera (testnet or mainnet)
  assets: {
    hbar: { asset: "0.0.0"; decimals: 8; network: "hedera:testnet" | "hedera:mainnet" };
    usdc: { asset: string; decimals: 6; network: "hedera:testnet" | "hedera:mainnet" };
  };

  // Default asset for pricing
  defaultAsset: "hbar" | "usdc";

  // Timeout for payment validity (seconds)
  maxTimeoutSeconds: number;

  // Mirror node URL
  mirrorNode: string;
}

export function loadX402Config(env?: any): X402Config {
  // Get env from parameter (for Cloudflare Workers) or process.env (for local)
  const getEnv = (key: string) => env?.[key] || process.env[key];

  const payToAddress = getEnv("X402_PAY_TO_ADDRESS") || getEnv("TREASURY_ID")!;
  const facilitatorUrl = getEnv("X402_FACILITATOR_URL") || "https://x402.org/facilitator";
  const facilitatorAddress = getEnv("X402_FACILITATOR_ADDRESS") || "0.0.9185802"; // Coinbase default
  
  // Detect network from mirror node URL
  const mirrorNode = getEnv("MIRROR_NODE") || "https://testnet.mirrornode.hedera.com";
  const isMainnet = mirrorNode.includes("mainnet");
  const network = isMainnet ? "hedera:mainnet" : "hedera:testnet";
  const usdcAsset = isMainnet ? "0.0.456858" : "0.0.429274"; // Mainnet USDC vs Circle Testnet USDC

  return {
    facilitatorUrl,
    facilitatorAddress,
    payToAddress,
    pricing: {
      basic: getEnv("X402_PRICE_BASIC") || "1000",      // 0.001 HBAR/USDC
      standard: getEnv("X402_PRICE_STANDARD") || "5000", // 0.005
      premium: getEnv("X402_PRICE_PREMIUM") || "20000",  // 0.02
    },
    assets: {
      hbar: { asset: "0.0.0", decimals: 8, network },
      usdc: { asset: usdcAsset, decimals: 6, network },
    },
    defaultAsset: (getEnv("X402_DEFAULT_ASSET") as "hbar" | "usdc") || "hbar",
    maxTimeoutSeconds: parseInt(getEnv("X402_MAX_TIMEOUT_SECONDS") || "300", 10),
    mirrorNode,
  };
}