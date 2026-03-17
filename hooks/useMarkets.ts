// hooks/useMarkets.ts
"use client";
// Poll-only markets hook — no WebSocket
import { useState, useEffect, useCallback, useRef } from "react";
import { AssetSymbol } from "@/lib/config";
import { parseSTT }    from "@/lib/provider";
import { getPredictionMarketContract, getPredictionMarketContractSigner } from "@/lib/contracts";
import { Market, MarketStatus, MarketSide, UserBet } from "@/types";

type MarketsMap = Record<AssetSymbol, Market | null>;
const INITIAL: MarketsMap = { ETH: null, BTC: null, SOMI: null };
const POLL_MS = 3000;

function mapStatus(n: number): MarketStatus {
  return (["ACTIVE","RESOLVED_YES","RESOLVED_NO","EXPIRED"] as MarketStatus[])[n] ?? "ACTIVE";
}
function parseMarket(raw: any): Market | null {
  if (!raw) return null;
  // ethers v6 with tuple ABI returns flat array:
  // ["3","ETH","Will ETH..","230000","220000","1773786628","0","0","0","0"]
  // Index: 0=id, 1=asset, 2=question, 3=targetPrice, 4=createdPrice,
  //        5=deadline, 6=status, 7=yesPool, 8=noPool, 9=resolvedAt
  const id = raw[0];
  if (id === undefined || id === null || String(id) === "0") return null;
  try {
    const idBig = BigInt(String(id));
    if (idBig === 0n) return null;
    const status = mapStatus(Number(raw[6]));
    const toBig = (v: any) => { try { return BigInt(String(v ?? 0)); } catch { return 0n; } };
    const yp = toBig(raw[7]);
    const np = toBig(raw[8]);
    return {
      id: idBig,
      asset: String(raw[1]) as AssetSymbol,
      question: String(raw[2]),
      targetPrice:  toBig(raw[3]),
      currentPrice: toBig(raw[4]),
      deadline: Number(raw[5]),
      status,
      yesPool: yp, noPool: np, totalPool: yp + np,
      resolvedAt: Number(raw[9]) || undefined,
      winner: status === "RESOLVED_YES" ? "YES" : status === "RESOLVED_NO" ? "NO" : undefined,
      createdAt: 0,
    };
  } catch (e) {
    console.error("parseMarket error:", e, "raw:", raw);
    return null;
  }
}


export function useMarkets() {
  const [markets, setMarkets]     = useState<MarketsMap>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMarketForAsset = useCallback(async (asset: AssetSymbol): Promise<Market | null> => {
    try {
      const c  = getPredictionMarketContract();
      const id: bigint = await c.getActiveMarketId(asset);
      if (id === 0n) return null;
      return parseMarket(await c.getMarket(id));
    } catch { return null; }
  }, []);

  const fetchAll = useCallback(async () => {
    const [eth, btc, somi] = await Promise.all([
      fetchMarketForAsset("ETH"), fetchMarketForAsset("BTC"), fetchMarketForAsset("SOMI"),
    ]);
    setMarkets({ ETH: eth, BTC: btc, SOMI: somi });
    setIsLoading(false);
  }, [fetchMarketForAsset]);

  const placeBet = useCallback(async (marketId: bigint, side: MarketSide, amount: string): Promise<string> => {
    const c  = await getPredictionMarketContractSigner();
    const tx = await c.placeBet(marketId, side === "YES" ? 0 : 1, { value: parseSTT(amount) });
    await tx.wait();
    await fetchAll();
    return tx.hash;
  }, [fetchAll]);

  const claimPayout = useCallback(async (marketId: bigint): Promise<string> => {
    const c  = await getPredictionMarketContractSigner();
    const tx = await c.claimPayout(marketId);
    await tx.wait();
    return tx.hash;
  }, []);

  const getUserBet = useCallback(async (marketId: bigint, userAddress: string): Promise<UserBet | null> => {
    try {
      const raw = await getPredictionMarketContract().getUserBet(marketId, userAddress);
      if (raw.amount === 0n) return null;
      return { marketId, side: raw.side === 0 ? "YES" : "NO", amount: raw.amount, claimed: raw.claimed };
    } catch { return null; }
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAll]);

  return { markets, isLoading, placeBet, claimPayout, getUserBet, refetch: fetchAll };
}