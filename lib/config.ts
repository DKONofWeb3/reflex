// lib/config.ts
// Central config file for the entire app
// Contains:
//   - Somnia testnet chain details (RPC URL, chain ID, explorer)
//   - ASSETS: config for ETH, BTC, SOMI (colors, milestone steps, initial prices)
//   - CONTRACTS: all deployed contract addresses (pulled from .env)
//   - MARKET_DURATION: how long each market runs
//   - REACTIVITY_CONFIG: gas settings for the Reactivity SDK subscriptions

export const SOMNIA_TESTNET = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "STT",
    symbol: "STT",
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://dream-rpc.somnia.network",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "wss://dream-rpc.somnia.network",
  blockExplorer:
    process.env.NEXT_PUBLIC_EXPLORER_URL ||
    "https://somnia-testnet.socialscan.io",
};

// ─── Asset Config ───────────────────────────────────────────────────────────────
// milestoneStep = price jump that triggers a new market
// targetStep    = how far above milestone the market target is set
// decimals      = display decimal places for price

export const ASSETS = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    color: "#8B5CF6",          // Somnia violet for ETH
    priceFeedAddress: process.env.NEXT_PUBLIC_PRICE_FEED_ETH || "",
    milestoneStep: 100,
    targetStep: 100,
    decimals: 2,
    initialPrice: 2000,
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    color: "#D946EF",          // Somnia magenta for BTC
    priceFeedAddress: process.env.NEXT_PUBLIC_PRICE_FEED_BTC || "",
    milestoneStep: 1000,
    targetStep: 1000,
    decimals: 0,
    initialPrice: 94000,
  },
  SOMI: {
    symbol: "SOMI",
    name: "Somnia",
    color: "#EAB308",          // yellow for SOMI (native token, stands out)
    priceFeedAddress: process.env.NEXT_PUBLIC_PRICE_FEED_SOMI || "",
    milestoneStep: 5,
    targetStep: 5,
    decimals: 4,
    initialPrice: 0.45,
  },
} as const;

export type AssetSymbol = keyof typeof ASSETS;

// ─── Deployed Contract Addresses ───────────────────────────────────────────────
// These will be empty until you deploy in Phase 2

export const CONTRACTS = {
  PREDICTION_MARKET: process.env.NEXT_PUBLIC_PREDICTION_MARKET || "",
  REACTIVITY_HOOK: process.env.NEXT_PUBLIC_REACTIVITY_HOOK || "",
  PRICE_FEEDS: {
    ETH: process.env.NEXT_PUBLIC_PRICE_FEED_ETH || "",
    BTC: process.env.NEXT_PUBLIC_PRICE_FEED_BTC || "",
    SOMI: process.env.NEXT_PUBLIC_PRICE_FEED_SOMI || "",
  },
};

// ─── Market Config ──────────────────────────────────────────────────────────────

export const MARKET_DURATION = 10 * 60; // 10 minutes in seconds
export const MIN_BET = "0.01";          // minimum bet in STT

// ─── Reactivity SDK Gas Config ──────────────────────────────────────────────────
// ReactivityHook makes MULTIPLE cross-contract calls (_onEvent calls createMarket,
// resolveMarket, placeBet) so we use the "Complex" handler gas config from Somnia docs.
//
// ⚠️  DO NOT lower these values — too low = silent failure (validators skip handler)
// Source: https://docs.somnia.network/developer/reactivity/gas-configuration
export const REACTIVITY_CONFIG = {
  priorityFeePerGas: BigInt("10000000000"), // 10 gwei — tip for validators (Complex handler)
  maxFeePerGas:      BigInt("20000000000"), // 20 gwei — max ceiling (Complex handler)
  gasLimit:          BigInt("10000000"),    // 10M gas — multiple external calls + storage reserve
  isGuaranteed: true,   // ensure eventual delivery
  isCoalesced:  false,  // process each price update individually
};
