// Directly creates fresh markets for all 3 assets by temporarily becoming the hook
import { ethers } from "hardhat";

const PM_ADDR   = "0xC2D7Cea4DD1F24f17fb25312383e8f305bD4654C";
const HOOK_ADDR = "0xC15b542145909030e3069fD76440C7A20291391e";

const PM_ABI = [
  "function setHook(address) external",
  "function createMarket(string,string,uint256,uint256,uint256) external returns (uint256)",
  "function getActiveMarketId(string) view returns (uint256)",
  "function hook() view returns (address)",
];

// Prices × 100 (contract format)
const MARKETS = [
  { asset: "ETH",  current: 220000, target: 230000, q: "Will ETH hit $2300 in 5 minutes?" },
  { asset: "BTC",  current: 9500000, target: 9600000, q: "Will BTC hit $96000 in 5 minutes?" },
  { asset: "SOMI", current: 20, target: 25, q: "Will SOMI hit $0.25 in 5 minutes?" },
];
const DURATION = 5 * 60; // 5 minutes

async function main() {
  const [deployer] = await ethers.getSigners();
  const pm = new ethers.Contract(PM_ADDR, PM_ABI, deployer);

  console.log("1. Setting deployer as hook...");
  await (await pm.setHook(deployer.address)).wait();
  console.log("✓ Done");

  for (const { asset, current, target, q } of MARKETS) {
    const existing = await pm.getActiveMarketId(asset);
    if (existing > 0n) {
      console.log(`\n${asset}: already has active market #${existing}, skipping`);
      continue;
    }
    console.log(`\nCreating ${asset} market...`);
    const tx = await pm.createMarket(asset, q, target, current, DURATION);
    const r = await tx.wait();
    console.log(`✓ ${asset} market created — tx: ${r.hash}`);
  }

  console.log("\n2. Restoring hook...");
  await (await pm.setHook(HOOK_ADDR)).wait();
  console.log("✓ Hook restored");
  console.log("\nDone! Refresh the site — YES/NO buttons should appear.");
}
main().catch(console.error);