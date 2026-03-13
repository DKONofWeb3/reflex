// lib/abis/ReactivityHook.abi.ts
// ABI for ReactivityHook.sol — matches the deployed contract exactly
// Used primarily for the Smart Bet flow: fund → registerSmartBet → cancel/withdraw

export const REACTIVITY_HOOK_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  "function owner() view returns (address)",
  "function predictionMarket() view returns (address)",
  "function ethFeed() view returns (address)",
  "function btcFeed() view returns (address)",
  "function somiFeed() view returns (address)",
  "function nextSmartBetId() view returns (uint256)",
  "function lastMilestone(string asset) view returns (uint256)",

  // User's STT balance deposited for smart bets
  "function userBalance(address user) view returns (uint256)",

  // Returns array of smart bet IDs for a user
  "function getUserSmartBets(address user) view returns (uint256[])",

  // Returns full SmartBet struct
  "function getSmartBet(uint256 id) view returns (address user, string asset, bool isAbove, uint256 triggerPrice, uint8 side, uint256 betAmount, bool active)",

  // ── Write ─────────────────────────────────────────────────────────────────
  // Deposit STT to fund smart bets — send STT as msg.value
  "function fund() payable",

  // Register a conditional bet that fires automatically when condition is met
  // isAbove_: true = fire when price >= triggerPrice, false = when price <= triggerPrice
  // side_: 0 = YES, 1 = NO
  "function registerSmartBet(string asset_, bool isAbove_, uint256 triggerPrice_, uint8 side_, uint256 betAmount_) returns (uint256 id)",

  // Cancel an active smart bet (does NOT refund — use withdraw() separately)
  "function cancelSmartBet(uint256 id)",

  // Withdraw unfired funded balance
  "function withdraw(uint256 amount)",

  // Owner-only: manually trigger market creation for an asset (demo fallback)
  "function manualTrigger(string asset) external",

  // Owner-only: set the 3 price feed addresses
  "function setFeeds(address eth_, address btc_, address somi_)",

  // ── Events ────────────────────────────────────────────────────────────────
  "event SmartBetRegistered(uint256 indexed id, address indexed user, string asset, uint256 triggerPrice, uint8 side, uint256 amount)",
  "event SmartBetFired(uint256 indexed id, address indexed user, uint256 marketId)",
  "event SmartBetCancelled(uint256 indexed id, address indexed user)",
  "event Funded(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
  "event MarketAutoCreated(uint256 indexed marketId, string asset, uint256 targetPrice)",
  "event MarketAutoResolved(uint256 indexed marketId, string asset, bool hitTarget)",

  // ── Errors ────────────────────────────────────────────────────────────────
  "error NotOwner()",
  "error ZeroAmount()",
  "error InsufficientBalance()",
  "error SmartBetNotFound()",
  "error NotYourSmartBet()",
] as const;