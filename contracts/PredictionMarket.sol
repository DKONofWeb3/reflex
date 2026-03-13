// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// contracts/PredictionMarket.sol
// ─────────────────────────────────────────────────────────────────────────────
// Core prediction market contract for REFLEX.
// Handles the full lifecycle of every market:
//   createMarket → placeBet → resolveMarket → claimPayout
//
// Markets are created and resolved AUTONOMOUSLY by ReactivityHook.sol.
// Users interact with: placeBet() and claimPayout() directly.
// ReactivityHook also calls placeBet() for Smart Bets (auto-execute).
//
// Payout formula (winner's share):
//   payout = (userBet / totalWinningSidePool) × totalPool
//
// Prices stored as uint256 × 100 (e.g. $2000.00 = 200000)
// Bets paid in native STT (Somnia's gas token)
// ─────────────────────────────────────────────────────────────────────────────

contract PredictionMarket {

    // ─── Types ────────────────────────────────────────────────────────────────

    enum Side   { YES, NO }
    enum Status { ACTIVE, RESOLVED_YES, RESOLVED_NO, EXPIRED }

    struct Market {
        uint256 id;
        string  asset;           // "ETH", "BTC", "SOMI"
        string  question;        // "Will ETH reach $2100 in 10 minutes?"
        uint256 targetPrice;     // price × 100
        uint256 createdPrice;    // price at market creation × 100
        uint256 deadline;        // unix timestamp when market closes
        Status  status;
        uint256 yesPool;         // total STT bet on YES (wei)
        uint256 noPool;          // total STT bet on NO  (wei)
        uint256 resolvedAt;      // timestamp of resolution (0 if unresolved)
    }

    struct Bet {
        Side    side;
        uint256 amount;          // in wei
        bool    claimed;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public hook;         // ReactivityHook address — the only one allowed to create/resolve

    uint256 public nextMarketId;
    uint256 public constant MIN_BET = 0.001 ether; // minimum bet: 0.001 STT

    // marketId → Market
    mapping(uint256 => Market) public markets;

    // marketId → user address → Bet
    mapping(uint256 => mapping(address => Bet)) public bets;

    // asset string → active marketId (0 = no active market for that asset)
    // Prevents two simultaneous active markets for the same asset
    mapping(string => uint256) public activeMarketByAsset;

    // ─── Events ───────────────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string  asset,
        string  question,
        uint256 targetPrice,
        uint256 deadline
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        Side    side,
        uint256 amount
    );

    event MarketResolved(
        uint256 indexed marketId,
        string  asset,
        Status  result,
        uint256 yesPool,
        uint256 noPool
    );

    event PayoutClaimed(
        uint256 indexed marketId,
        address indexed bettor,
        uint256 amount
    );

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error NotHook();
    error MarketNotActive();
    error MarketAlreadyActive();
    error MarketNotResolved();
    error AlreadyBet();
    error BetTooSmall();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NothingToClaim();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        nextMarketId = 1; // start at 1, 0 is used as "no active market"
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // Only the ReactivityHook contract can create and resolve markets.
    // Also allows the owner for testing.
    modifier onlyHook() {
        if (msg.sender != hook && msg.sender != owner) revert NotHook();
        _;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    // Called once after deploying ReactivityHook.
    // Links this contract to the hook so it knows who is authorised.
    function setHook(address hook_) external onlyOwner {
        hook = hook_;
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    // Called by ReactivityHook when a price milestone is hit.
    // Creates a new market for the given asset.
    //
    // asset_       : "ETH", "BTC", or "SOMI"
    // question_    : "Will ETH reach $2100 in 10 minutes?"
    // targetPrice_ : the price × 100 that resolves the market YES
    // createdPrice_: current price at time of creation × 100
    // duration_    : how many seconds the market runs (e.g. 600 = 10 min)
    function createMarket(
        string  memory asset_,
        string  memory question_,
        uint256 targetPrice_,
        uint256 createdPrice_,
        uint256 duration_
    ) external onlyHook returns (uint256 marketId) {
        // Prevent two active markets for the same asset simultaneously
        uint256 existingId = activeMarketByAsset[asset_];
        if (existingId != 0) {
            Market storage existing = markets[existingId];
            if (existing.status == Status.ACTIVE) revert MarketAlreadyActive();
        }

        marketId = nextMarketId++;

        markets[marketId] = Market({
            id:           marketId,
            asset:        asset_,
            question:     question_,
            targetPrice:  targetPrice_,
            createdPrice: createdPrice_,
            deadline:     block.timestamp + duration_,
            status:       Status.ACTIVE,
            yesPool:      0,
            noPool:       0,
            resolvedAt:   0
        });

        activeMarketByAsset[asset_] = marketId;

        emit MarketCreated(marketId, asset_, question_, targetPrice_, block.timestamp + duration_);
    }

    // Place a bet on an active market.
    // Called by users directly, OR by ReactivityHook for Smart Bets.
    // side : 0 = YES, 1 = NO
    // Value sent with tx = bet amount in STT
    function placeBet(uint256 marketId, Side side) external payable {
        Market storage market = markets[marketId];

        if (market.status != Status.ACTIVE)       revert MarketNotActive();
        if (block.timestamp >= market.deadline)    revert DeadlinePassed();
        if (msg.value < MIN_BET)                   revert BetTooSmall();
        if (bets[marketId][msg.sender].amount > 0) revert AlreadyBet();

        bets[marketId][msg.sender] = Bet({ side: side, amount: msg.value, claimed: false });

        if (side == Side.YES) {
            market.yesPool += msg.value;
        } else {
            market.noPool += msg.value;
        }

        emit BetPlaced(marketId, msg.sender, side, msg.value);
    }

    // Called by ReactivityHook when the target price is hit OR deadline expires.
    // hitTarget: true = price hit target (YES wins), false = deadline expired (NO wins)
    function resolveMarket(uint256 marketId, bool hitTarget) external onlyHook {
        Market storage market = markets[marketId];

        if (market.status != Status.ACTIVE) revert MarketNotActive();

        // If resolving by deadline expiry, make sure deadline has actually passed
        if (!hitTarget && block.timestamp < market.deadline) revert DeadlineNotPassed();

        market.status     = hitTarget ? Status.RESOLVED_YES : Status.RESOLVED_NO;
        market.resolvedAt = block.timestamp;

        // Clear the active market slot for this asset
        activeMarketByAsset[market.asset] = 0;

        emit MarketResolved(marketId, market.asset, market.status, market.yesPool, market.noPool);
    }

    // Called by winners to collect their payout after market resolution.
    // Payout formula: (userBet / totalWinningSidePool) × totalPool
    function claimPayout(uint256 marketId) external {
        Market storage market = markets[marketId];
        Bet    storage bet    = bets[marketId][msg.sender];

        if (market.status == Status.ACTIVE) revert MarketNotResolved();
        if (bet.amount == 0 || bet.claimed)  revert NothingToClaim();

        // Determine which side won
        bool yesWon = (market.status == Status.RESOLVED_YES);
        bool userWon = (yesWon && bet.side == Side.YES) || (!yesWon && bet.side == Side.NO);

        if (!userWon) revert NothingToClaim();

        uint256 winningPool = yesWon ? market.yesPool : market.noPool;
        uint256 totalPool   = market.yesPool + market.noPool;

        // Calculate proportional payout
        uint256 payout = (bet.amount * totalPool) / winningPool;

        bet.claimed = true;

        (bool ok, ) = payable(msg.sender).call{ value: payout }("");
        if (!ok) revert TransferFailed();

        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (
        uint256 id, string memory asset, string memory question,
        uint256 targetPrice, uint256 createdPrice, uint256 deadline,
        uint8 status, uint256 yesPool, uint256 noPool, uint256 resolvedAt
    ) {
        Market storage m = markets[marketId];
        return (m.id, m.asset, m.question, m.targetPrice, m.createdPrice,
                m.deadline, uint8(m.status), m.yesPool, m.noPool, m.resolvedAt);
    }

    function getUserBet(uint256 marketId, address user) external view returns (Bet memory) {
        return bets[marketId][user];
    }

    function getActiveMarketId(string calldata asset_) external view returns (uint256) {
        return activeMarketByAsset[asset_];
    }

    function getTotalPool(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        return m.yesPool + m.noPool;
    }
}
