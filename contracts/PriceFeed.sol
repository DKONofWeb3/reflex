// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// contracts/PriceFeed.sol
// ─────────────────────────────────────────────────────────────────────────────
// Stores the current price for one asset (ETH, BTC, or SOMI).
// Deployed 3 times — once per asset.
//
// How it works:
//   1. Owner calls setPrice(newPrice) to update the price
//   2. Contract emits PriceUpdated(asset, newPrice)
//   3. ReactivityHook.sol listens for that event and fires market logic
//
// Prices are stored as integers × 100 to support 2 decimal places
// without using floats (Solidity doesn't support floats).
//   e.g. $2000.50 → stored as 200050
//        $0.45    → stored as 45
//
// For the demo: the frontend calls setPrice() to simulate price movement.
// In production: a real oracle (Chainlink etc.) would call this.
// ─────────────────────────────────────────────────────────────────────────────

contract PriceFeed {

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    string  public asset;        // "ETH", "BTC", or "SOMI"
    uint256 public currentPrice; // price × 100 (e.g. $2000 = 200000)
    uint256 public updatedAt;    // timestamp of last price update

    // ─── Events ───────────────────────────────────────────────────────────────

    // Emitted every time price changes.
    // ReactivityHook subscribes to this event and triggers market creation/settlement.
    event PriceUpdated(string indexed asset, uint256 newPrice, uint256 timestamp);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error PriceUnchanged();
    error InvalidPrice();

    // ─── Constructor ──────────────────────────────────────────────────────────

    // asset_       : "ETH", "BTC", or "SOMI"
    // initialPrice : starting price × 100 (e.g. pass 200000 for $2000.00)
    constructor(string memory asset_, uint256 initialPrice) {
        owner        = msg.sender;
        asset        = asset_;
        currentPrice = initialPrice;
        updatedAt    = block.timestamp;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Functions ────────────────────────────────────────────────────────────

    // Update the price and emit PriceUpdated.
    // This is the trigger that sets the entire Reactivity chain in motion.
    // newPrice: price × 100 (e.g. pass 210000 for $2100.00)
    function setPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0)            revert InvalidPrice();
        if (newPrice == currentPrice) revert PriceUnchanged();

        currentPrice = newPrice;
        updatedAt    = block.timestamp;

        emit PriceUpdated(asset, newPrice, block.timestamp);
    }

    // Transfer ownership to a new address (e.g. a multisig for production)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    // Returns a formatted price string for convenience (divide by 100 off-chain)
    function getPrice() external view returns (uint256 price, uint256 timestamp) {
        return (currentPrice, updatedAt);
    }
}
