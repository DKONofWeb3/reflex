// app/history/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers }        from "ethers";
import { Navbar }        from "@/components/ui/Navbar";
import { Sidebar, TimeFilter, AssetFilter } from "@/components/ui/Sidebar";
import { useAppContext } from "@/app/providers";
import { AssetSymbol }   from "@/lib/config";
import { Market, MarketStatus } from "@/types";
import { getPredictionMarketContract, getPredictionMarketContractSigner } from "@/lib/contracts";

type HM = Market & { userBet?: { side: "YES"|"NO"; amount: bigint; claimed: boolean } };

function mapStatus(n: number): MarketStatus {
  return (["ACTIVE","RESOLVED_YES","RESOLVED_NO","EXPIRED"] as MarketStatus[])[n] ?? "ACTIVE";
}

// Inline SVG coin icons — no CDN
function CoinIcon({ asset }: { asset: string }) {
  const icons: Record<string, JSX.Element> = {
    ETH: (
      <svg width="24" height="24" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <path d="M16 5.5L15.87 5.95V20.28L16 20.41L22.5 16.48L16 5.5Z" fill="white" fillOpacity="0.9"/>
        <path d="M16 5.5L9.5 16.48L16 20.41V13.5V5.5Z" fill="white" fillOpacity="0.5"/>
        <path d="M16 21.64L15.92 21.74V26.65L16 26.87L22.5 17.72L16 21.64Z" fill="white" fillOpacity="0.9"/>
        <path d="M16 26.87V21.64L9.5 17.72L16 26.87Z" fill="white" fillOpacity="0.5"/>
      </svg>
    ),
    BTC: (
      <svg width="24" height="24" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#F7931A"/>
        <path d="M22.2 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.6 2.6c-.4-.1-.9-.2-1.3-.3l.6-2.6-1.6-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.2-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.7.8 1.1L12 14.9h.3L11 19.1c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.8 2.1.5c.4.1.8.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.3 1.4.4l-.7 2.7 1.6.4.7-2.7c2.7.5 4.7.3 5.6-2.2.7-2-.03-3.1-1.5-3.8.9-.3 1.6-.9 1.8-2zm-3.3 4.6c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.7.8 4.1 2.9zm.5-4.7c-.5 1.8-3.3.9-4.2.7l.8-3.2c1 .3 3.9.7 3.4 2.5z" fill="white"/>
      </svg>
    ),
    SOMI: (
      <svg width="24" height="24" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#6E3FF3"/>
        <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.9"/>
        <circle cx="16" cy="16" r="3" fill="white" fillOpacity="0.9"/>
      </svg>
    ),
  };
  return icons[asset] ?? <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--border)" }} />;
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
      if (nextId <= 1n) { setMarkets([]); setLoading(false); return; }
      const ids = Array.from({ length: Number(nextId) - 1 }, (_, i) => BigInt(i + 1));
      const all = await Promise.all(ids.map(async (id): Promise<HM|null> => {
        try {
          const raw    = await c.getMarket(id);
          const status = mapStatus(Number(raw.status));
          const m: HM  = {
            id: raw.id, asset: raw.asset as AssetSymbol, question: raw.question,
            targetPrice: raw.targetPrice, currentPrice: raw.createdPrice,
            deadline: Number(raw.deadline), status,
            yesPool: raw.yesPool, noPool: raw.noPool, totalPool: raw.yesPool + raw.noPool,
            resolvedAt: Number(raw.resolvedAt) || undefined,
            winner: status === "RESOLVED_YES" ? "YES" : status === "RESOLVED_NO" ? "NO" : undefined,
            createdAt: 0,
          };
          if (wallet.address) {
            const bet = await c.getUserBet(id, wallet.address);
            if (bet.amount > 0n)
              m.userBet = { side: bet.side === 0 ? "YES" : "NO", amount: bet.amount, claimed: bet.claimed };
          }
          return m;
        } catch { return null; }
      }));
      const res = all.filter((m): m is HM => m !== null);
      res.sort((a, b) => Number(b.id) - Number(a.id));
      setMarkets(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => { load(); }, [load]);

  const claim = async (id: bigint) => {
    const k = id.toString(); setClaiming(k);
    try {
      const c = await getPredictionMarketContractSigner();
      await (await c.claimPayout(id)).wait();
      await load();
    } catch (e) { console.error(e); }
    finally { setClaiming(null); }
  };

  const myBets   = markets.filter((m) => m.userBet);
  const wins     = myBets.filter((m) =>
    (m.status === "RESOLVED_YES" && m.userBet?.side === "YES") ||
    (m.status === "RESOLVED_NO"  && m.userBet?.side === "NO"));
  const displayed = (tab === "my" ? myBets : markets)
    .filter((m) => assetFilter === "all" || m.asset === assetFilter);

  const StatusBadge = ({ status }: { status: MarketStatus }) => {
    const map: Record<MarketStatus, { label: string; color: string; bg: string; bd: string }> = {
      RESOLVED_YES: { label: "YES WON", color: "#16A34A", bg: "rgba(22,163,74,0.1)",  bd: "rgba(22,163,74,0.25)"  },
      RESOLVED_NO:  { label: "NO WON",  color: "#DC2626", bg: "rgba(220,38,38,0.1)",  bd: "rgba(220,38,38,0.25)"  },
      ACTIVE:       { label: "Active",  color: "#0066FF", bg: "rgba(0,102,255,0.1)",  bd: "rgba(0,102,255,0.25)"  },
      EXPIRED:      { label: "Expired", color: "var(--t4)", bg: "var(--border-soft)", bd: "var(--border)" },
      PENDING:      { label: "Pending", color: "var(--t4)", bg: "var(--border-soft)", bd: "var(--border)" },
    };
    const s = map[status];
    return (
      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        color: s.color, background: s.bg, border: `1px solid ${s.bd}`, whiteSpace: "nowrap" }}>
        {s.label}
      </span>
    );
  };

  const Row = ({ m }: { m: HM }) => {
    const won = (m.status === "RESOLVED_YES" && m.userBet?.side === "YES") ||
                (m.status === "RESOLVED_NO"  && m.userBet?.side === "NO");
    const canClaim = won && !m.userBet?.claimed;
    const betAmt   = m.userBet ? parseFloat(ethers.formatEther(m.userBet.amount)).toFixed(3) : null;
    const share    = m.userBet && m.totalPool > 0n ? Number(m.userBet.amount) / Number(m.totalPool) : 0;
    const payout   = won ? (parseFloat(ethers.formatEther(m.totalPool)) * share).toFixed(3) : null;

    return (
      <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
        {/* Asset */}
        <td style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CoinIcon asset={m.asset} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{m.asset}</span>
          </div>
        </td>
        {/* Market */}
        <td style={{ padding: "13px 16px", maxWidth: 260 }}>
          <span style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.45,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
            overflow: "hidden" }}>{m.question}</span>
        </td>
        {/* Side (my bets only) */}
        {tab === "my" && (
          <td style={{ padding: "13px 16px" }}>
            {m.userBet && (
              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: m.userBet.side === "YES" ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                color: m.userBet.side === "YES" ? "#16A34A" : "#DC2626",
                border: `1px solid ${m.userBet.side === "YES" ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.25)"}`,
              }}>{m.userBet.side}</span>
            )}
          </td>
        )}
        {/* Amount / Volume */}
        <td style={{ padding: "13px 16px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--t3)" }}>
            {tab === "my" ? (betAmt ? `${betAmt} STT` : "—")
              : `${parseFloat(ethers.formatEther(m.totalPool)).toFixed(2)} STT`}
          </span>
        </td>
        {/* Status */}
        <td style={{ padding: "13px 16px" }}><StatusBadge status={m.status} /></td>
        {/* Action */}
        <td style={{ padding: "13px 16px" }}>
          {canClaim ? (
            <button onClick={() => claim(m.id)} disabled={claiming === m.id.toString()} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "var(--brand)", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: claiming === m.id.toString() ? "not-allowed" : "pointer",
              opacity: claiming === m.id.toString() ? 0.6 : 1,
            }}>
              {claiming === m.id.toString() ? "..." : "Claim"}
            </button>
          ) : payout && m.userBet?.claimed ? (
            <span style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: "#16A34A", fontWeight: 600 }}>+{payout} STT</span>
          ) : <span style={{ fontSize: 13, color: "var(--t4)" }}>—</span>}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)" }}>
      <Navbar />
      <div style={{ display: "flex" }}>
        <div className="sidebar-desktop">
          <Sidebar timeFilter={timeFilter} assetFilter={assetFilter}
            onTimeChange={setTimeFilter} onAssetChange={setAssetFilter} />
        </div>

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "20px 20px 0" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)",
              letterSpacing: "-0.03em", marginBottom: 4 }}>Portfolio</h1>
            <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 20 }}>
              Your prediction history on Somnia testnet.
            </p>

            {/* Stats */}
            {wallet.isConnected && myBets.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Total Bets", value: String(myBets.length) },
                  { label: "Wins",       value: String(wins.length) },
                  { label: "Win Rate",   value: `${Math.round(wins.length / myBets.length * 100)}%` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "14px 20px", borderRadius: 10,
                    background: "var(--surface)", border: "1px solid var(--border)", minWidth: 100 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t4)",
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)",
            padding: "0 20px", alignItems: "center" }}>
            {([
              { key: "my",  label: `My Bets (${myBets.length})` },
              { key: "all", label: "All Markets" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "10px 16px", background: "none", border: "none", marginBottom: -1,
                borderBottom: tab === key ? "2px solid var(--t1)" : "2px solid transparent",
                fontSize: 14, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? "var(--t1)" : "var(--t3)", cursor: "pointer",
              }}>{label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={load} style={{ padding: "8px", background: "none",
              border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 18 }}>↺</button>
            <a href="https://somnia-testnet.socialscan.io" target="_blank"
              style={{ padding: "10px 16px", fontSize: 13, color: "var(--brand)", fontWeight: 500 }}>
              Explorer ↗
            </a>
          </div>

          {/* Table */}
          <div style={{ padding: "0 20px 24px" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--border-soft)" }}>
                      {["Asset","Market",
                        ...(tab === "my" ? ["Side"] : []),
                        tab === "my" ? "Amount" : "Volume",
                        "Status","Action"
                      ].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                          fontSize: 11, fontWeight: 700, color: "var(--t4)",
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center",
                        color: "var(--t4)", fontSize: 13 }}>Loading markets...</td></tr>
                    ) : displayed.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center",
                        color: "var(--t4)", fontSize: 13 }}>
                        {tab === "my" && !wallet.isConnected
                          ? "Connect your wallet to see your bets."
                          : "No markets found. Push a price to create the first one."}
                      </td></tr>
                    ) : displayed.map((m) => <Row key={m.id.toString()} m={m} />)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}