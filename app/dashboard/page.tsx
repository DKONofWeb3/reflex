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

  const filtered = assetFilter === "all"
    ? ALL_ASSETS : ALL_ASSETS.filter((a) => a === assetFilter);

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)" }}>
      <Navbar />

      <div style={{ display: "flex" }}>
        {/* Sidebar — hidden on mobile via className */}
        <div className="sidebar-desktop">
          <Sidebar timeFilter={timeFilter} assetFilter={assetFilter}
            onTimeChange={setTimeFilter} onAssetChange={setAssetFilter} />
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