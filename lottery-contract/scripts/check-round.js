import hre from "hardhat";

async function main() {
  const contractAddress = "0x9EaF48a7D2D1C1FFD206B4082F39e41fA23f26B1";
  const MicroLottery = await hre.ethers.getContractFactory("MicroLottery");
  const lottery = MicroLottery.attach(contractAddress);

  const round = await lottery.getCurrentRound();
  console.log("Round ID:", round.roundId.toString());
  console.log("Ticket price:", round.ticketPrice.toString());
  console.log("Start time:", new Date(Number(round.startTime) * 1000).toISOString());
  console.log("End time:", round.endTime == 0 ? "Manual" : new Date(Number(round.endTime) * 1000).toISOString());
  console.log("Total tickets:", round.totalTickets.toString());
  console.log("Drawn:", round.drawn);
  console.log("PRNG requested:", round.prngRequested);
  console.log("Block timestamp:", new Date().toISOString());
}

main().catch(console.error);