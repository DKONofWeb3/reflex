import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const NEW_PM    = "0x2Fdf1d339A3F2c2520b0f820d2BbE7441cFC5d13";
const ETH_FEED  = "0x63B5d6a208b6C2c6d2B11766B71f4d6b0f27356B";
const BTC_FEED  = "0xaDa2A67Ec600C8Cf84161870278526b439Cfdc1F";
const SOMI_FEED = "0xf93ccEdAcdd5F549a9C6185F1f58925Ef1f6eDC8";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  console.log("\n1. Deploying ReactivityHook...");
  const Hook = await ethers.getContractFactory("ReactivityHook");
  const hook = await Hook.deploy(NEW_PM);
  await hook.waitForDeployment();
  const hookAddr = await hook.getAddress();
  console.log("✓ ReactivityHook:", hookAddr);

  console.log("\n2. Setting price feeds...");
  const tx1 = await (hook as any).setFeeds(ETH_FEED, BTC_FEED, SOMI_FEED);
  await tx1.wait();
  console.log("✓ Feeds set");

  console.log("\n3. Setting hook on PredictionMarket...");
  const pm = await ethers.getContractAt("PredictionMarket", NEW_PM);
  const tx2 = await (pm as any).setHook(hookAddr);
  await tx2.wait();
  console.log("✓ Hook set on PM");

  console.log("\n══════════════════════════════════════════");
  console.log("Update .env.local + Vercel:");
  console.log("NEXT_PUBLIC_PREDICTION_MARKET=" + NEW_PM);
  console.log("NEXT_PUBLIC_REACTIVITY_HOOK="   + hookAddr);
  console.log("══════════════════════════════════════════");
  console.log("\nNext: npx hardhat run scripts/subscribe.ts --network somnia");
}
main().catch(console.error);