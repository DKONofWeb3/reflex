// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// contracts/ReactivityHook.sol
// ─────────────────────────────────────────────────────────────────────────────
// The autonomous brain of REFLEX.
// Extends SomniaEventHandler — Somnia's Reactivity SDK base contract.
//
// This contract gets INVOKED BY THE CHAIN (by validators) whenever a
// PriceUpdated event is emitted by any of the 3 PriceFeed contracts.
// No cron job. No off-chain bot. The blockchain itself runs this logic.
//
// What it does when a price update comes in:
//   1. MARKET CREATION  — if price hits a milestone, create a new market
//   2. MARKET SETTLEMENT — if price hits an active market's target, resolve it YES
//   3. MARKET EXPIRY    — if a market's deadline has passed, resolve it NO
//   4. SMART BETS       — if a user's condition is met, auto-execute their bet
//
// NOTE: SomniaEventHandler is the base contract from @somnia-chain/reactivity-contracts.
//       It provides the _onEvent() hook that validators call.
//       We override _onEvent() with our market logic.
//
// ⚠️  GAS WARNING (from Somnia docs):
//   - This handler does multiple cross-contract calls → use "Complex" gas config
//   - priorityFeePerGas: parseGwei('10')  = 10_000_000_000n
//   - maxFeePerGas:      parseGwei('20')  = 20_000_000_000n
//   - gasLimit:          10_000_000n
//   Setting these too low = silent failure. Validators will skip the handler.
// ─────────────────────────────────────────────────────────────────────────────

// Interface for the Somnia Reactivity base contract.
// In your actual project install: npm i @somnia-chain/reactivity-contracts
// Then import: import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
// We define the interface inline here so the contract compiles standalone.
abstract contract SomniaEventHandler {
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal virtual;

    // Called by Somnia validators when a subscribed event fires
    function onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external {
        _onEvent(emitter, eventTopics, data);
    }
}

// Minimal interface to call PredictionMarket from within this contract
interface IPredictionMarket {
    enum Side { YES, NO }
    function createMarket(
        string  memory asset_,
        string  memory question_,
        uint256 targetPrice_,
        uint256 createdPrice_,
        uint256 duration_
    ) external returns (uint256 marketId);
    function resolveMarket(uint256 marketId, bool hitTarget) external;
    function placeBet(uint256 marketId, IPredictionMarket.Side side) external payable;
    function getActiveMarketId(string calldata asset_) external view returns (uint256);
    function getMarket(uint256 marketId) external view returns (
        uint256 id, string memory asset, string memory question,
        uint256 targetPrice, uint256 createdPrice, uint256 deadline,
        uint8 status, uint256 yesPool, uint256 noPool, uint256 resolvedAt
    );
}

// Minimal interface to read price from PriceFeed contracts
interface IPriceFeed {
    function getPrice() external view returns (uint256 price, uint256 timestamp);
}

