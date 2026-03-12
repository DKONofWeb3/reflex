// Real crypto logo images from jsdelivr CDN
"use client";
import { AssetSymbol } from "@/lib/config";

// CDN-hosted color crypto icons (atomiclabs set — reliable, widely used)
const LOGO_URLS: Record<AssetSymbol, string> = {
  ETH:  "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/svg/color/eth.svg",
  BTC:  "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/svg/color/btc.svg",
  SOMI: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.0.0/svg/color/som.svg",
};

// Fallback background colors if image fails to load
const FALLBACK_COLORS: Record<AssetSymbol, { bg: string; text: string; label: string }> = {
  ETH:  { bg: "#627EEA15", text: "#627EEA", label: "ETH" },
  BTC:  { bg: "#F7931A15", text: "#F7931A", label: "BTC" },
  SOMI: { bg: "#6941C615", text: "#6941C6", label: "S"  },
};

interface Props {
  asset: AssetSymbol;
  size?: number;
}

export function AssetIcon({ asset, size = 36 }: Props) {
  const fb = FALLBACK_COLORS[asset];

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: fb.bg, border: `1.5px solid ${fb.text}22`,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
    }}>
      <img
        src={LOGO_URLS[asset]}
        alt={asset}
        width={size * 0.62}
        height={size * 0.62}
        style={{ display: "block" }}
        onError={(e) => {
          // On load failure, hide img and show text fallback
          const img = e.currentTarget;
          img.style.display = "none";
          const span = document.createElement("span");
          span.textContent = fb.label;
          span.style.cssText = `font-family:Manrope,sans-serif;font-size:${size * 0.32}px;font-weight:700;color:${fb.text}`;
          img.parentElement?.appendChild(span);
        }}
      />
    </div>
  );
}