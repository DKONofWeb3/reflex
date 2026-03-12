// lib/contracts.ts
// Factory functions that return typed ethers.js Contract instances.
// Use these everywhere in hooks instead of manually creating contracts.
//
// Two variants per contract:
//   getXxxContract()        → read-only (uses JSON-RPC provider, no wallet needed)
//   getXxxContractSigner()  → read+write (uses MetaMask signer, wallet required)
//
// Usage:
//   const market = getPredictionMarketContract();
//   const data = await market.getMarket(1n);
//
//   const market = await getPredictionMarketContractSigner();
//   await market.placeBet(1n, 0, { value: parseEther("0.1") });

import { ethers } from "ethers";
import { CONTRACTS, ASSETS, AssetSymbol } from "@/lib/config";
import { getReadProvider, getSigner } from "@/lib/provider";
import { PRICE_FEED_ABI }       from "@/lib/abis/PriceFeed.abi";
import { PREDICTION_MARKET_ABI } from "@/lib/abis/PredictionMarket.abi";
import { REACTIVITY_HOOK_ABI }  from "@/lib/abis/ReactivityHook.abi";

// ─── PriceFeed ────────────────────────────────────────────────────────────────

export function getPriceFeedContract(asset: AssetSymbol): ethers.Contract {
  const address = CONTRACTS.PRICE_FEEDS[asset];
  if (!address) throw new Error(`PriceFeed address not set for ${asset}`);
  return new ethers.Contract(address, PRICE_FEED_ABI, getReadProvider());
}

export async function getPriceFeedContractSigner(asset: AssetSymbol): Promise<ethers.Contract> {
  const address = CONTRACTS.PRICE_FEEDS[asset];
  if (!address) throw new Error(`PriceFeed address not set for ${asset}`);
  return new ethers.Contract(address, PRICE_FEED_ABI, await getSigner());
}

// ─── PredictionMarket ─────────────────────────────────────────────────────────

export function getPredictionMarketContract(): ethers.Contract {
  const address = CONTRACTS.PREDICTION_MARKET;
  if (!address) throw new Error("PredictionMarket address not set");
  return new ethers.Contract(address, PREDICTION_MARKET_ABI, getReadProvider());
}

export async function getPredictionMarketContractSigner(): Promise<ethers.Contract> {
  const address = CONTRACTS.PREDICTION_MARKET;
  if (!address) throw new Error("PredictionMarket address not set");
  return new ethers.Contract(address, PREDICTION_MARKET_ABI, await getSigner());
}

// ─── ReactivityHook ───────────────────────────────────────────────────────────

export function getReactivityHookContract(): ethers.Contract {
  const address = CONTRACTS.REACTIVITY_HOOK;
  if (!address) throw new Error("ReactivityHook address not set");
  return new ethers.Contract(address, REACTIVITY_HOOK_ABI, getReadProvider());
}

export async function getReactivityHookContractSigner(): Promise<ethers.Contract> {
  const address = CONTRACTS.REACTIVITY_HOOK;
  if (!address) throw new Error("ReactivityHook address not set");
  return new ethers.Contract(address, REACTIVITY_HOOK_ABI, await getSigner());
}

// ─── All price feeds as a map ─────────────────────────────────────────────────

export function getAllPriceFeedContracts(): Record<AssetSymbol, ethers.Contract> {
  return {
    ETH:  getPriceFeedContract("ETH"),
    BTC:  getPriceFeedContract("BTC"),
    SOMI: getPriceFeedContract("SOMI"),
  };
}