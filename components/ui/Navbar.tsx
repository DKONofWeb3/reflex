// components/ui/Navbar.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAppContext } from "@/app/providers";
import { formatSTT, shortenAddress } from "@/lib/provider";
import { WalletModal } from "@/components/ui/WalletModal";

export function Navbar() {
  const pathname = usePathname();
  const { wallet: { wallet, connect, switchToSomnia, isConnecting }, darkMode, toggleDark } = useAppContext();
  const [smartBetOpen,  setSmartBetOpen]  = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);

  const handleConnect = async () => {
    await connect();
  };

  return (
    <>
      <header style={{
        height: "var(--nav-h)", background: "var(--nav-bg)",
        borderBottom: "1px solid var(--nav-border)",
        position: "sticky", top: 0, zIndex: 200,
      }}>
        <div style={{
          padding: "0 20px", height: "100%",
          display: "flex", alignItems: "center", gap: 0,
        }}>
          {/* Wordmark */}
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center",
            gap: 3, marginRight: 28, flexShrink: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 800,
              letterSpacing: "-0.04em", color: "var(--t1)" }}>reflex</span>
            <div style={{ width: 6, height: 6, borderRadius: "50%",
              background: "var(--brand)", marginBottom: 5 }} />
          </Link>

          {/* Desktop nav tabs */}
          <nav style={{ display: "flex", flex: 1, height: "100%" }}
            className="hide-mobile">
            {[
              { href: "/dashboard", label: "Markets" },
              { href: "/history",   label: "Portfolio" },
            ].map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  padding: "0 14px", height: "100%",
                  display: "flex", alignItems: "center",
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? "var(--t1)" : "var(--t3)",
                  borderBottom: `2px solid ${active ? "var(--t1)" : "transparent"}`,
                  transition: "color 0.15s",
                }}>{label}</Link>
              );
            })}
            <button onClick={() => setSmartBetOpen(!smartBetOpen)} style={{
              padding: "0 14px", height: "100%", background: "none", border: "none",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 14, fontWeight: 400,
              color: smartBetOpen ? "var(--brand)" : "var(--t3)",
              borderBottom: `2px solid ${smartBetOpen ? "var(--brand)" : "transparent"}`,
              cursor: "pointer",
            }}>
              Smart Bet
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d={smartBetOpen ? "M9 5L5 1L1 5" : "M1 1L5 5L9 1"}
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </nav>

          {/* Spacer on mobile */}
          <div style={{ flex: 1 }} className="show-mobile" />

          {/* Right: dark mode + wallet */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Dark mode toggle */}
            <button onClick={toggleDark} style={{
              width: 36, height: 36, borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--t3)",
            }}>
              {darkMode ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* Wallet button */}
            {!wallet.isConnected ? (
              <button
                onClick={() => setWalletModalOpen(true)}
                disabled={isConnecting}
                style={{
                  padding: "9px 18px", borderRadius: 8,
                  background: "var(--brand)", color: "#fff",
                  border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                  opacity: isConnecting ? 0.7 : 1,
                  whiteSpace: "nowrap",
                }}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : !wallet.isCorrectNetwork ? (
              <button onClick={switchToSomnia} style={{
                padding: "9px 16px", borderRadius: 8,
                border: "1px solid rgba(220,38,38,0.4)",
                background: "rgba(220,38,38,0.08)", color: "#DC2626",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
                Switch Network
              </button>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--surface)",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6E3FF3, #0066FF)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff", fontWeight: 800, flexShrink: 0,
                }}>
                  {wallet.address?.slice(2, 4).toUpperCase()}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, color: "var(--t2)", fontWeight: 500 }}
                  className="hide-mobile">
                  {shortenAddress(wallet.address!)}
                </span>
                <span style={{ fontSize: 12, color: "var(--t4)" }}
                  className="hide-mobile">
                  {parseFloat(formatSTT(wallet.balance ?? 0n)).toFixed(2)} STT
                </span>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="show-mobile"
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: "1px solid var(--border)", background: "transparent",
                display: "none", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--t3)", flexShrink: 0,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed", top: "var(--nav-h)", left: 0, right: 0,
          background: "var(--nav-bg)", borderBottom: "1px solid var(--nav-border)",
          zIndex: 199, padding: "8px 16px 16px",
        }}>
          {[
            { href: "/dashboard", label: "Markets" },
            { href: "/history",   label: "Portfolio" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: "block", padding: "12px 4px",
                fontSize: 15, fontWeight: 500, color: "var(--t1)",
                borderBottom: "1px solid var(--border)",
              }}>{label}</Link>
          ))}
          <button onClick={() => { setSmartBetOpen(true); setMobileMenuOpen(false); }}
            style={{
              display: "block", width: "100%", padding: "12px 4px",
              fontSize: 15, fontWeight: 500, color: "var(--t1)",
              background: "none", border: "none", textAlign: "left",
              cursor: "pointer",
            }}>Smart Bet</button>
        </div>
      )}

      {/* Smart Bet panel */}
      {smartBetOpen && (
        <div style={{
          position: "sticky", top: "var(--nav-h)", zIndex: 199,
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}>
          <SmartBetPanel onClose={() => setSmartBetOpen(false)} />
        </div>
      )}

      {/* Wallet modal */}
      {walletModalOpen && (
        <WalletModal
          onClose={() => setWalletModalOpen(false)}
          onConnect={handleConnect}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}

function SmartBetPanel({ onClose }: { onClose: () => void }) {
  const { wallet: { wallet }, smartBets: { fund, registerSmartBet, formattedBalance, isLoading } } = useAppContext();
  const [tab,     setTab]     = useState<"create"|"fund">("create");
  const [asset,   setAsset]   = useState<"ETH"|"BTC"|"SOMI">("ETH");
  const [cond,    setCond]    = useState<"ABOVE"|"BELOW">("ABOVE");
  const [trigger, setTrigger] = useState("");
  const [side,    setSide]    = useState<"YES"|"NO">("YES");
  const [amount,  setAmount]  = useState("0.1");
  const [fundAmt, setFundAmt] = useState("0.5");
  const [hash,    setHash]    = useState<string|null>(null);
  const [err,     setErr]     = useState<string|null>(null);

  const submit = async () => {
    setErr(null); setHash(null);
    try {
      if (tab === "fund") { setHash(await fund(fundAmt)); }
      else {
        if (!trigger) { setErr("Enter trigger price"); return; }
        setHash(await registerSmartBet({ asset, condition: cond, triggerPrice: parseFloat(trigger), side, betAmount: amount }));
        setTrigger("");
      }
    } catch (e: any) {
      const msg: string = e?.message || e?.reason || "";
      if (msg.includes("user rejected") || msg.includes("ACTION_REJECTED") || msg.includes("4001"))
        setErr("Transaction cancelled.");
      else if (msg.includes("insufficient funds"))
        setErr("Insufficient STT balance.");
      else if (msg.includes("InsufficientBalance"))
        setErr("Not enough deposited STT. Fund your account first.");
      else
        setErr("Something went wrong. Please try again.");
    }
  };

  const s: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--surface)", color: "var(--t1)", fontSize: 13, outline: "none",
    width: "100%", boxSizing: "border-box" as any, fontFamily: "inherit",
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Smart Bet</div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
            Set conditions · Somnia Reactivity fires the bet automatically on-chain
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none",
          cursor: "pointer", color: "var(--t4)", fontSize: 22, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 3, background: "var(--border-soft)",
            borderRadius: 8, padding: 3 }}>
            {(["create","fund"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 13,
                fontWeight: t === tab ? 600 : 400, cursor: "pointer", border: "none",
                background: t === tab ? "var(--surface)" : "transparent",
                color: t === tab ? "var(--t1)" : "var(--t3)",
                boxShadow: t === tab ? "var(--shadow-sm)" : "none",
              }}>{t === "create" ? "Create Bet" : `Fund (${parseFloat(formattedBalance).toFixed(2)} STT)`}</button>
            ))}
          </div>

          {tab === "fund" ? (
            <input type="number" value={fundAmt} onChange={(e) => setFundAmt(e.target.value)}
              placeholder="Amount in STT" style={s} />
          ) : (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                <select value={asset} onChange={(e) => setAsset(e.target.value as any)}
                  style={{ ...s, width: "auto", flex: "0 0 80px", cursor: "pointer" }}>
                  <option>ETH</option><option>BTC</option><option>SOMI</option>
                </select>
                <select value={cond} onChange={(e) => setCond(e.target.value as any)}
                  style={{ ...s, flex: 1, cursor: "pointer" }}>
                  <option value="ABOVE">goes above</option>
                  <option value="BELOW">drops below</option>
                </select>
                <input type="number" value={trigger} onChange={(e) => setTrigger(e.target.value)}
                  placeholder="$ price" style={{ ...s, flex: "0 0 100px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {(["YES","NO"] as const).map((sv) => (
                  <button key={sv} onClick={() => setSide(sv)} style={{
                    padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", border: "1px solid",
                    borderColor: sv === side
                      ? sv === "YES" ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.4)"
                      : "var(--border)",
                    background: sv === side
                      ? sv === "YES" ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)"
                      : "transparent",
                    color: sv === side ? sv === "YES" ? "#16A34A" : "#DC2626" : "var(--t3)",
                  }}>{sv}</button>
                ))}
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="STT" style={{ ...s, gridColumn: "3" }} />
              </div>
            </>
          )}

          <button onClick={submit} disabled={isLoading || !wallet.isConnected} style={{
            padding: "11px 0", borderRadius: 8, border: "none",
            background: "var(--brand)", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: (isLoading || !wallet.isConnected) ? "not-allowed" : "pointer",
            opacity: (isLoading || !wallet.isConnected) ? 0.5 : 1,
          }}>
            {isLoading ? "Processing..." : tab === "fund" ? "Deposit STT" : "Create Smart Bet"}
          </button>

          {err && (
            <div style={{ padding: "8px 10px", borderRadius: 7,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12 }}>⚠</span>
              <span style={{ fontSize: 11, color: "#FCA5A5", flex: 1 }}>{err}</span>
              <button onClick={() => setErr(null)} style={{ background: "none", border: "none",
                color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
            </div>
          )}
          {hash && <a href={"https://shannon-explorer.somnia.network/tx/" + hash}
            target="_blank" style={{ fontSize: 12, color: "var(--brand)" }}>✓ Confirmed ↗</a>}
        </div>

        <div style={{ padding: "16px", borderRadius: 10, background: "var(--border-soft)",
          border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 12 }}>
            How it works
          </div>
          {[
            ["Fund", "Deposit STT into the Reactivity hook contract"],
            ["Condition", "Set an asset, trigger price, and direction"],
            ["Auto-execute", "When price hits trigger, Reactivity fires the bet — no bots"],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                background: "var(--brand-bg)", border: "1px solid var(--brand-bd)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "var(--brand)" }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{t}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}