"use client";
import { useAppContext } from "@/app/providers";
import { ActivityEventType } from "@/types";

const TYPE_COLORS: Record<ActivityEventType, string> = {
  PRICE_UPDATE:    "#9CA3AF",
  MARKET_CREATED:  "#6E3FF3",
  BET_PLACED:      "#2563EB",
  MARKET_RESOLVED: "#D97706",
  PAYOUT_SENT:     "#059669",
  SMART_BET_FIRED: "#6E3FF3",
};

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return "now";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m`;
}

export function ActivityFeed() {
  const { activity: { events, isLive } } = useAppContext();

  return (
    <div style={{
      background: "var(--bg)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Activity</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {events.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center",
            fontSize: 13, color: "var(--t4)" }}>
            Waiting for events...
          </div>
        ) : events.slice(0, 30).map((e) => (
          <div key={e.id} style={{
            display: "flex", gap: 10, padding: "10px 16px",
            borderBottom: "1px solid var(--border-soft)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
              background: TYPE_COLORS[e.type] || "#9CA3AF",
            }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.45 }}>{e.message}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "var(--t4)" }}>{ago(e.timestamp)}</span>
                {e.txHash && (
                  <a href={`https://somnia-testnet.socialscan.io/tx/${e.txHash}`}
                    target="_blank" style={{ fontSize: 11, color: "var(--brand)" }}>
                    {e.txHash.slice(0, 8)}...
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}