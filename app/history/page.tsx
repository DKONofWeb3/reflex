"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers }        from "ethers";
import { Navbar }        from "@/components/ui/Navbar";
import { Sidebar, TimeFilter, AssetFilter } from "@/components/ui/Sidebar";
import { useAppContext } from "@/app/providers";
import { getPredictionMarketContract, getPredictionMarketContractSigner } from "@/lib/contracts";
import { Market, MarketStatus, AssetSymbol } from "@/types";

const ASSET_LOGOS: Record<string, string> = {
  ETH:  "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/128/color/eth.png",
  BTC:  "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/128/color/btc.png",
  SOMI: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/128/color/som.png",
};

type HM = Market & { userBet?: { side: "YES"|"NO"; amount: bigint; claimed: boolean } };

function mapStatus(n: number): MarketStatus {
  return (["ACTIVE","RESOLVED_YES","RESOLVED_NO","EXPIRED"] as MarketStatus[])[n] || "ACTIVE";
}

export default function HistoryPage() {
  const { wallet: { wallet } } = useAppContext();
  const [markets,  setMarkets]  = useState<HM[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"my"|"all">("my");
  const [claiming, setClaiming] = useState<string|null>(null);
  const [timeFilter,  setTimeFilter]  = useState<TimeFilter>("all");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = getPredictionMarketContract();
      const nextId: bigint = await c.nextMarketId();
      if (nextId <= 1n) { setMarkets([]); return; }
      const ids = Array.from({ length: Number(nextId) - 1 }, (_, i) => BigInt(i + 1));
      const all = await Promise.all(ids.map(async (id): Promise<HM|null> => {
        try {
          const raw = await c.getMarket(id);
          const status = mapStatus(Number(raw.status));
          const m: HM = {
            id: raw.id, asset: raw.asset as AssetSymbol, question: raw.question,
            targetPrice: raw.targetPrice, currentPrice: raw.createdPrice,
            deadline: Number(raw.deadline), status,
            yesPool: raw.yesPool, noPool: raw.noPool, totalPool: raw.yesPool + raw.noPool,
            resolvedAt: Number(raw.resolvedAt)||undefined,
            winner: status === "RESOLVED_YES" ? "YES" : status === "RESOLVED_NO" ? "NO" : undefined,
            createdAt: 0,
          };
          if (wallet.address) {
            const bet = await c.getUserBet(id, wallet.address);
            if (bet.amount > 0n) m.userBet = { side: bet.side === 0 ? "YES":"NO", amount: bet.amount, claimed: bet.claimed };
          }
          return m;
        } catch { return null; }
      }));
      const res = all.filter((m): m is HM => m !== null);
      res.sort((a, b) => Number(b.id) - Number(a.id));
      setMarkets(res);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => { load(); }, [load]);

  const claim = async (id: bigint) => {
    const k = id.toString(); setClaiming(k);
    try {
      const c = await getPredictionMarketContractSigner();
      await (await c.claimPayout(id)).wait();
      await load();
    } catch(e){ console.error(e); } finally { setClaiming(null); }
  };

  const displayed = tab === "my"
    ? markets.filter((m) => m.userBet && (assetFilter === "all" || m.asset === assetFilter))
    : markets.filter((m) => assetFilter === "all" || m.asset === assetFilter);

  const myBets = markets.filter((m) => m.userBet);
  const wins   = myBets.filter((m) =>
    (m.status === "RESOLVED_YES" && m.userBet?.side === "YES") ||
    (m.status === "RESOLVED_NO"  && m.userBet?.side === "NO"));

  const row = (m: HM) => {
    const won = (m.status === "RESOLVED_YES" && m.userBet?.side === "YES") ||
                (m.status === "RESOLVED_NO"  && m.userBet?.side === "NO");
    const canClaim = won && !m.userBet?.claimed;
    const amt = m.userBet ? parseFloat(ethers.formatEther(m.userBet.amount)).toFixed(2) : null;
    const share = m.userBet && m.totalPool > 0n ? Number(m.userBet.amount) / Number(m.totalPool) : 0;
    const payout = won ? `+${(parseFloat(ethers.formatEther(m.totalPool)) * share).toFixed(2)}` : null;
    const statusMap: Record<MarketStatus, { label: string; color: string; bg: string }> = {
      RESOLVED_YES: { label: "YES WON", color: "var(--green)",   bg: "var(--green-bg)" },
      RESOLVED_NO:  { label: "NO WON",  color: "var(--red)",     bg: "var(--red-bg)"   },
      ACTIVE:       { label: "Active",  color: "var(--brand)",   bg: "var(--brand-sub)" },
      EXPIRED:      { label: "Expired", color: "var(--t4)",      bg: "var(--border-soft)" },
    };
    const st = statusMap[m.status];

    return (
      <tr key={m.id.toString()} style={{ borderBottom: "1px solid var(--border-soft)" }}>
        {/* Asset */}
        <td style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden",
              background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={ASSET_LOGOS[m.asset]} width={24} height={24} alt={m.asset}
                style={{ objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }}
              />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{m.asset}</span>
          </div>
        </td>

        {/* Question */}
        <td style={{ padding: "14px 16px", maxWidth: 280 }}>
          <span style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden" as any }}>{m.question}</span>
        </td>

        {/* Side (only in my bets) */}
        {tab === "my" && (
          <td style={{ padding: "14px 16px" }}>
            {m.userBet && (
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: m.userBet.side === "YES" ? "var(--green-bg)" : "var(--red-bg)",
                color: m.userBet.side === "YES" ? "var(--green)" : "var(--red)",
                border: `1px solid ${m.userBet.side === "YES" ? "var(--green-bd)" : "var(--red-bd)"}`,
              }}>{m.userBet.side}</span>
            )}
          </td>
        )}

        {/* Amount */}
        {tab === "my" && (
          <td style={{ padding: "14px 16px" }}>
            {amt && <span style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: "var(--t2)" }}>{amt} STT</span>}
          </td>
        )}

        {/* Volume (all tab) */}
        {tab === "all" && (
          <td style={{ padding: "14px 16px" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: "var(--t3)" }}>
              {parseFloat(ethers.formatEther(m.totalPool)).toFixed(2)} STT
            </span>
          </td>
        )}

        {/* Status */}
        <td style={{ padding: "14px 16px" }}>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11,
            fontWeight: 700, color: st.color, background: st.bg }}>
            {st.label}
          </span>
        </td>

        {/* Payout / Action */}
        <td style={{ padding: "14px 16px" }}>
          {canClaim ? (
            <button onClick={() => claim(m.id)}
              disabled={claiming === m.id.toString()}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none",
                background: "var(--brand)", color: "#fff",
                fontSize: 12, fontWeight: 600,
                cursor: claiming === m.id.toString() ? "not-allowed" : "pointer",
                opacity: claiming === m.id.toString() ? 0.6 : 1 }}>
              {claiming === m.id.toString() ? "..." : "Claim"}
            </button>
          ) : payout && m.userBet?.claimed ? (
            <span style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: "var(--green)", fontWeight: 600 }}>{payout} STT</span>
          ) : (
            <span style={{ fontSize: 13, color: "var(--t4)" }}>—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
      <Navbar />

      <div style={{ display: "flex" }}>
        <Sidebar
          timeFilter={timeFilter} assetFilter={assetFilter}
          onTimeChange={setTimeFilter} onAssetChange={setAssetFilter}
        />

        <main style={{ flex: 1, minWidth: 0, padding: "24px 28px" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)",
              letterSpacing: "-0.02em", marginBottom: 4 }}>Portfolio</h1>
            <p style={{ fontSize: 13, color: "var(--t3)" }}>
              Your prediction history on Somnia.
            </p>
          </div>

          {/* Stats (when wallet connected) */}
          {wallet.isConnected && myBets.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Bets", value: myBets.length },
                { label: "Wins",       value: wins.length },
                { label: "Win Rate",   value: `${Math.round(wins.length / myBets.length * 100)}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: "16px 20px", borderRadius: 10,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-xs)", minWidth: 100,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t4)",
                    letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
            {([
              { key: "my",  label: `My Bets (${myBets.length})` },
              { key: "all", label: "All Markets" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "10px 18px", background: "none", border: "none",
                borderBottom: tab === key ? "2px solid var(--t1)" : "2px solid transparent",
                fontSize: 14, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? "var(--t1)" : "var(--t3)",
                cursor: "pointer", marginBottom: -1,
              }}>{label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={load} style={{ padding: "8px 12px", background: "none",
              border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 18,
              display: "flex", alignItems: "center" }}>↺</button>
            <a href="https://somnia-testnet.socialscan.io" target="_blank"
              style={{ padding: "10px 16px", fontSize: 13, color: "var(--brand)",
                fontWeight: 500, display: "flex", alignItems: "center" }}>
              Explorer ↗
            </a>
          </div>

          {/* Table */}
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)",
            borderTop: "none", borderRadius: "0 0 12px 12px",
            boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-page)" }}>
                    {["Asset","Market",
                      ...(tab === "my" ? ["Side","Amount"] : ["Volume"]),
                      "Status","Payout"
                    ].map((h) => (
                      <th key={h} style={{
                        padding: "11px 16px", textAlign: "left" as const,
                        fontSize: 11, fontWeight: 700, color: "var(--t4)",
                        letterSpacing: "0.06em", textTransform: "uppercase" as const,
                        borderBottom: "1px solid var(--border)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center",
                      color: "var(--t4)", fontSize: 13 }}>Loading...</td></tr>
                  ) : displayed.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "var(--t4)" }}>
                        {tab === "my" && !wallet.isConnected
                          ? "Connect your wallet to see your bets."
                          : "No markets found."}
                      </p>
                    </td></tr>
                  ) : displayed.map(row)}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}