// lib/abis/PredictionMarket.abi.ts
// ABI for PredictionMarket.sol — matches the deployed contract exactly
// Used to create ethers.js contract instances in useContracts.ts

export const PREDICTION_MARKET_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  "function owner() view returns (address)",
  "function hook() view returns (address)",
  "function nextMarketId() view returns (uint256)",
  "function MIN_BET() view returns (uint256)",

  // Returns full Market struct
  // Status enum: 0=ACTIVE, 1=RESOLVED_YES, 2=RESOLVED_NO, 3=EXPIRED
  "function getMarket(uint256 marketId) view returns ((uint256 id, string asset, string question, uint256 targetPrice, uint256 createdPrice, uint256 deadline, uint8 status, uint256 yesPool, uint256 noPool, uint256 resolvedAt) m)",

  // Returns the Bet struct for a user on a given market
  // Side enum: 0=YES, 1=NO
  "function getUserBet(uint256 marketId, address user) view returns (uint8 side, uint256 amount, bool claimed)",

  // Returns the active marketId for an asset (0 = none)
  "function getActiveMarketId(string asset) view returns (uint256)",

  // Returns yesPool + noPool combined
  "function getTotalPool(uint256 marketId) view returns (uint256)",

  // ── Write ─────────────────────────────────────────────────────────────────
  // Users call this to place a bet — send STT as msg.value
  // side: 0 = YES, 1 = NO
  "function placeBet(uint256 marketId, uint8 side) payable",

  // Winners call this to collect their payout after resolution
  "function claimPayout(uint256 marketId)",

  // Owner-only setup
  "function setHook(address hook_)",

  // ── Events ────────────────────────────────────────────────────────────────
  "event MarketCreated(uint256 indexed marketId, string asset, string question, uint256 targetPrice, uint256 deadline)",
  "event BetPlaced(uint256 indexed marketId, address indexed bettor, uint8 side, uint256 amount)",
  "event MarketResolved(uint256 indexed marketId, string asset, uint8 result, uint256 yesPool, uint256 noPool)",
  "event PayoutClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount)",

  // ── Errors ────────────────────────────────────────────────────────────────
  "error NotOwner()",
  "error NotHook()",
  "error MarketNotActive()",
  "error MarketAlreadyActive()",
  "error MarketNotResolved()",
  "error AlreadyBet()",
  "error BetTooSmall()",
  "error DeadlinePassed()",
  "error DeadlineNotPassed()",
  "error NothingToClaim()",
  "error TransferFailed()",
] as const;