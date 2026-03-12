// components/betting/PriceUpdater.tsx
"use client";
import { useState } from "react";
import { ASSETS, AssetSymbol } from "@/lib/config";
import { useAppContext } from "@/app/providers";

// Inline SVG logos — no CDN dependency
function CoinIcon({ asset, size = 20 }: { asset: AssetSymbol; size?: number }) {
  if (asset === "ETH") return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16 5.5L15.87 5.95V20.28L16 20.41L22.5 16.48L16 5.5Z" fill="white" fillOpacity="0.9"/>
      <path d="M16 5.5L9.5 16.48L16 20.41V13.5V5.5Z" fill="white" fillOpacity="0.5"/>
      <path d="M16 21.64L15.92 21.74V26.65L16 26.87L22.5 17.72L16 21.64Z" fill="white" fillOpacity="0.9"/>
      <path d="M16 26.87V21.64L9.5 17.72L16 26.87Z" fill="white" fillOpacity="0.5"/>
    </svg>
  );
  if (asset === "BTC") return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.2 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.6 2.6c-.4-.1-.9-.2-1.3-.3l.6-2.6-1.6-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.2-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.7.8 1.1L12 14.9h.3L11 19.1c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.8 2.1.5c.4.1.8.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.3 1.4.4l-.7 2.7 1.6.4.7-2.7c2.7.5 4.7.3 5.6-2.2.7-2-.03-3.1-1.5-3.8.9-.3 1.6-.9 1.8-2zm-3.3 4.6c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.7.8 4.1 2.9zm.5-4.7c-.5 1.8-3.3.9-4.2.7l.8-3.2c1 .3 3.9.7 3.4 2.5z" fill="white"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#6E3FF3"/>
      <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.9"/>
      <circle cx="16" cy="16" r="3" fill="white" fillOpacity="0.9"/>
      <path d="M16 7V9M16 23V25M7 16H9M23 16H25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
    </svg>
  );
}

export function PriceUpdater() {
  const { priceFeed: { prices, updatePrice }, wallet: { wallet } } = useAppContext();
  const [asset, setAsset] = useState<AssetSymbol>("ETH");
  const [price, setPrice] = useState("");
  const [busy,  setBusy]  = useState(false);
  const [hash,  setHash]  = useState<string | null>(null);
  const [err,   setErr]   = useState<string | null>(null);

  const current = prices[asset]
    ? prices[asset]!.displayPrice.toFixed(ASSETS[asset].decimals)
    : "—";

  const submit = async () => {
    if (!price || !wallet.isConnected) return;
    setBusy(true); setErr(null); setHash(null);
    try {
      setHash(await updatePrice(asset, parseFloat(price)));
      setPrice("");
    } catch (e: any) {
      setErr(e?.reason || e?.message?.slice(0, 90) || "Transaction failed");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)",
          display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          {/* Lightning bolt */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#6E3FF3">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Trigger Reactivity
        </div>
        <p style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.5 }}>
          Push a new price on-chain. The Reactivity hook detects it and
          auto-creates a prediction market with zero human intervention.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {[
          { n: 1, label: "Push price" },
          { n: 2, label: "Hook fires" },
          { n: 3, label: "Market created" },
        ].map(({ n, label }, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: n === 1 && hash ? "#6E3FF3" : "rgba(110,63,243,0.12)",
                border: "1px solid rgba(110,63,243,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: n === 1 && hash ? "#fff" : "#6E3FF3",
              }}>{n}</div>
              <span style={{ fontSize: 10, color: "var(--t4)", textAlign: "center",
                lineHeight: 1.2 }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{ width: 20, height: 1, background: "rgba(110,63,243,0.2)",
                marginBottom: 14, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* Asset selector */}
      <div style={{ display: "flex", gap: 5 }}>
        {(["ETH","BTC","SOMI"] as AssetSymbol[]).map((a) => (
          <button key={a} onClick={() => setAsset(a)} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 5, padding: "8px 4px",
            borderRadius: 8, cursor: "pointer", border: "1px solid",
            borderColor: a === asset ? "rgba(110,63,243,0.4)" : "var(--border)",
            background: a === asset ? "rgba(110,63,243,0.07)" : "transparent",
            transition: "all 0.12s",
          }}>
            <CoinIcon asset={a} size={22} />
            <span style={{ fontSize: 11, fontWeight: 600,
              color: a === asset ? "#6E3FF3" : "var(--t4)" }}>{a}</span>
          </button>
        ))}
      </div>

      {/* Current price + input */}
      <div style={{ background: "var(--border-soft)", borderRadius: 8, padding: "10px 12px",
        border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--t4)", marginBottom: 6 }}>
          Current on-chain: <span style={{ fontFamily: "'JetBrains Mono', monospace",
            color: "var(--t2)", fontWeight: 600 }}>${current}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, display: "flex", borderRadius: 7, overflow: "hidden",
            border: "1px solid var(--border)", background: "var(--surface)" }}>
            <span style={{ padding: "0 10px", fontSize: 12, color: "var(--t4)",
              display: "flex", alignItems: "center",
              borderRight: "1px solid var(--border)" }}>$</span>
            <input
              type="number"
              value={price}
              placeholder="New price"
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "9px 10px", color: "var(--t1)", fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>
          <button
            onClick={submit}
            disabled={busy || !price || !wallet.isConnected}
            style={{
              padding: "0 16px", borderRadius: 7, border: "none",
              background: busy ? "rgba(110,63,243,0.4)" : "#6E3FF3",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: (busy || !price || !wallet.isConnected) ? "not-allowed" : "pointer",
              opacity: (!price || !wallet.isConnected) ? 0.5 : 1,
              whiteSpace: "nowrap",
              transition: "background 0.12s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {busy ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.7s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>
                </svg>
                Pushing…
              </>
            ) : "Push ⚡"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {!wallet.isConnected && (
        <p style={{ fontSize: 11, color: "var(--t4)", textAlign: "center" }}>
          Connect wallet to push prices
        </p>
      )}
      {err  && <p style={{ fontSize: 11, color: "#DC2626" }}>{err}</p>}
      {hash && (
        <div style={{ padding: "8px 10px", borderRadius: 7,
          background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
          <p style={{ fontSize: 11, color: "#16A34A", fontWeight: 600, marginBottom: 2 }}>
            ⚡ Reactivity hook triggered
          </p>
          <p style={{ fontSize: 11, color: "var(--t3)" }}>
            Market will auto-create in the next block.{" "}
            <a href={`https://somnia-testnet.socialscan.io/tx/${hash}`}
              target="_blank" style={{ color: "#16A34A" }}>View tx ↗</a>
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}