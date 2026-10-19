import hre from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying MicroLottery with account:", deployer.address);
  console.log("Network:", hre.network.name);

  // Configuration
  const PROTOCOL_FEE_BPS = 250; // 2.5%
  const PROTOCOL_FEE_RECEIVER = deployer.address; // Change to your treasury address

  console.log("Protocol fee:", PROTOCOL_FEE_BPS, "bps (", PROTOCOL_FEE_BPS / 100, "%)");
  console.log("Protocol fee receiver:", PROTOCOL_FEE_RECEIVER);

  // Deploy contract
  const MicroLottery = await hre.ethers.getContractFactory("MicroLottery");
  const lottery = await MicroLottery.deploy(PROTOCOL_FEE_BPS, PROTOCOL_FEE_RECEIVER);

  await lottery.waitForDeployment();

  const address = await lottery.getAddress();
  console.log("\n✅ MicroLottery deployed to:", address);
  console.log("Transaction hash:", lottery.deploymentTransaction().hash);

  // Verify on HashScan (if not local)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await lottery.deploymentTransaction().wait(5);

    console.log("🔍 Verifying contract on HashScan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [PROTOCOL_FEE_BPS, PROTOCOL_FEE_RECEIVER],
      });
      console.log("✅ Contract verified on HashScan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: deployer.address,
    protocolFeeBps: PROTOCOL_FEE_BPS,
    protocolFeeReceiver: PROTOCOL_FEE_RECEIVER,
    deployedAt: new Date().toISOString(),
    transactionHash: lottery.deploymentTransaction().hash,
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n📄 Deployment info saved to deployment-" + hre.network.name + ".json");

  // Create first round example
  console.log("\n📋 Next steps:");
  console.log("1. Call createRound() to create your first lottery round");
  console.log("   Example: await lottery.createRound(10, 'Wireless Headphones', 'Premium noise-cancelling', 'https://example.com/headphones.jpg', 0)");
  console.log("2. Share the contract address with the frontend widget");
  console.log("3. Users can buy tickets via buyTicket() with HBAR");
  console.log("4. Call requestRandomness() then drawWinner() to complete the round");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });