 // types/index.ts
// All shared TypeScript types for REFLEX
// Imported across contracts interaction hooks, components, and pages
// Sections:
//   - Market types (Market, MarketSide, MarketStatus)
//   - Bet types (UserBet)
//   - Smart Bet types (SmartBet, SmartBetCondition)
//   - Activity Feed types (ActivityEvent, ActivityEventType)
//   - Price Feed types (PriceData)
//   - Wallet types (WalletState)

import { AssetSymbol } from "@/lib/config";

// ─── Market ─────────────────────────────────────────────────────────────────────

export type MarketSide = "YES" | "NO";

export type MarketStatus =
  | "PENDING"
  | "ACTIVE"
  | "RESOLVED_YES"
  | "RESOLVED_NO"
  | "EXPIRED";

export interface Market {
  id: bigint;
  asset: AssetSymbol;
  question: string;          // e.g. "Will ETH reach $2100 in 10 minutes?"
  targetPrice: bigint;       // stored ×100 (e.g. $2100 = 210000n)
  currentPrice: bigint;
  deadline: number;          // Unix timestamp when market closes
  status: MarketStatus;
  yesPool: bigint;           // total STT (in wei) bet on YES
  noPool: bigint;            // total STT (in wei) bet on NO
  totalPool: bigint;
  resolvedAt?: number;       // Unix timestamp of resolution
  winner?: MarketSide;
  createdAt: number;
}

// ─── Bets ───────────────────────────────────────────────────────────────────────

export interface UserBet {
  marketId: bigint;
  side: MarketSide;
  amount: bigint;            // in wei
  claimed: boolean;
  payout?: bigint;           // populated after resolution
}

// ─── Smart Bets ─────────────────────────────────────────────────────────────────
// Conditional bets the user sets up in advance
// e.g. "If ETH drops below $1900, bet 5 STT on YES automatically"

export type SmartBetCondition = "ABOVE" | "BELOW";

export interface SmartBet {
  id: string;
  asset: AssetSymbol;
  condition: SmartBetCondition;  // trigger when price is ABOVE or BELOW triggerPrice
  triggerPrice: bigint;          // price that activates the bet (×100)
  marketSide: MarketSide;        // YES or NO
  betAmount: bigint;             // how much to bet in wei
  active: boolean;               // false once fired
  firedAt?: number;              // timestamp when Reactivity executed it
  txHash?: string;
}

// ─── Activity Feed ───────────────────────────────────────────────────────────────
// Real-time on-chain event log shown on the dashboard

export type ActivityEventType =
  | "PRICE_UPDATE"
  | "MARKET_CREATED"
  | "BET_PLACED"
  | "MARKET_RESOLVED"
  | "PAYOUT_SENT"
  | "SMART_BET_FIRED";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  asset?: AssetSymbol;
  message: string;           // e.g. "ETH hit $2000 → Market created"
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  data?: Record<string, unknown>;
}

// ─── Price Feed ─────────────────────────────────────────────────────────────────

export interface PriceData {
  asset: AssetSymbol;
  price: bigint;             // stored ×100
  displayPrice: number;      // actual float for rendering
  lastUpdated: number;       // Unix timestamp
  change24h?: number;        // percentage change (optional)
}

// ─── Wallet ─────────────────────────────────────────────────────────────────────

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: bigint | null;    // STT balance in wei
  isCorrectNetwork: boolean; // true when on Somnia testnet (chainId 50312)
}