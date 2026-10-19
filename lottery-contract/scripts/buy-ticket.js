import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Buying ticket with:", deployer.address);

  const contractAddress = "0x9EaF48a7D2D1C1FFD206B4082F39e41fA23f26B1";
  const MicroLottery = await hre.ethers.getContractFactory("MicroLottery");
  const lottery = MicroLottery.attach(contractAddress);

  // Buy 1 ticket (10 HBAR = 10 * 10^18 wei on Hedera EVM)
  const ticketPriceWei = BigInt(10 * 1e18); // 10 HBAR in wei
  const tx = await lottery.buyTicket({ 
    value: ticketPriceWei,
    gasLimit: 500_000
  });
  console.log("Tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Ticket bought in block:", receipt.blockNumber);

  // Check round
  const round = await lottery.getCurrentRound();
  console.log("Round:", round.roundId.toString());
  console.log("Total tickets:", round.totalTickets.toString());
  console.log("Participants:", (await lottery.getParticipants(round.roundId)).length);
}

main().catch(console.error);