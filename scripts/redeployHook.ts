// scripts/redeployHook.ts
import { ethers } from "hardhat";

const PREDICTION_MARKET = "0xC2D7Cea4DD1F24f17fb25312383e8f305bD4654C";
const ETH_FEED  = "0x63B5d6a208b6C2c6d2B11766B71f4d6b0f27356B";
const BTC_FEED  = "0xaDa2A67Ec600C8Cf84161870278526b439Cfdc1F";
const SOMI_FEED = "0xf93ccEdAcdd5F549a9C6185F1f58925Ef1f6eDC8";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Deploy new ReactivityHook
  const Hook = await ethers.getContractFactory("ReactivityHook");
  const hook = await Hook.deploy(PREDICTION_MARKET);
  await hook.waitForDeployment();
  const hookAddr = await hook.getAddress();
  console.log("✓ New ReactivityHook:", hookAddr);

  // 2. Set price feeds
  await (await hook.setFeeds(ETH_FEED, BTC_FEED, SOMI_FEED)).wait();
  console.log("✓ Feeds set");

  // 3. Tell PredictionMarket about the new hook
  const PM_ABI = ["function setHook(address hook_)"];
  const pm = new ethers.Contract(PREDICTION_MARKET, PM_ABI, deployer);
  await (await pm.setHook(hookAddr)).wait();
  console.log("✓ PredictionMarket hook updated");

  console.log("\n── Copy this address into lib/config.ts REACTIVITY_HOOK:");
  console.log("   ", hookAddr);
  console.log("\n── Then run: set \"TS_NODE_PROJECT=tsconfig.hardhat.json\" && npx hardhat run scripts/subscribe.ts --network somnia");
}

main().catch(console.error);