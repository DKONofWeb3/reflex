import { ethers } from "hardhat";

const PREDICTION_MARKET = "0xC2D7Cea4DD1F24f17fb25312383e8f305bD4654C";
const HOOK = "0xC15b542145909030e3069fD76440C7A20291391e";

// Use raw ABI types that hardhat ethers can decode
const PM_ABI = [
  "function getActiveMarketId(string asset) view returns (uint256)",
  "function hook() view returns (address)",
  "function nextMarketId() view returns (uint256)",
  "function resolveMarket(uint256 marketId, bool hitTarget) external",
];

const HOOK_ABI = [
  "function lastMilestone(string asset) view returns (uint256)",
  "function manualTrigger(string asset) external",
];

// Manually decode the raw hex we already know
function decodeMarketHex(hex: string, asset: string) {
  try {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decoded = abiCoder.decode(
      ["uint256","uint256","uint256","uint256","uint256","uint256","uint8","uint256","uint256","uint256"],
      // skip the first 32 bytes (offset pointer) and the dynamic strings by extracting fixed fields
      // Actually let's try the full tuple
      "0x" + hex.slice(2 + 64) // skip first word (offset)
    );
    return decoded;
  } catch (e) {
    return null;
  }
}

async function main() {
  const [signer] = await ethers.getSigners();
  const pm   = new ethers.Contract(PREDICTION_MARKET, PM_ABI, signer);
  const hook = new ethers.Contract(HOOK, HOOK_ABI, signer);
  const now  = Math.floor(Date.now() / 1000);

  console.log("hook()       :", await pm.hook());
  console.log("nextMarketId :", (await pm.nextMarketId()).toString());
  console.log("now (unix)   :", now);
  console.log("");

  for (const asset of ["ETH","BTC","SOMI"]) {
    const activeId = await pm.getActiveMarketId(asset);
    console.log(`── ${asset} activeMarketId: ${activeId}`);
    if (activeId > 0n) {
      // Use low-level call to get raw bytes
      const iface = new ethers.Interface([
        "function getMarket(uint256) view returns (uint256,string,string,uint256,uint256,uint256,uint8,uint256,uint256,uint256)"
      ]);
      const calldata = iface.encodeFunctionData("getMarket", [activeId]);
      const raw = await signer.provider!.call({ to: PREDICTION_MARKET, data: calldata });
      try {
        const decoded = iface.decodeFunctionResult("getMarket", raw);
        const statusMap = ["ACTIVE","RESOLVED_YES","RESOLVED_NO","EXPIRED"];
        const deadline = Number(decoded[5]);
        const status   = Number(decoded[6]);
        const expired  = deadline < now;
        console.log(`  id           : ${decoded[0]}`);
        console.log(`  targetPrice  : $${(Number(decoded[3])/100).toFixed(2)}`);
        console.log(`  createdPrice : $${(Number(decoded[4])/100).toFixed(2)}`);
        console.log(`  deadline     : ${new Date(deadline*1000).toISOString()} ${expired ? "⚠ EXPIRED" : "✓ still open"}`);
        console.log(`  status       : ${statusMap[status]} (${status})`);
        console.log(`  yesPool      : ${ethers.formatEther(decoded[7])} STT`);
        console.log(`  noPool       : ${ethers.formatEther(decoded[8])} STT`);
      } catch(e: any) {
        console.log("  decode error:", e.message?.slice(0,80));
      }
    }
    try {
      console.log(`  lastMilestone: ${await hook.lastMilestone(asset)}`);
    } catch {}
    console.log("");
  }
}
main().catch(console.error);