// components/market/MarketCard.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { ethers }              from "ethers";
import { ASSETS, AssetSymbol } from "@/lib/config";
import { Market, PriceData }   from "@/types";
import { useAppContext }        from "@/app/providers";

// ─── Inline SVG logos — zero network dependency, always render ───────────────
function LogoETH({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16 5.5L15.87 5.95V20.28L16 20.41L22.5 16.48L16 5.5Z" fill="white" fillOpacity="0.9"/>
      <path d="M16 5.5L9.5 16.48L16 20.41V13.5V5.5Z" fill="white" fillOpacity="0.5"/>
      <path d="M16 21.64L15.92 21.74V26.65L16 26.87L22.5 17.72L16 21.64Z" fill="white" fillOpacity="0.9"/>
      <path d="M16 26.87V21.64L9.5 17.72L16 26.87Z" fill="white" fillOpacity="0.5"/>
      <path d="M16 20.41L22.5 16.48L16 13.5V20.41Z" fill="white" fillOpacity="0.2"/>
      <path d="M9.5 16.48L16 20.41V13.5L9.5 16.48Z" fill="white" fillOpacity="0.1"/>
    </svg>
  );
}

function LogoBTC({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.2 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.6 2.6c-.4-.1-.9-.2-1.3-.3l.6-2.6-1.6-.4-.7 2.7c-.4-.1-.7-.2-1-.2v0l-2.2-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.7.8 1.1L12 14.9c.1 0 .2.1.3.1h-.3L11 19.1c-.1.3-.4.6-.9.5 0 0-1.2-.3-1.2-.3l-.8 1.8 2.1.5c.4.1.8.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.3 1.4.4l-.7 2.7 1.6.4.7-2.7c2.7.5 4.7.3 5.6-2.2.7-2-.03-3.1-1.5-3.8.9-.3 1.6-.9 1.8-2zm-3.3 4.6c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.7.8 4.1 2.9zm.5-4.7c-.5 1.8-3.3.9-4.2.7l.8-3.2c1 .3 3.9.7 3.4 2.5z" fill="white"/>
    </svg>
  );
}

function LogoSOMI({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#6E3FF3"/>
      <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.9"/>
      <circle cx="16" cy="16" r="3" fill="white" fillOpacity="0.9"/>
      <path d="M16 7V9M16 23V25M7 16H9M23 16H25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
    </svg>
  );
}

function AssetIcon({ asset, size }: { asset: AssetSymbol; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28,
      overflow: "hidden", flexShrink: 0, display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      {asset === "ETH"  && <LogoETH  size={size} />}
      {asset === "BTC"  && <LogoBTC  size={size} />}
      {asset === "SOMI" && <LogoSOMI size={size} />}
    </div>
  );
}

// ─── Circular arc probability gauge ──────────────────────────────────────────
function ArcGauge({ pct }: { pct: number }) {
  const r = 27, cx = 36, cy = 36;
  const circ     = 2 * Math.PI * r;
  const fillDash = (pct / 100) * circ;
  const color    = pct > 50 ? "#22C55E" : pct < 50 ? "#EF4444" : "#6B7280";

  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
        {/* fill */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${fillDash} ${circ - fillDash}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.7s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff",
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.38)",
          marginTop: 2, fontWeight: 500, letterSpacing: "0.04em" }}>
          {pct >= 50 ? "YES" : "NO"}
        </span>
      </div>
    </div>
  );
}

// ─── Animated live bet ticker (+$XXX floats up, fades out) ────────────────────
function LiveTicker({ side }: { side: "yes"|"no" }) {
  const [ticks, setTicks] = useState<{ id: number; val: string }[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    let t: NodeJS.Timeout;
    const schedule = () => {
      t = setTimeout(() => {
        const amt = Math.floor(Math.random() * 320 + 8);
        const id  = counter.current++;
        setTicks((p) => [...p.slice(-1), { id, val: `+$${amt}` }]);
        setTimeout(() => setTicks((p) => p.filter((x) => x.id !== id)), 1900);
        schedule();
      }, 2800 + Math.random() * 3800);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ height: 18, display: "flex", alignItems: "flex-end",
      overflow: "hidden", marginBottom: 4 }}>
      {ticks.map((t) => (
        <span key={t.id} className="ticker-amount" style={{
          fontSize: 11, fontWeight: 700,
          color: side === "yes" ? "#4ADE80" : "#F87171",
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
        }}>{t.val}</span>
      ))}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
interface Props { asset: AssetSymbol; market: Market | null; price: PriceData | null; }

export function MarketCard({ asset, market, price }: Props) {
  const { wallet: { wallet }, markets: { placeBet } } = useAppContext();

  const [amount,  setAmount]  = useState("0.01");
  const [betting, setBetting] = useState<"YES"|"NO"|null>(null);
  const [txHash,  setTxHash]  = useState<string|null>(null);
  const [error,   setError]   = useState<string|null>(null);
  const [showAmt, setShowAmt] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const cfg      = ASSETS[asset];
  const isActive = market?.status === "ACTIVE";
  const isResYes = market?.status === "RESOLVED_YES";
  const isResNo  = market?.status === "RESOLVED_NO";
  const isRes    = isResYes || isResNo;

  const dp     = price ? price.displayPrice.toFixed(cfg.decimals) : "—";
  const yesAmt = market ? Number(ethers.formatEther(market.yesPool)) : 0;
  const noAmt  = market ? Number(ethers.formatEther(market.noPool))  : 0;
  const total  = yesAmt + noAmt;
  const yesPct = total === 0 ? 50 : Math.round((yesAmt / total) * 100);
  const noPct  = 100 - yesPct;
  const vol    = total.toFixed(0);
  const target = market ? (Number(market.targetPrice) / 100).toFixed(cfg.decimals) : null;

  const rem = market ? Math.max(0, market.deadline - Math.floor(Date.now() / 1000)) : 0;
  const timeLabel = rem === 0 ? "Ended"
    : rem < 60   ? `${rem}s`
    : rem < 3600 ? `${Math.floor(rem / 60)}m`
    : `${Math.floor(rem / 3600)}h ${Math.floor((rem % 3600) / 60)}m`;

  const handleBet = async (side: "YES"|"NO") => {
    if (!wallet.isConnected || !market || !isActive) return;
    setBetting(side); setError(null); setTxHash(null);
    try {
      setTxHash(await placeBet(market.id, side, amount));
    } catch (e: any) {
      setError(e?.reason || e?.message?.slice(0, 80) || "Transaction failed");
    } finally { setBetting(null); }
  };

  return (
    <div className="card-enter" style={{
      background: "var(--card-bg)",
      border: `1px solid ${isRes
        ? (isResYes ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)")
        : "var(--card-bd)"}`,
      borderRadius: 14,
      display: "flex", flexDirection: "column",
      boxShadow: "0 2px 16px rgba(0,0,0,0.22)",
      transition: "border-color 0.15s, box-shadow 0.15s",
    }}
    onMouseEnter={(e) => {
      if (!isRes) { e.currentTarget.style.borderColor = "var(--card-bd-hover)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35)"; }
    }}
    onMouseLeave={(e) => {
      if (!isRes) { e.currentTarget.style.borderColor = "var(--card-bd)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.22)"; }
    }}
    >

      {/* TOP: logo + question + gauge */}
      <div style={{ padding: "16px 16px 12px", display: "flex",
        alignItems: "flex-start", gap: 12 }}>
        <AssetIcon asset={asset} size={44} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--card-t1)",
            lineHeight: 1.45, marginBottom: 5 }}>
            {market?.question ?? `Will ${asset} reach its next milestone?`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: "var(--card-t3)" }}>${dp}</span>
            {target && <>
              <span style={{ fontSize: 10, color: "var(--card-t3)" }}>→</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: "rgba(255,255,255,0.45)" }}>${target}</span>
            </>}
          </div>
        </div>

        {/* Arc gauge */}
        {(isActive || (!isRes && market)) && <ArcGauge pct={yesPct} />}

        {/* Resolved badge */}
        {isRes && (
          <div style={{
            padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            flexShrink: 0, letterSpacing: "0.04em",
            background: isResYes ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)",
            color: isResYes ? "#22C55E" : "#EF4444",
            border: `1px solid ${isResYes ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`,
          }}>
            {isResYes ? "YES WON" : "NO WON"}
          </div>
        )}
      </div>

      {/* BODY */}
      <div style={{ padding: "0 16px", flex: 1 }}>

        {!market && (
          <div style={{ padding: "10px", borderRadius: 8, marginBottom: 12,
            background: "rgba(255,255,255,0.03)", textAlign: "center",
            border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: 12, color: "var(--card-t3)" }}>
              Awaiting next price milestone
            </p>
          </div>
        )}

        {isRes && (
          <p style={{ fontSize: 12, color: "var(--card-t3)", textAlign: "center",
            marginBottom: 12 }}>
            Pool: {vol} STT · Payouts distributed
          </p>
        )}

        {market && (isActive || market.status === "EXPIRED") && (
          <>
            {/* Live ticker row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <LiveTicker side="yes" />
              <LiveTicker side="no" />
            </div>

            {/* YES / NO buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {(["YES","NO"] as const).map((side) => {
                const yes = side === "YES";
                const active = betting === side;
                return (
                  <button key={side}
                    onClick={() => { if (!showAmt) { setShowAmt(true); } else { handleBet(side); } }}
                    disabled={!isActive || betting !== null}
                    style={{
                      padding: "10px 12px", borderRadius: 9,
                      background: active
                        ? (yes ? "#16A34A" : "#DC2626")
                        : (yes ? "rgba(34,197,94,0.09)" : "rgba(239,68,68,0.09)"),
                      border: `1px solid ${yes ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                      color: yes ? "#4ADE80" : "#F87171",
                      fontSize: 13, fontWeight: 700,
                      cursor: (isActive && betting === null) ? "pointer" : "default",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      opacity: !isActive ? 0.55 : 1,
                      transition: "background 0.12s",
                    }}
                  >
                    <span>{side}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>
                      {yes ? yesPct : noPct}¢
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Amount input  */}
            {showAmt && isActive && (
              <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{
                  display: "flex", borderRadius: 8, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                }}>
                  <span style={{ padding: "0 12px", fontSize: 12, color: "var(--card-t3)",
                    display: "flex", alignItems: "center",
                    borderRight: "1px solid rgba(255,255,255,0.07)" }}>Amount</span>
                  <input
                    type="number" min="0.001" step="0.01" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      padding: "9px 10px", color: "#fff", fontSize: 13, textAlign: "right",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  <span style={{ padding: "0 12px", fontSize: 12, color: "var(--card-t3)",
                    display: "flex", alignItems: "center",
                    borderLeft: "1px solid rgba(255,255,255,0.07)" }}>STT</span>
                </div>
                {error  && <p style={{ fontSize: 11, color: "#F87171" }}>{error}</p>}
                {txHash && <a href={`https://somnia-testnet.socialscan.io/tx/${txHash}`}
                  target="_blank" style={{ fontSize: 11, color: "#60A5FA" }}>✓ Bet confirmed ↗</a>}
              </div>
            )}
            {isActive && !wallet.isConnected && (
              <p style={{ fontSize: 11, color: "var(--card-t3)",
                textAlign: "center", marginBottom: 10 }}>Connect wallet to place a bet</p>
            )}

            {/* 3px progress bar */}
            <div style={{ height: 3, display: "flex", borderRadius: 4,
              overflow: "hidden", background: "rgba(255,255,255,0.06)", marginBottom: 14 }}>
              <div style={{ width: `${yesPct}%`, background: "#22C55E",
                transition: "width 0.7s", borderRadius: "4px 0 0 4px" }} />
              <div style={{ width: `${noPct}%`, background: "#EF4444",
                transition: "width 0.7s", borderRadius: "0 4px 4px 0" }} />
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        padding: "9px 16px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444",
            letterSpacing: "0.05em" }}>LIVE</span>
          {total > 0 && (
            <span style={{ fontSize: 11, color: "var(--card-t3)",
              marginLeft: 2 }}>· {vol} STT</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {market && <span style={{ fontSize: 11, color: "var(--card-t3)" }}>{timeLabel}</span>}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.22)" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}