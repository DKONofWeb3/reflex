// scripts/forceResolve.ts
// Temporarily sets deployer as hook, resolves all stuck markets, restores hook
import { ethers } from "hardhat";

const PM_ADDR   = "0xC2D7Cea4DD1F24f17fb25312383e8f305bD4654C";
const HOOK_ADDR = "0xC15b542145909030e3069fD76440C7A20291391e";

const PM_ABI = [
  "function setHook(address hook_) external",
  "function getActiveMarketId(string asset) view returns (uint256)",
  "function resolveMarket(uint256 marketId, bool hitTarget) external",
  "function hook() view returns (address)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const pm = new ethers.Contract(PM_ADDR, PM_ABI, deployer);

  // Step 1: Set deployer as hook so we can call resolveMarket directly
  console.log("\n1. Setting deployer as hook...");
  const tx1 = await pm.setHook(deployer.address);
  await tx1.wait();
  console.log("✓ Deployer is now hook");

  // Step 2: Resolve all stuck markets
  for (const asset of ["ETH", "BTC", "SOMI"]) {
    const activeId = await pm.getActiveMarketId(asset);
    if (activeId === 0n) {
      console.log(`\n${asset}: no active market, skipping`);
      continue;
    }
    console.log(`\n${asset}: resolving market #${activeId}...`);
    try {
      // hitTarget=false → resolves as NO (deadline expired, no one hit the target)
      const tx = await pm.resolveMarket(activeId, false);
      await tx.wait();
      console.log(`✓ ${asset} market #${activeId} resolved as NO`);
    } catch (e: any) {
      console.log(`  Error: ${e?.message?.slice(0, 80)}`);
    }
  }

  // Step 3: Restore real hook
  console.log("\n3. Restoring real hook...");
  const tx3 = await pm.setHook(HOOK_ADDR);
  await tx3.wait();
  console.log("✓ Hook restored to:", HOOK_ADDR);

  console.log("\nAll done. Now run manualTrigger to create fresh markets.");
}

main().catch(console.error);