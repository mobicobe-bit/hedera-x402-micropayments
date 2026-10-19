import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "HBAR");

  const contractAddress = "0x9EaF48a7D2D1C1FFD206B4082F39e41fA23f26B1";
  const contractBalance = await hre.ethers.provider.getBalance(contractAddress);
  console.log("Contract balance:", hre.ethers.formatEther(contractBalance), "HBAR");
}

main().catch(console.error);