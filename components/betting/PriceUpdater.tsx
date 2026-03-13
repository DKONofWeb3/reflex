// components/betting/PriceUpdater.tsx
"use client";
import { useState } from "react";
import { ethers }   from "ethers";
import { ASSETS, AssetSymbol, CONTRACTS } from "@/lib/config";
import { REACTIVITY_HOOK_ABI } from "@/lib/abis/ReactivityHook.abi";
import { getSigner } from "@/lib/provider";
import { useAppContext } from "@/app/providers";

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

const DURATIONS = [
  { label: "5 min",   secs: 300 },
  { label: "15 min",  secs: 900 },
  { label: "1 hour",  secs: 3600 },
  { label: "4 hours", secs: 14400 },
  { label: "1 day",   secs: 86400 },
];

function friendlyError(e: any): string {
  const msg: string = e?.message || e?.reason || "";
  if (msg.includes("user rejected") || msg.includes("ACTION_REJECTED") || msg.includes("4001"))
    return "Transaction cancelled.";
  if (msg.includes("insufficient funds") || msg.includes("exceeds balance"))
    return "Insufficient STT balance.";
  if (msg.includes("MarketAlreadyActive") || msg.includes("already"))
    return "A market for this asset is already active — wait for it to end.";
  if (msg.includes("execution reverted"))
    return "Transaction failed. Try again.";
  return "Something went wrong. Please try again.";
}

type Phase = "idle" | "pushing" | "creating" | "done" | "error";

