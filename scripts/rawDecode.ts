import { ethers } from "hardhat";

const PM = "0xC2D7Cea4DD1F24f17fb25312383e8f305bD4654C";

async function main() {
  const [signer] = await ethers.getSigners();

  // Try 1: tuple ABI
  const abi1 = ["function getMarket(uint256) view returns ((uint256,string,string,uint256,uint256,uint256,uint8,uint256,uint256,uint256))"];
  const c1 = new ethers.Contract(PM, abi1, signer);
  try {
    const r = await c1.getMarket(2n);
    console.log("tuple ABI result:", JSON.stringify(r, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  } catch(e: any) { console.log("tuple ABI error:", e.message?.slice(0,80)); }

  // Try 2: flat ABI
  const abi2 = ["function getMarket(uint256) view returns (uint256,string,string,uint256,uint256,uint256,uint8,uint256,uint256,uint256)"];
  const c2 = new ethers.Contract(PM, abi2, signer);
  try {
    const r = await c2.getMarket(2n);
    console.log("\nflat ABI result[0]:", r[0]?.toString());
    console.log("flat ABI result[1]:", r[1]);
    console.log("flat ABI result[6]:", r[6]?.toString(), "(status)");
    console.log("flat ABI result[5]:", r[5]?.toString(), "(deadline)");
  } catch(e: any) { console.log("flat ABI error:", e.message?.slice(0,80)); }
}
main().catch(console.error);