contract ReactivityHook is SomniaEventHandler {

    // ─── Constants ────────────────────────────────────────────────────────────

    // PriceUpdated(string indexed asset, uint256 newPrice, uint256 timestamp)
    // keccak256("PriceUpdated(string,uint256,uint256)")
    bytes32 public constant PRICE_UPDATED_SIG =
        keccak256("PriceUpdated(string,uint256,uint256)");

    // Market lasts 10 minutes
    uint256 public constant MARKET_DURATION = 10 minutes;

    // Milestone step per asset (price × 100):
    //   ETH:  every 10000 = $100
    //   BTC:  every 100000 = $1000
    //   SOMI: every 500 = $0.05 (stored × 100, so 0.05 × 100 = 5 → × 100 = 500)
    uint256 public constant ETH_MILESTONE_STEP  = 10_000;   // $100
    uint256 public constant BTC_MILESTONE_STEP  = 100_000;  // $1000
    uint256 public constant SOMI_MILESTONE_STEP = 500;      // $0.05

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    IPredictionMarket public predictionMarket;

    // Track the last milestone price per asset to avoid re-triggering
    mapping(string => uint256) public lastMilestone;

    // Smart Bets: stored per user
    // Each smart bet: auto-place a bet when price crosses a threshold
    struct SmartBet {
        address user;
        string  asset;
        bool    isAbove;         // true = fire when price ≥ triggerPrice, false = when price ≤
        uint256 triggerPrice;    // price × 100
        uint8   side;            // 0 = YES, 1 = NO
        uint256 betAmount;       // in wei (STT)
        bool    active;
    }

    uint256 public nextSmartBetId;
    mapping(uint256 => SmartBet) public smartBets;
    // user → list of their smart bet IDs
    mapping(address => uint256[]) public userSmartBets;

    // Funded balance per user (deposited in advance for smart bets)
    mapping(address => uint256) public userBalance;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SmartBetRegistered(uint256 indexed id, address indexed user, string asset, uint256 triggerPrice, uint8 side, uint256 amount);
    event SmartBetFired(uint256 indexed id, address indexed user, uint256 marketId);
    event SmartBetCancelled(uint256 indexed id, address indexed user);
    event Funded(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event MarketAutoCreated(uint256 indexed marketId, string asset, uint256 targetPrice);
    event MarketAutoResolved(uint256 indexed marketId, string asset, bool hitTarget);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAmount();
    error InsufficientBalance();
    error SmartBetNotFound();
    error NotYourSmartBet();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address predictionMarket_) {
        owner             = msg.sender;
        predictionMarket  = IPredictionMarket(predictionMarket_);
        nextSmartBetId    = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── _onEvent: The Reactivity Entry Point ─────────────────────────────────
    //
    // This function is called by Somnia validators whenever a PriceUpdated
    // event is emitted from any of the 3 subscribed PriceFeed contracts.
    //
    // Parameters (decoded from the raw event):
    //   emitter     : address of the PriceFeed contract that emitted
    //   eventTopics : [eventSig, keccak256(asset)] — indexed params
    //   data        : abi.encoded(newPrice, timestamp) — non-indexed params
    // ─────────────────────────────────────────────────────────────────────────
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Verify this is the event we care about
        if (eventTopics.length < 2) return;
        if (eventTopics[0] != PRICE_UPDATED_SIG) return;

        // Decode non-indexed data: (uint256 newPrice, uint256 timestamp)
        (uint256 newPrice, ) = abi.decode(data, (uint256, uint256));
        if (newPrice == 0) return;

        // Decode the indexed asset string hash from topic[1]
        // Note: indexed strings are stored as keccak256(value) in topics,
        // so we can't reverse them — instead we check all 3 known feeds.
        // The emitter address tells us which PriceFeed fired.
        string memory asset = _resolveAsset(emitter);
        if (bytes(asset).length == 0) return; // unknown emitter

        // ── Step 1: Check if any active market should be resolved ─────────────
        _checkAndResolveMarket(asset, newPrice);

        // ── Step 2: Check if price hit a milestone → create new market ────────
        _checkAndCreateMarket(asset, newPrice);

        // ── Step 3: Check smart bets for this asset ───────────────────────────
        _checkSmartBets(asset, newPrice);
    }

    // ─── Step 1: Resolve active market ────────────────────────────────────────

    function _checkAndResolveMarket(string memory asset, uint256 newPrice) internal {
        uint256 marketId = predictionMarket.getActiveMarketId(asset);
        if (marketId == 0) return; // no active market

        (
            , // id
            , // asset
            , // question
            uint256 targetPrice,
            , // createdPrice
            uint256 deadline,
            uint8 status,
            , // yesPool
            , // noPool
            // resolvedAt
        ) = predictionMarket.getMarket(marketId);

        if (status != 0) return; // not ACTIVE (0 = ACTIVE)

        // Resolve YES: price hit the target
        if (newPrice >= targetPrice) {
            predictionMarket.resolveMarket(marketId, true);
            emit MarketAutoResolved(marketId, asset, true);
            return;
        }

        // Resolve NO: deadline has passed
        if (block.timestamp >= deadline) {
            predictionMarket.resolveMarket(marketId, false);
            emit MarketAutoResolved(marketId, asset, false);
        }
    }

    // ─── Step 2: Create new market on milestone ───────────────────────────────

    function _checkAndCreateMarket(string memory asset, uint256 newPrice) internal {
        // Skip if there's already an active market for this asset
        if (predictionMarket.getActiveMarketId(asset) != 0) return;

        uint256 step = _getMilestoneStep(asset);
        if (step == 0) return;

        // Calculate which milestone this price has crossed
        uint256 milestone = (newPrice / step) * step;

        // Only trigger if we've crossed a NEW milestone (not the same one again)
        if (milestone <= lastMilestone[asset]) return;
        lastMilestone[asset] = milestone;

        uint256 targetPrice = milestone + step;

        // Build question string
        string memory question = _buildQuestion(asset, targetPrice);

        uint256 marketId = predictionMarket.createMarket(
            asset,
            question,
            targetPrice,
            newPrice,
            MARKET_DURATION
        );

        emit MarketAutoCreated(marketId, asset, targetPrice);
    }

    // ─── Step 3: Fire smart bets ──────────────────────────────────────────────

    function _checkSmartBets(string memory asset, uint256 newPrice) internal {
        // We iterate through ALL smart bets.
        // In production you'd maintain an asset-indexed list for gas efficiency,
        // but for this hackathon demo scope this is fine.
        for (uint256 i = 1; i < nextSmartBetId; i++) {
            SmartBet storage sb = smartBets[i];
            if (!sb.active) continue;

            // Only process bets for this asset
            if (keccak256(bytes(sb.asset)) != keccak256(bytes(asset))) continue;

            bool conditionMet = sb.isAbove
                ? newPrice >= sb.triggerPrice
                : newPrice <= sb.triggerPrice;

            if (!conditionMet) continue;

            // Check the user has a funded balance
            if (userBalance[sb.user] < sb.betAmount) {
                // Not enough balance — deactivate the bet
                sb.active = false;
                continue;
            }

            uint256 marketId = predictionMarket.getActiveMarketId(asset);
            if (marketId == 0) continue; // no active market to bet on

            // Deduct from user's funded balance and fire the bet
            userBalance[sb.user] -= sb.betAmount;
            sb.active = false;

            predictionMarket.placeBet{ value: sb.betAmount }(
                marketId,
                IPredictionMarket.Side(sb.side)
            );

            emit SmartBetFired(i, sb.user, marketId);
        }
    }

    // ─── Smart Bet Registration (called by users via frontend) ────────────────

    // User deposits STT to fund their smart bets
    function fund() external payable {
        if (msg.value == 0) revert ZeroAmount();
        userBalance[msg.sender] += msg.value;
        emit Funded(msg.sender, msg.value);
    }

    // Register a smart bet.
    // The bet will fire automatically when the condition is met.
    //
    // asset_       : "ETH", "BTC", or "SOMI"
    // isAbove_     : true = trigger when price ≥ triggerPrice
    //                false = trigger when price ≤ triggerPrice
    // triggerPrice_: price threshold × 100
    // side_        : 0 = YES, 1 = NO
    // betAmount_   : amount in wei (must be pre-funded via fund())
    function registerSmartBet(
        string  memory asset_,
        bool    isAbove_,
        uint256 triggerPrice_,
        uint8   side_,
        uint256 betAmount_
    ) external returns (uint256 id) {
        if (betAmount_ == 0)                    revert ZeroAmount();
        if (userBalance[msg.sender] < betAmount_) revert InsufficientBalance();

        id = nextSmartBetId++;

        smartBets[id] = SmartBet({
            user:         msg.sender,
            asset:        asset_,
            isAbove:      isAbove_,
            triggerPrice: triggerPrice_,
            side:         side_,
            betAmount:    betAmount_,
            active:       true
        });

        userSmartBets[msg.sender].push(id);

        emit SmartBetRegistered(id, msg.sender, asset_, triggerPrice_, side_, betAmount_);
    }

    // Cancel an active smart bet and refund reserved amount
    function cancelSmartBet(uint256 id) external {
        SmartBet storage sb = smartBets[id];
        if (!sb.active)              revert SmartBetNotFound();
        if (sb.user != msg.sender)   revert NotYourSmartBet();

        sb.active = false;
        emit SmartBetCancelled(id, msg.sender);
    }

    // Withdraw unfired funded balance
    function withdraw(uint256 amount) external {
        if (amount == 0)                      revert ZeroAmount();
        if (userBalance[msg.sender] < amount) revert InsufficientBalance();

        userBalance[msg.sender] -= amount;
        (bool ok,) = payable(msg.sender).call{ value: amount }("");
        require(ok, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getUserSmartBets(address user) external view returns (uint256[] memory) {
        return userSmartBets[user];
    }

    function getSmartBet(uint256 id) external view returns (SmartBet memory) {
        return smartBets[id];
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    // Known PriceFeed contract addresses — set after deployment
    address public ethFeed;
    address public btcFeed;
    address public somiFeed;

    // ─── Manual trigger (owner-only fallback) ─────────────────────────────────
    // Allows the owner to manually trigger market creation + resolution for an
    // asset. Used as a demo fallback when Somnia Reactivity testnet is flaky.
    function manualTrigger(string calldata asset) external onlyOwner {
        address feed;
        if      (keccak256(bytes(asset)) == keccak256("ETH"))  feed = ethFeed;
        else if (keccak256(bytes(asset)) == keccak256("BTC"))  feed = btcFeed;
        else if (keccak256(bytes(asset)) == keccak256("SOMI")) feed = somiFeed;
        else revert("Unknown asset");

        (uint256 currentPrice, ) = IPriceFeed(feed).getPrice();
        _checkAndResolveMarket(asset, currentPrice);
        _checkAndCreateMarket(asset, currentPrice);
    }

    function setFeeds(address eth_, address btc_, address somi_) external onlyOwner {
        ethFeed  = eth_;
        btcFeed  = btc_;
        somiFeed = somi_;
    }

    // Map emitter address → asset string
    function _resolveAsset(address emitter) internal view returns (string memory) {
        if (emitter == ethFeed)  return "ETH";
        if (emitter == btcFeed)  return "BTC";
        if (emitter == somiFeed) return "SOMI";
        return "";
    }

    // Get the milestone step for an asset
    function _getMilestoneStep(string memory asset) internal pure returns (uint256) {
        bytes32 h = keccak256(bytes(asset));
        if (h == keccak256("ETH"))  return ETH_MILESTONE_STEP;
        if (h == keccak256("BTC"))  return BTC_MILESTONE_STEP;
        if (h == keccak256("SOMI")) return SOMI_MILESTONE_STEP;
        return 0;
    }

    // Build a human-readable market question
    // targetPrice is stored × 100, so divide by 100 for display
    // We return a simple string — for the hackathon this is fine
    function _buildQuestion(
        string memory asset,
        uint256 targetPrice
    ) internal pure returns (string memory) {
        // Simple question: "Will [ASSET] reach [PRICE] in 10 minutes?"
        // Full price formatting in Solidity is verbose; we keep it readable for the demo
        return string(abi.encodePacked(
            "Will ", asset, " hit target price in 10 minutes?"
        ));
    }

    // Allow this contract to receive STT (needed for placeBet calls)
    receive() external payable {}
}
