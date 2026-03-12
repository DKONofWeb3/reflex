"use client";
import { ethers } from "ethers";

interface Props { yesPool: bigint; noPool: bigint; totalPool: bigint; }

export function PoolBar({ yesPool, noPool, totalPool }: Props) {
  const total  = Number(totalPool);
  const yesPct = total === 0 ? 50 : Math.round((Number(yesPool) / total) * 100);
  const noPct  = 100 - yesPct;
  const totSTT = parseFloat(ethers.formatEther(totalPool)).toFixed(2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#12B76A" }}>YES {yesPct}%</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)",
          fontFamily: "'JetBrains Mono', monospace" }}>{totSTT} STT pool</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#F97066" }}>NO {noPct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, display: "flex", overflow: "hidden",
        background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${yesPct}%`, background: "#12B76A",
          transition: "width 0.6s ease" }} />
        <div style={{ width: `${noPct}%`, background: "#F97066",
          transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}