"use client";
import { useState, useEffect } from "react";

export function CountdownTimer({ deadline }: { deadline: number }) {
  const [rem, setRem] = useState(0);

  useEffect(() => {
    const calc = () => Math.max(0, deadline - Math.floor(Date.now() / 1000));
    setRem(calc());
    const t = setInterval(() => setRem(calc()), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  const h    = Math.floor(rem / 3600);
  const m    = Math.floor((rem % 3600) / 60);
  const s    = rem % 60;
  const exp  = rem === 0;
  const urg  = !exp && rem <= 60;

  const label = exp ? "Expired"
    : h > 0 ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  const color  = exp ? "var(--t3)" : urg ? "var(--red)"  : "var(--teal)";
  const bg     = exp ? "transparent" : urg ? "var(--red-bg)" : "var(--teal-bg)";
  const border = exp ? "transparent" : urg ? "var(--red-border)" : "var(--teal-border)";

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 11px", borderRadius: 8,
      background: bg, border: `1.5px solid ${border}`,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 15, fontWeight: 500, color, letterSpacing: "0.04em",
      }}>{label}</span>
    </div>
  );
}