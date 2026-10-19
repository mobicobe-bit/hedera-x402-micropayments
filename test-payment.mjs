import { createX402Fetcher } from "@x402/fetch";

async function testPayment() {
  const fetcher = createX402Fetcher({
    "hedera:testnet": {
      rpcUrl: "https://testnet.hashio.io/api",
      accountId: "0.0.1187135",
      privateKey: "1a1f1ce0a9bd8810f2cc44458367be411f2389d71c87e0ad4b397c76e42580f5",
    },
  });

  const url = "https://hedera-micropayments-api.mobicobe.workers.dev/api/v1/token/balances?accountId=0.0.1187135";
  
  console.log("Testing payment to:", url);
  
  try {
    const response = await fetcher(url);
    const data = await response.json();
    console.log("✓ Success!");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("✗ Error:", error);
  }
}

testPayment();