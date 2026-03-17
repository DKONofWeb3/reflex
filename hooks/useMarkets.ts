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
  // Tuple ABI returns array: raw[0]=id, raw[1]=asset, ... raw[9]=resolvedAt
  // All values come back as strings or bigints
  const id          = raw[0];
  const asset       = raw[1];
  const question    = raw[2];
  const targetPrice = raw[3];
  const createdPrice= raw[4];
  const deadline    = raw[5];
  const statusRaw   = raw[6];
  const yesPool     = raw[7];
  const noPool      = raw[8];
  const resolvedAt  = raw[9];
  // id=0 means empty market slot
  if (!id || BigInt(id) === 0n) return null;
  const status = mapStatus(Number(statusRaw));
  const yp = typeof yesPool === 'bigint' ? yesPool : BigInt(yesPool ?? 0);
  const np = typeof noPool  === 'bigint' ? noPool  : BigInt(noPool ?? 0);
  const tp = typeof targetPrice  === 'bigint' ? targetPrice  : BigInt(targetPrice ?? 0);
  const cp = typeof createdPrice === 'bigint' ? createdPrice : BigInt(createdPrice ?? 0);
  return {
    id: BigInt(id), asset: asset as AssetSymbol, question,
    targetPrice: tp, currentPrice: cp,
    deadline: Number(deadline), status,
    yesPool: yp, noPool: np, totalPool: yp + np,
    resolvedAt: Number(resolvedAt) || undefined,
    winner: status === "RESOLVED_YES" ? "YES" : status === "RESOLVED_NO" ? "NO" : undefined,
    createdAt: 0,
  };
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