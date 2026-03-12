"use client";
import { useState } from "react";
import { ASSETS, AssetSymbol } from "@/lib/config";
import { AssetIcon }           from "@/components/ui/AssetIcon";
import { useAppContext }        from "@/app/providers";
import { SmartBetCondition, MarketSide } from "@/types";

export function SmartBetCreator() {
  const { wallet: { wallet }, smartBets: { fund, registerSmartBet, formattedBalance, isLoading } } = useAppContext();
  const [asset,    setAsset]    = useState<AssetSymbol>("ETH");
  const [cond,     setCond]     = useState<SmartBetCondition>("ABOVE");
  const [trigger,  setTrigger]  = useState("");
  const [side,     setSide]     = useState<MarketSide>("YES");
  const [amount,   setAmount]   = useState("0.1");
  const [fundAmt,  setFundAmt]  = useState("0.5");
  const [tab,      setTab]      = useState<"create"|"fund">("create");
  const [hash,     setHash]     = useState<string|null>(null);
  const [err,      setErr]      = useState<string|null>(null);

  const submit = async () => {
    setErr(null); setHash(null);
    try {
      if (tab === "fund") { setHash(await fund(fundAmt)); }
      else {
        if (!trigger) { setErr("Enter a trigger price"); return; }
        setHash(await registerSmartBet({ asset, condition: cond, triggerPrice: parseFloat(trigger), side, betAmount: amount }));
        setTrigger("");
      }
    } catch (e: any) { setErr(e?.message?.slice(0, 100) || "Failed"); }
  };

  const inputCls: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8, boxSizing: "border-box",
    border: "1px solid var(--border)", background: "var(--surface-alt)",
    color: "var(--t1)", fontSize: 14, outline: "none", fontFamily: "'Manrope', sans-serif",
    transition: "border-color 0.15s",
  };

  const selectCls: React.CSSProperties = {
    ...inputCls, cursor: "pointer", appearance: "none" as any,
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Smart Bet</div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>Auto-execute on conditions</div>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--page-deep)",
          borderRadius: 10, padding: 3, gap: 2 }}>
          {(["create","fund"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: "none", transition: "all 0.15s",
              background: tab === t ? "var(--surface)" : "transparent",
              color: tab === t ? "var(--t1)" : "var(--t3)",
              boxShadow: tab === t ? "var(--shadow-sm)" : "none",
            }}>
              {t === "create" ? "Create Bet" : `Fund Wallet`}
            </button>
          ))}
        </div>

        {/* Balance strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 12px", borderRadius: 8, background: "var(--brand-subtle)",
          border: "1px solid var(--brand-border)" }}>
          <span style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500 }}>Hook Balance</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            fontWeight: 600, color: "var(--brand)" }}>
            {parseFloat(formattedBalance).toFixed(4)} STT
          </span>
        </div>

        {tab === "fund" ? (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)",
              display: "block", marginBottom: 6 }}>DEPOSIT AMOUNT (STT)</label>
            <input type="number" min="0.01" value={fundAmt}
              onChange={(e) => setFundAmt(e.target.value)} style={inputCls} />
          </div>
        ) : (
          <>
            {/* Asset + condition */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)",
                display: "block", marginBottom: 6 }}>CONDITION</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--t3)", flexShrink: 0 }}>If</span>
                <select value={asset} onChange={(e) => setAsset(e.target.value as AssetSymbol)}
                  style={{ ...selectCls, width: "auto", flex: "0 0 80px", fontWeight: 700 }}>
                  <option value="ETH">ETH</option>
                  <option value="BTC">BTC</option>
                  <option value="SOMI">SOMI</option>
                </select>
                <select value={cond} onChange={(e) => setCond(e.target.value as SmartBetCondition)}
                  style={{ ...selectCls, flex: 1 }}>
                  <option value="ABOVE">goes above</option>
                  <option value="BELOW">drops below</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)",
                display: "block", marginBottom: 6 }}>TRIGGER PRICE (USD)</label>
              <input type="number" value={trigger}
                placeholder={`e.g. ${ASSETS[asset].initialPrice}`}
                onChange={(e) => setTrigger(e.target.value)} style={inputCls} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)",
                display: "block", marginBottom: 6 }}>BET SIDE</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {(["YES","NO"] as MarketSide[]).map((s) => (
                  <button key={s} onClick={() => setSide(s)} style={{
                    padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 700,
                    cursor: "pointer", border: "1.5px solid", transition: "all 0.15s",
                    borderColor: s === side
                      ? s === "YES" ? "var(--green-border)" : "var(--red-border)"
                      : "var(--border)",
                    background: s === side
                      ? s === "YES" ? "var(--green-bg)" : "var(--red-bg)"
                      : "transparent",
                    color: s === side
                      ? s === "YES" ? "var(--green)" : "var(--red)"
                      : "var(--t3)",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)",
                display: "block", marginBottom: 6 }}>AMOUNT (STT)</label>
              <input type="number" min="0.001" value={amount}
                onChange={(e) => setAmount(e.target.value)} style={inputCls} />
            </div>
          </>
        )}

        <button onClick={submit} disabled={isLoading || !wallet.isConnected} style={{
          padding: "13px 0", borderRadius: 10, border: "none",
          background: "var(--brand)", color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: (isLoading || !wallet.isConnected) ? "not-allowed" : "pointer",
          opacity: (isLoading || !wallet.isConnected) ? 0.5 : 1,
          boxShadow: "0 1px 2px rgba(105,65,198,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)",
          letterSpacing: "0.01em",
        }}>
          {isLoading ? "Processing..." : tab === "fund" ? "Deposit STT" : "Create Smart Bet"}
        </button>

        {err  && <p style={{ fontSize: 12, color: "var(--red)", marginTop: -6 }}>{err}</p>}
        {hash && (
          <a href={`https://somnia-testnet.socialscan.io/tx/${hash}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--brand)", marginTop: -6 }}>
            ✓ Confirmed — view tx ↗
          </a>
        )}
      </div>
    </div>
  );
}