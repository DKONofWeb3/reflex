// app/dashboard/page.tsx
"use client";
import { useState } from "react";
import { Navbar }       from "@/components/ui/Navbar";
import { Sidebar, TimeFilter, AssetFilter } from "@/components/ui/Sidebar";
import { MarketCard }   from "@/components/market/MarketCard";
import { ActivityFeed } from "@/components/feed/ActivityFeed";
import { PriceUpdater } from "@/components/betting/PriceUpdater";
import { useAppContext } from "@/app/providers";
import { AssetSymbol }  from "@/lib/config";

const ALL_ASSETS: AssetSymbol[] = ["ETH", "BTC", "SOMI"];
const TYPE_FILTERS = ["All", "Up / Down", "Above / Below", "Hit Price"] as const;

export default function DashboardPage() {
  const { priceFeed: { prices }, markets: { markets } } = useAppContext();
  const [timeFilter,  setTimeFilter]  = useState<TimeFilter>("all");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [typeFilter,  setTypeFilter]  = useState<typeof TYPE_FILTERS[number]>("All");

  const now = Math.floor(Date.now() / 1000);

  // Map TimeFilter key → remaining-time range in seconds
  const TIME_RANGES: Record<string, [number, number]> = {
    "5min":   [0,     5  * 60],
    "15min":  [0,     15 * 60],
    "hourly": [0,     60 * 60],
    "4hour":  [0,     4  * 3600],
    "daily":  [0,     24 * 3600],
    "weekly": [0,     7  * 86400],
    "monthly":[0,     30 * 86400],
  };

  // Filter by asset
  const assetFiltered = assetFilter === "all"
    ? ALL_ASSETS : ALL_ASSETS.filter((a) => a === assetFilter);

  // Filter by time: if "all", show everything; otherwise only markets whose
  // remaining time (deadline - now) fits within the selected bucket
  const filtered = timeFilter === "all" ? assetFiltered : assetFiltered.filter((a) => {
    const m = markets[a];
    if (!m || m.status !== "ACTIVE") return false;
    const rem = m.deadline - now;
    const [, max] = TIME_RANGES[timeFilter] ?? [0, Infinity];
    return rem > 0 && rem <= max;
  });

  // Dynamic counts for sidebar
  const timeCount = (key: TimeFilter): number => {
    if (key === "all") return ALL_ASSETS.filter((a) => markets[a]?.status === "ACTIVE").length;
    const [, max] = TIME_RANGES[key] ?? [0, Infinity];
    return ALL_ASSETS.filter((a) => {
      const m = markets[a];
      if (!m || m.status !== "ACTIVE") return false;
      const rem = m.deadline - now;
      return rem > 0 && rem <= max;
    }).length;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)" }}>
      <Navbar />

      <div style={{ display: "flex" }}>
        {/* Sidebar — hidden on mobile via className */}
        <div className="sidebar-desktop">
          <Sidebar timeFilter={timeFilter} assetFilter={assetFilter}
            onTimeChange={setTimeFilter} onAssetChange={setAssetFilter}
            timeCount={timeCount} />
        </div>

        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Title bar */}
          <div style={{ padding: "16px 20px 0", borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)",
              letterSpacing: "-0.03em", marginBottom: 12 }}>
              {assetFilter === "all" ? "Crypto" : assetFilter}
            </h1>
            {/* Filter pills — scrollable on mobile */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto",
              paddingBottom: 0, scrollbarWidth: "none" }}>
              {TYPE_FILTERS.map((f) => (
                <button key={f} onClick={() => setTypeFilter(f)} style={{
                  padding: "7px 16px", borderRadius: 20, fontSize: 13,
                  fontWeight: 500, border: "none", cursor: "pointer",
                  flexShrink: 0,
                  background: typeFilter === f ? "var(--brand)" : "transparent",
                  color: typeFilter === f ? "#fff" : "var(--t3)",
                  transition: "all 0.15s",
                }}>{f}</button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="page-content" style={{ padding: "20px" }}>
            {/* Cards grid */}
            <div className="market-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14, marginBottom: 20,
            }}>
              {filtered.map((asset) => (
                <MarketCard key={asset} asset={asset}
                  market={markets[asset]} price={prices[asset]} />
              ))}
            </div>

            {/* Bottom row: activity + price pusher */}
            <div className="bottom-row" style={{
              display: "grid",
              gridTemplateColumns: "1fr 300px",
              gap: 16,
            }}>
              <ActivityFeed />
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12, padding: 16,
              }}>
                <PriceUpdater />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}