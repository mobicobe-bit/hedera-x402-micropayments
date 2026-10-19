import hre from "hardhat";

async function main() {
  const PRNG_ADDRESS = "0x000000000000000000000000000000000000016F";
  const provider = hre.ethers.provider;

  const code = await provider.getCode(PRNG_ADDRESS);
  console.log("PRNG contract code length:", code.length);

  try {
    const selector = hre.ethers.id("requestRandomBytes(uint256,uint256)").slice(2, 10);
    const data = "0x" + selector + (32).toString(16).padStart(64, "0") + (200000).toString(16).padStart(64, "0");
    const result = await provider.call({ to: PRNG_ADDRESS, data, gasLimit: 500000 });
    console.log("PRNG call result:", result);
  } catch (e) {
    console.log("PRNG call error:", e.message);
  }
}

main().catch(console.error);