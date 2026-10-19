import hre from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // Load deployment info
  const deploymentFile = `deployment-${hre.network.name}.json`;
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Run deploy.js first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deployment.contractAddress;

  console.log("Creating round on contract:", contractAddress);
  console.log("Network:", hre.network.name);

  // Connect to contract
  const MicroLottery = await hre.ethers.getContractFactory("MicroLottery");
  const lottery = MicroLottery.attach(contractAddress);

  // Round configuration - UPDATE THESE VALUES
  const TICKET_PRICE_HBAR = 10; // 10 HBAR per ticket
  const PRODUCT_NAME = "Wireless Pro Headphones";
  const PRODUCT_DESCRIPTION = "Premium noise-cancelling, 40hr battery";
  const PRODUCT_IMAGE_URL = "https://example.com/headphones.jpg"; // Replace with real image URL
  const DURATION_SECONDS = 0; // 0 = manual draw only, or set duration (e.g., 7 * 24 * 60 * 60 for 7 days)

  console.log("\nRound config:");
  console.log("  Ticket price:", TICKET_PRICE_HBAR, "HBAR");
  console.log("  Product:", PRODUCT_NAME);
  console.log("  Duration:", DURATION_SECONDS === 0 ? "Manual draw" : DURATION_SECONDS + " seconds");

  // Create round
  const tx = await lottery.createRound(
    TICKET_PRICE_HBAR,
    PRODUCT_NAME,
    PRODUCT_DESCRIPTION,
    PRODUCT_IMAGE_URL,
    DURATION_SECONDS
  );

  console.log("\n⏳ Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Round created in block:", receipt.blockNumber);

  // Get current round info
  const round = await lottery.getCurrentRound();
  console.log("\n📋 Round details:");
  console.log("  Round ID:", round.roundId.toString());
  console.log("  Ticket price:", hre.ethers.formatEther(round.ticketPrice), "HBAR");
  console.log("  Start time:", new Date(Number(round.startTime) * 1000).toISOString());
  console.log("  End time:", round.endTime === 0 ? "Manual draw" : new Date(Number(round.endTime) * 1000).toISOString());
  console.log("  Total tickets:", round.totalTickets.toString());
  console.log("  Drawn:", round.drawn);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });