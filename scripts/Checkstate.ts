import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const PM_ADDR   = "0xC2D7Cea4DD1F24f17fb25312383e8f305bD4654C";
const HOOK_ADDR = "0xC15b542145909030e3069fD76440C7A20291391e";

const PM_ABI = [
  "function getActiveMarketId(string asset) view returns (uint256)",
  "function hook() view returns (address)",
  "function nextMarketId() view returns (uint256)",
  "function getMarket(uint256 marketId) view returns ((uint256 id, string asset, string question, uint256 targetPrice, uint256 createdPrice, uint256 deadline, uint8 status, uint256 yesPool, uint256 noPool, uint256 resolvedAt) m)",
];
const HOOK_ABI = [
  "function lastMilestone(string asset) view returns (uint256)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  const pm   = new ethers.Contract(PM_ADDR, PM_ABI, signer);
  const hook = new ethers.Contract(HOOK_ADDR, HOOK_ABI, signer);
  const now  = Math.floor(Date.now() / 1000);
  const statusMap = ["ACTIVE","RESOLVED_YES","RESOLVED_NO","EXPIRED"];

  console.log("hook()       :", await pm.hook());
  console.log("nextMarketId :", (await pm.nextMarketId()).toString());
  console.log("");

  for (const asset of ["ETH","BTC","SOMI"]) {
    const activeId = await pm.getActiveMarketId(asset);
    console.log(`── ${asset} activeMarketId: ${activeId}`);
    if (activeId > 0n) {
      const raw = await pm.getMarket(activeId);
      const m = raw[0] ?? raw;
      const deadline = Number(m.deadline);
      console.log(`  status    : ${statusMap[Number(m.status ?? m[6])]}`);
      console.log(`  deadline  : ${new Date(deadline*1000).toISOString()} ${deadline < now ? "⚠ EXPIRED" : "✓ open"}`);
      console.log(`  target    : $${(Number(m.targetPrice)/100).toFixed(2)}`);
      console.log(`  yesPool   : ${ethers.formatEther(m.yesPool)} STT`);
      console.log(`  noPool    : ${ethers.formatEther(m.noPool)} STT`);
    }
    console.log(`  lastMilestone: ${await hook.lastMilestone(asset)}`);
    console.log("");
  }
}
main().catch(console.error);