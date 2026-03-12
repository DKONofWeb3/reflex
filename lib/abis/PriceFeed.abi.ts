// lib/abis/PriceFeed.abi.ts
// ABI for PriceFeed.sol — matches the deployed contract exactly
// Used to create ethers.js contract instances in useContracts.ts

export const PRICE_FEED_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  "function owner() view returns (address)",
  "function asset() view returns (string)",
  "function currentPrice() view returns (uint256)",
  "function updatedAt() view returns (uint256)",
  "function getPrice() view returns (uint256 price, uint256 timestamp)",

  // ── Write ─────────────────────────────────────────────────────────────────
  "function setPrice(uint256 newPrice)",
  "function transferOwnership(address newOwner)",

  // ── Events ────────────────────────────────────────────────────────────────
  "event PriceUpdated(string indexed asset, uint256 newPrice, uint256 timestamp)",

  // ── Errors ────────────────────────────────────────────────────────────────
  "error NotOwner()",
  "error PriceUnchanged()",
  "error InvalidPrice()",
] as const;