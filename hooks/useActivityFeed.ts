// hooks/useActivityFeed.ts
"use client";
// Poll-only activity feed — no WebSocket
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers }      from "ethers";
import { AssetSymbol } from "@/lib/config";
import { shortenAddress } from "@/lib/provider";
import { getPriceFeedContract, getPredictionMarketContract } from "@/lib/contracts";
import { ActivityEvent, ActivityEventType } from "@/types";

const MAX_EVENTS = 50;
const POLL_MS    = 5000;

function makeEvent(type: ActivityEventType, message: string, asset?: AssetSymbol, txHash?: string): ActivityEvent {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, asset, message, timestamp: Date.now(), txHash };
}

export function useActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const lastBlockRef = useRef<Record<string, number>>({});
  const pollRef      = useRef<NodeJS.Timeout | null>(null);

  const addEvent = useCallback((event: ActivityEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  // Poll recent events via getLogs (HTTP)
  const poll = useCallback(async () => {
    try {
      const c = getPredictionMarketContract();

      // BetPlaced
      const filter = c.filters.BetPlaced?.();
      if (filter) {
        const logs = await c.queryFilter(filter, -20);
        for (const log of logs.slice(-5)) {
          const e = log as any;
          const key = e.transactionHash;
          if (lastBlockRef.current[key]) continue;
          lastBlockRef.current[key] = 1;
          const bettor = e.args?.[1] ?? "";
          const side   = e.args?.[2] === 0n ? "YES" : "NO";
          const amt    = ethers.formatEther(e.args?.[3] ?? 0n);
          const mId    = e.args?.[0];
          addEvent(makeEvent("BET_PLACED", `${shortenAddress(bettor)} bet ${Number(amt).toFixed(3)} STT on ${side} (market #${mId})`, undefined, key));
        }
      }
      setIsLive(true);
    } catch { setIsLive(false); }
  }, [addEvent]);

  useEffect(() => {
    addEvent(makeEvent("PRICE_UPDATE", "REFLEX feed live — watching ETH, BTC, SOMI markets"));
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll, addEvent]);

  return { events, isLive };
}