// hooks/useSmartBets.ts
// Manages Smart Bets — conditional bets that execute automatically on-chain
// when a price condition is met (via Reactivity).
//
// Flow:
//   1. fund(amount)                 → deposits STT into ReactivityHook
//   2. registerSmartBet(params)     → registers the condition on-chain
//   3. Reactivity fires it when condition is met (no user action needed)
//   4. cancelSmartBet(id)           → cancel before it fires
//   5. withdraw(amount)             → pull back unfired funded balance
//
// Returns:
//   smartBets      → user's registered smart bets
//   userBalance    → STT balance deposited in ReactivityHook
//   fund()         → deposit STT
//   registerSmartBet()
//   cancelSmartBet()
//   withdraw()

"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers }          from "ethers";
import { AssetSymbol }     from "@/lib/config";
import { parseSTT, formatSTT } from "@/lib/provider";
import { getReactivityHookContract, getReactivityHookContractSigner } from "@/lib/contracts";
import { SmartBet, SmartBetCondition, MarketSide } from "@/types";

export interface RegisterSmartBetParams {
  asset:        AssetSymbol;
  condition:    SmartBetCondition;  // "ABOVE" | "BELOW"
  triggerPrice: number;             // display value e.g. 2050.00
  side:         MarketSide;         // "YES" | "NO"
  betAmount:    string;             // STT amount as string e.g. "0.5"
}

export function useSmartBets(userAddress: string | null) {
  const [smartBets, setSmartBets]     = useState<SmartBet[]>([]);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading]     = useState(false);

  // ── Fetch user's balance + smart bets ──────────────────────────────────────
  const fetchUserData = useCallback(async () => {
    if (!userAddress) return;

    try {
      const contract = getReactivityHookContract();

      // Fetch deposited balance
      const balance: bigint = await contract.userBalance(userAddress);
      setUserBalance(balance);

      // Fetch smart bet IDs
      const ids: bigint[] = await contract.getUserSmartBets(userAddress);
      if (ids.length === 0) { setSmartBets([]); return; }

      // Fetch each smart bet
      const bets = await Promise.all(
        ids.map(async (id): Promise<SmartBet> => {
          const raw = await contract.getSmartBet(id);
          return {
            id:           id.toString(),
            asset:        raw.asset as AssetSymbol,
            condition:    raw.isAbove ? "ABOVE" : "BELOW",
            triggerPrice: BigInt(Math.round(Number(raw.triggerPrice))),
            marketSide:   raw.side === 0 ? "YES" : "NO",
            betAmount:    raw.betAmount as bigint,
            active:       raw.active as boolean,
          };
        })
      );

      setSmartBets(bets.filter((b) => b.active));
    } catch (err) {
      console.error("Failed to fetch smart bets:", err);
    }
  }, [userAddress]);

  // ── Fund: deposit STT to back smart bets ──────────────────────────────────
  const fund = useCallback(async (amount: string): Promise<string> => {
    setIsLoading(true);
    try {
      const contract = await getReactivityHookContractSigner();
      const tx = await contract.fund({ value: parseSTT(amount) });
      await tx.wait();
      await fetchUserData();
      return tx.hash;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // ── Register: create a new conditional smart bet ──────────────────────────
  const registerSmartBet = useCallback(async (params: RegisterSmartBetParams): Promise<string> => {
    setIsLoading(true);
    try {
      const contract    = await getReactivityHookContractSigner();
      const isAbove     = params.condition === "ABOVE";
      const triggerRaw  = BigInt(Math.round(params.triggerPrice * 100)); // convert to stored format
      const sideUint    = params.side === "YES" ? 0 : 1;
      const amountWei   = parseSTT(params.betAmount);

      const tx = await contract.registerSmartBet(
        params.asset,
        isAbove,
        triggerRaw,
        sideUint,
        amountWei
      );
      await tx.wait();
      await fetchUserData();
      return tx.hash;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // ── Cancel: deactivate a smart bet ────────────────────────────────────────
  const cancelSmartBet = useCallback(async (id: string): Promise<string> => {
    setIsLoading(true);
    try {
      const contract = await getReactivityHookContractSigner();
      const tx = await contract.cancelSmartBet(BigInt(id));
      await tx.wait();
      await fetchUserData();
      return tx.hash;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // ── Withdraw: pull back unfired funded balance ─────────────────────────────
  const withdraw = useCallback(async (amount: string): Promise<string> => {
    setIsLoading(true);
    try {
      const contract = await getReactivityHookContractSigner();
      const tx = await contract.withdraw(parseSTT(amount));
      await tx.wait();
      await fetchUserData();
      return tx.hash;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    smartBets,
    userBalance,
    formattedBalance: formatSTT(userBalance),
    isLoading,
    fund,
    registerSmartBet,
    cancelSmartBet,
    withdraw,
    refetch: fetchUserData,
  };
}