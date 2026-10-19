import hre from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // Use the contract that has tickets sold (old deployment)
  const contractAddress = "0x9EaF48a7D2D1C1FFD206B4082F39e41fA23f26B1";
  
  const deployment = {
    protocolFeeBps: 250,
    protocolFeeReceiver: "0xCc7Cc2c2c11e82F175cAc1249038eB338bA099Bd",
  };

  console.log("Drawing winner on contract:", contractAddress);
  console.log("Network:", hre.network.name);

  // Connect to contract
  const MicroLottery = await hre.ethers.getContractFactory("MicroLottery");
  const lottery = MicroLottery.attach(contractAddress);

  // Check current round
  const round = await lottery.getCurrentRound();
  console.log("\n📋 Current round:");
  console.log("  Round ID:", round.roundId.toString());
  console.log("  Total tickets:", round.totalTickets.toString());
  console.log("  PRNG requested:", round.prngRequested);
  console.log("  Drawn:", round.drawn);

  if (round.totalTickets === 0) {
    console.error("❌ No tickets sold yet. Cannot draw winner.");
    process.exit(1);
  }

  if (round.drawn) {
    console.error("❌ Round already drawn.");
    process.exit(1);
  }

  // Step 1: Request randomness if not already requested
  if (!round.prngRequested) {
    console.log("\n🎲 Step 1: Requesting randomness from Hedera PRNG...");
    const tx1 = await lottery.requestRandomness({ gasLimit: 1_000_000 });
    console.log("⏳ Transaction sent:", tx1.hash);
    await tx1.wait();
    console.log("✅ PRNG requested");

    // Wait a bit for the PRNG to be ready
    console.log("⏳ Waiting for PRNG to be ready (10 seconds)...");
    await new Promise(resolve => setTimeout(resolve, 10000));
  } else {
    console.log("\n✅ PRNG already requested, requestId:", round.prngRequestId);
  }

  // Step 2: Draw winner
  console.log("\n🎯 Step 2: Drawing winner...");
  const tx2 = await lottery.drawWinner({ gasLimit: 500_000 });
  console.log("⏳ Transaction sent:", tx2.hash);
  const receipt = await tx2.wait();
  console.log("✅ Winner drawn in block:", receipt.blockNumber);

  // Get winner info
  const updatedRound = await lottery.getCurrentRound();
  console.log("\n🏆 Winner details:");
  console.log("  Winner:", updatedRound.winner);
  console.log("  Total tickets:", updatedRound.totalTickets.toString());
  console.log("  Drawn:", updatedRound.drawn);

  // Get winning ticket ID
  const participants = await lottery.getParticipants(updatedRound.roundId);
  console.log("  Total participants:", participants.length);

  // Calculate protocol fee earned
  const protocolFeeBps = deployment.protocolFeeBps;
  const ticketPriceTinybars = Number(round.ticketPrice);
  const ticketsSold = Number(round.totalTickets);
  const protocolFeeTinybars = Math.floor((ticketPriceTinybars * ticketsSold * protocolFeeBps) / 10000);
  const protocolFeeHBAR = protocolFeeTinybars / 100_000_000;

  console.log("\n💰 Protocol fee earned:");
  console.log("  Fee rate:", protocolFeeBps / 100, "%");
  console.log("  Tickets sold:", ticketsSold);
  console.log("  Fee:", protocolFeeHBAR.toFixed(8), "HBAR");

  // Send webhook to dashboard if configured
  const DASHBOARD_URL = process.env.DASHBOARD_URL;
  if (DASHBOARD_URL) {
    console.log("\n📡 Sending webhook to dashboard...");
    try {
      const response = await fetch(`${DASHBOARD_URL}/api/dashboard/webhook/lottery-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: Number(round.roundId),
          ticketPriceTinybars: ticketPriceTinybars,
          ticketsSold: ticketsSold,
          protocolFeeBps: protocolFeeBps,
          protocolFeeReceiver: deployment.protocolFeeReceiver,
          txHash: tx2.hash,
        }),
      });
      if (response.ok) {
        console.log("✅ Webhook sent successfully");
      } else {
        console.log("⚠️ Webhook failed:", response.status);
      }
    } catch (error) {
      console.log("⚠️ Webhook error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });