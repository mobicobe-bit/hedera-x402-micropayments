import * as dotenv from "dotenv";
dotenv.config();

export interface StripeConfig {
  key: string;
  priceStarter: string; // $19/month
  priceGrowth: string; // $49/month
  pricePro: string; // $99/month
  webhookSecret: string;
}

// Default prices in cents (Stripe expects amounts in smallest currency unit)
export const stripePrices = {
  starter: "price_1QxYZ", // Replace with actual price IDs
  growth: "price_1ABCD", // Replace with actual price IDs
  pro: "price_1EFGH", // Replace with actual price IDs
};

// Load Stripe config from env
const getEnv = (key: string) => process.env[key];

export const stripeConfig: StripeConfig = {
  key: getEnv("STRIPE_KEY")!,
  priceStarter: getEnv("STRIPE_PRICE_STARTER") || "price_1QxYZ",
  priceGrowth: getEnv("STRIPE_PRICE_GROWTH") || "price_1ABCD",
  pricePro: getEnv("STRIPE_PRICE_PRO") || "price_1EFGH",
  webhookSecret: getEnv("STRIPE_WEBHOOK_SECRET") || "",
};