export function PriceUpdater() {
  const { priceFeed: { prices, updatePrice }, wallet: { wallet } } = useAppContext();
  const [asset,      setAsset]      = useState<AssetSymbol>("ETH");
  const [price,      setPrice]      = useState("");
  const [duration,   setDuration]   = useState(DURATIONS[0]);
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [pushHash,   setPushHash]   = useState<string | null>(null);
  const [createHash, setCreateHash] = useState<string | null>(null);
  const [statusMsg,  setStatusMsg]  = useState<string>("");
  const [err,        setErr]        = useState<string | null>(null);

  const current = prices[asset]
    ? prices[asset]!.displayPrice.toFixed(ASSETS[asset].decimals)
    : "—";

  const busy = phase === "pushing" || phase === "creating";

  const handleLaunch = async () => {
    if (!price || !wallet.isConnected) return;
    setErr(null); setPushHash(null); setCreateHash(null);

    // Step 1: Push price
    setPhase("pushing");
    setStatusMsg("Pushing price on-chain…");
    let pushTxHash: string;
    try {
      pushTxHash = await updatePrice(asset, parseFloat(price));
      setPushHash(pushTxHash);
      setPrice("");
    } catch (e: any) {
      setErr(friendlyError(e));
      setPhase("error");
      return;
    }

    // Step 2: Create market with selected duration
    setPhase("creating");
    setStatusMsg("Creating prediction market…");
    try {
      const signer = await getSigner();
      const hook   = new ethers.Contract(CONTRACTS.REACTIVITY_HOOK, REACTIVITY_HOOK_ABI, signer);
      const tx     = await hook.manualTrigger(asset, BigInt(duration.secs));
      const receipt = await tx.wait();
      setCreateHash(receipt.hash);
      setPhase("done");
      setStatusMsg("");
    } catch (e: any) {
      const msg: string = e?.message || "";
      if (msg.includes("MarketAlreadyActive") || msg.includes("already")) {
        setPhase("done");
        setStatusMsg("Market already active — place your bets!");
      } else {
        setErr(friendlyError(e));
        setPhase("error");
      }
    }
  };

  const reset = () => {
    setPhase("idle"); setPushHash(null); setCreateHash(null);
    setErr(null); setStatusMsg("");
  };

  const step1Done = phase === "creating" || phase === "done";
  const step2Done = phase === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)",
          display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#6E3FF3">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Trigger Reactivity
        </div>
        <p style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.5 }}>
          Push a price on-chain → market auto-creates → users bet YES or NO
          before the timer runs out.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {[
          { n: 1, label: "Push price",    done: step1Done },
          { n: 2, label: "Create market", done: step2Done },
          { n: 3, label: "Bet & resolve", done: false      },
        ].map(({ n, label, done }, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: done ? "#6E3FF3" : "rgba(110,63,243,0.12)",
                border: "1px solid rgba(110,63,243,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: done ? "#fff" : "#6E3FF3",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 10, color: done ? "var(--t2)" : "var(--t4)",
                textAlign: "center", lineHeight: 1.2 }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{ width: 16, height: 1, marginBottom: 14, flexShrink: 0,
                background: done ? "#6E3FF3" : "rgba(110,63,243,0.2)",
                transition: "background 0.3s" }} />
            )}
          </div>
        ))}
      </div>

      {/* Asset selector */}
      <div style={{ display: "flex", gap: 5 }}>
        {(["ETH","BTC","SOMI"] as AssetSymbol[]).map((a) => (
          <button key={a} onClick={() => { setAsset(a); reset(); }} style={{
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

      {/* Duration selector */}
      <div>
        <div style={{ fontSize: 11, color: "var(--t4)", marginBottom: 5 }}>Market duration</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {DURATIONS.map((d) => (
            <button key={d.label} onClick={() => setDuration(d)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              borderColor: duration.label === d.label ? "rgba(110,63,243,0.5)" : "var(--border)",
              background: duration.label === d.label ? "rgba(110,63,243,0.12)" : "transparent",
              color: duration.label === d.label ? "#6E3FF3" : "var(--t4)",
              transition: "all 0.1s",
            }}>{d.label}</button>
          ))}
        </div>
      </div>

      {/* Price input + Launch */}
      {(phase === "idle" || phase === "error") && (
        <div style={{ background: "var(--border-soft)", borderRadius: 8,
          padding: "10px 12px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--t4)", marginBottom: 6 }}>
            Current on-chain:{" "}
            <span style={{ fontFamily: "'JetBrains Mono', monospace",
              color: "var(--t2)", fontWeight: 600 }}>${current}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, display: "flex", borderRadius: 7, overflow: "hidden",
              border: "1px solid var(--border)", background: "var(--surface)" }}>
              <span style={{ padding: "0 10px", fontSize: 12, color: "var(--t4)",
                display: "flex", alignItems: "center",
                borderRight: "1px solid var(--border)" }}>$</span>
              <input
                type="number" value={price} placeholder="New price"
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none",
                  padding: "9px 10px", color: "var(--t1)", fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
            <button onClick={handleLaunch}
              disabled={!price || !wallet.isConnected}
              style={{
                padding: "0 14px", borderRadius: 7, border: "none",
                background: "#6E3FF3", color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: (!price || !wallet.isConnected) ? "not-allowed" : "pointer",
                opacity: (!price || !wallet.isConnected) ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}>
              Launch ⚡
            </button>
          </div>
          {err && (
            <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 6,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12 }}>⚠</span>
              <span style={{ fontSize: 11, color: "#FCA5A5", flex: 1 }}>{err}</span>
              <button onClick={() => setErr(null)} style={{ background: "none", border: "none",
                color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
            </div>
          )}
        </div>
      )}

      {/* In-progress */}
      {(phase === "pushing" || phase === "creating") && (
        <div style={{ padding: "12px", borderRadius: 8,
          background: "rgba(110,63,243,0.06)", border: "1px solid rgba(110,63,243,0.2)",
          display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#6E3FF3" strokeWidth="2.5"
            style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6E3FF3" }}>{statusMsg}</div>
            <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>
              {phase === "pushing" ? "Confirm in your wallet…" : "Waiting for confirmation…"}
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div style={{ padding: "10px 12px", borderRadius: 8,
          background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#22C55E", marginBottom: 4 }}>
            {statusMsg || "Market is live — place your bets!"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {pushHash && (
              <a href={"https://shannon-explorer.somnia.network/tx/" + pushHash}
                target="_blank" style={{ fontSize: 11, color: "var(--t4)" }}>Price tx ↗</a>
            )}
            {createHash && (
              <a href={"https://shannon-explorer.somnia.network/tx/" + createHash}
                target="_blank" style={{ fontSize: 11, color: "#22C55E" }}>Market created tx ↗</a>
            )}
          </div>
          <button onClick={reset}
            style={{ marginTop: 8, fontSize: 11, color: "var(--t4)", background: "none",
              border: "none", cursor: "pointer", padding: 0 }}>
            Launch another →
          </button>
        </div>
      )}

      {!wallet.isConnected && (
        <p style={{ fontSize: 11, color: "var(--t4)", textAlign: "center" }}>
          Connect wallet to push prices
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}