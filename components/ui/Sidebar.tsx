// components/ui/Sidebar.tsx
"use client";
import { AssetSymbol } from "@/lib/config";

export type TimeFilter  = "all" | "5min" | "15min" | "hourly" | "4hour" | "daily" | "weekly" | "monthly";
export type AssetFilter = "all" | AssetSymbol;

interface Props {
  timeFilter: TimeFilter; assetFilter: AssetFilter;
  onTimeChange: (t: TimeFilter) => void; onAssetChange: (a: AssetFilter) => void;
  timeCount?: (key: TimeFilter) => number;
}

const ASSET_LOGOS: Record<AssetSymbol, string> = {
  ETH:  "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/128/color/eth.png",
  BTC:  "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/128/color/btc.png",
  SOMI: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/128/color/som.png",
};

const TIMES: { key: TimeFilter; label: string }[] = [
  { key: "all",     label: "All"     },
  { key: "5min",    label: "5 Min"   },
  { key: "15min",   label: "15 Min"  },
  { key: "hourly",  label: "1 Hour"  },
  { key: "4hour",   label: "4 Hours" },
  { key: "daily",   label: "Daily"   },
  { key: "weekly",  label: "Weekly"  },
  { key: "monthly", label: "Monthly" },
];

const ASSETS: { key: AssetFilter; label: string; logo?: string }[] = [
  { key: "all",  label: "All" },
  { key: "BTC",  label: "Bitcoin",  logo: ASSET_LOGOS.BTC  },
  { key: "ETH",  label: "Ethereum", logo: ASSET_LOGOS.ETH  },
  { key: "SOMI", label: "Somnia",   logo: ASSET_LOGOS.SOMI },
];

export function Sidebar({ timeFilter, assetFilter, onTimeChange, onAssetChange, timeCount }: Props) {
  const Row = ({ active, onClick, icon, label, count }: {
    active: boolean; onClick: () => void;
    icon?: React.ReactNode; label: string; count?: number;
  }) => (
    <button onClick={onClick} style={{
      width: "100%", padding: "8px 14px", borderRadius: 8,
      background: active ? "rgba(0,102,255,0.08)" : "transparent",
      border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 10,
      color: active ? "#0066FF" : "var(--t2)",
      fontSize: 13, fontWeight: active ? 600 : 400,
      transition: "background 0.1s",
      textAlign: "left" as const,
    }}>
      {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 12, color: active ? "#0066FF" : "var(--t4)",
          fontWeight: 500 }}>{count}</span>
      )}
    </button>
  );

  const ClockIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  );

  const GridIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );

  return (
    <aside style={{
      width: "var(--sidebar-w)", flexShrink: 0,
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--sidebar-bd)",
      height: "calc(100vh - var(--nav-h))",
      position: "sticky", top: "var(--nav-h)",
      overflowY: "auto", padding: "12px 8px",
    }}>
      {/* Time filters */}
      <Row
        active={timeFilter === "all"} onClick={() => onTimeChange("all")}
        icon={<GridIcon />} label="All" count={timeCount ? timeCount("all") : undefined}
      />
      <div style={{ height: 8 }} />
      {TIMES.filter((t) => t.key !== "all").map(({ key, label }) => (
        <Row key={key} active={timeFilter === key} onClick={() => onTimeChange(key)}
          icon={<ClockIcon />} label={label}
          count={timeCount ? timeCount(key as TimeFilter) : undefined} />
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "12px 6px" }} />

      {/* Asset filters */}
      {ASSETS.map(({ key, label, logo }) => (
        <Row key={key} active={assetFilter === key} onClick={() => onAssetChange(key)}
          icon={logo ? (
            <div style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={logo} width={18} height={18} alt={label}
                style={{ objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : undefined}
          label={label}
        />
      ))}
    </aside>
  );
}