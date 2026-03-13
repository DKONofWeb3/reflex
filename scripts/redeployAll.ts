// scripts/redeployAll.ts
// Redeploys PredictionMarket + ReactivityHook, sets feeds, sets hook, re-subscribes
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const ETH_FEED  = "0x63B5d6a208b6C2c6d2B11766B71f4d6b0f27356B";
const BTC_FEED  = "0xaDa2A67Ec600C8Cf84161870278526b439Cfdc1F";
const SOMI_FEED = "0xf93ccEdAcdd5F549a9C6185F1f58925Ef1f6eDC8";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Deploy PredictionMarket
  console.log("\n1. Deploying PredictionMarket...");
  const PM = await ethers.getContractFactory("PredictionMarket");
  const pm = await PM.deploy();
  await pm.waitForDeployment();
  const pmAddr = await pm.getAddress();
  console.log("✓ PredictionMarket:", pmAddr);

  // 2. Deploy ReactivityHook
  console.log("\n2. Deploying ReactivityHook...");
  const Hook = await ethers.getContractFactory("ReactivityHook");
  const hook = await Hook.deploy(pmAddr);
  await hook.waitForDeployment();
  const hookAddr = await hook.getAddress();
  console.log("✓ ReactivityHook:", hookAddr);

  // 3. Set feeds on hook
  console.log("\n3. Setting price feeds on hook...");
  const tx1 = await (hook as any).setFeeds(ETH_FEED, BTC_FEED, SOMI_FEED);
  await tx1.wait();
  console.log("✓ Feeds set");

  // 4. Set hook on PredictionMarket
  console.log("\n4. Setting hook on PredictionMarket...");
  const tx2 = await (pm as any).setHook(hookAddr);
  await tx2.wait();
  console.log("✓ Hook set");

  console.log("\n══════════════════════════════════════════");
  console.log("NEW ADDRESSES — update .env.local + Vercel:");
  console.log("NEXT_PUBLIC_PREDICTION_MARKET=" + pmAddr);
  console.log("NEXT_PUBLIC_REACTIVITY_HOOK="   + hookAddr);
  console.log("══════════════════════════════════════════");
  console.log("\nNow run: set \"TS_NODE_PROJECT=tsconfig.hardhat.json\" && npx hardhat run scripts/subscribe.ts --network somnia");
}

main().catch(console.error);