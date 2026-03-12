// hooks/usePriceFeed.ts
"use client";
// Poll-only price feed — no WebSocket, no unhandled rejections
import { useState, useEffect, useCallback, useRef } from "react";
import { ASSETS, AssetSymbol } from "@/lib/config";
import { getPriceFeedContract, getPriceFeedContractSigner } from "@/lib/contracts";
import { PriceData } from "@/types";

type PricesMap = Record<AssetSymbol, PriceData | null>;
const INITIAL: PricesMap = { ETH: null, BTC: null, SOMI: null };
const POLL_MS = 4000;

export function usePriceFeed() {
  const [prices, setPrices]       = useState<PricesMap>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = useCallback(async (asset: AssetSymbol): Promise<PriceData | null> => {
    try {
      const [price, timestamp]: [bigint, bigint] = await getPriceFeedContract(asset).getPrice();
      return { asset, price, displayPrice: Number(price) / 100, lastUpdated: Number(timestamp) };
    } catch { return null; }
  }, []);

  const fetchAll = useCallback(async () => {
    const [eth, btc, somi] = await Promise.all([
      fetchPrice("ETH"), fetchPrice("BTC"), fetchPrice("SOMI"),
    ]);
    setPrices({ ETH: eth, BTC: btc, SOMI: somi });
    setIsLoading(false);
  }, [fetchPrice]);

  const updatePrice = useCallback(async (asset: AssetSymbol, newPrice: number): Promise<string> => {
    const contract = await getPriceFeedContractSigner(asset);
    const tx = await contract.setPrice(BigInt(Math.round(newPrice * 100)));
    await tx.wait();
    await fetchAll();
    return tx.hash;
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAll]);

  return { prices, isLoading, updatePrice, refetch: fetchAll };
}