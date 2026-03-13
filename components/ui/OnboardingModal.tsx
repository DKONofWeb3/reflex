// components/ui/OnboardingModal.tsx
"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "reflex_onboarded_v1";

const STEPS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6E3FF3" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: "What is REFLEX?",
    body: "REFLEX is a prediction market. Like betting on a football match — but for crypto prices, fully automated, and settled on-chain with zero human interference.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    title: "How markets work",
    body: 'When a new price is pushed on-chain, the system automatically asks: "Will ETH hit $2200 in the next hour?" Users bet YES or NO with STT tokens. When the timer ends or the price is hit — the winners split the pool.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#6E3FF3">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    title: "Somnia Reactivity",
    body: "Smart contracts can't browse the internet. Somnia's Reactivity layer listens for on-chain price events and automatically triggers market creation — no bots, no servers, just the chain reacting to itself in real time.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    title: "Your role as a demo user",
    body: 'You push prices manually (simulating a live oracle). Type a price like $2100 for ETH → the system sets the target automatically → market opens → bet YES or NO → push $2250 → market resolves → claim your winnings.',
  },
];

export function OnboardingModal() {
  const [open,    setOpen]    = useState(false);
  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
        setTimeout(() => setVisible(true), 30);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 220);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  };

  if (!open) return null;

  const s = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.22s",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, pointerEvents: "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 460,
          background: "var(--surface, #1B1C2E)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "32px 28px 24px",
          pointerEvents: "auto",
          transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.22s ease, opacity 0.22s ease",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Close */}
          <button onClick={dismiss} style={{
            position: "absolute" as const, top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.3)", fontSize: 20, lineHeight: 1, padding: 4,
          }}>×</button>

          {/* Step dot indicator */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: i <= step ? "#6E3FF3" : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          {/* Icon */}
          <div style={{ marginBottom: 16 }}>{s.icon}</div>

          {/* Title */}
          <div style={{
            fontSize: 20, fontWeight: 700, color: "var(--t1, #fff)",
            marginBottom: 10, lineHeight: 1.3,
          }}>
            {s.title}
          </div>

          {/* Body */}
          <p style={{
            fontSize: 14, color: "var(--t3, rgba(255,255,255,0.55))",
            lineHeight: 1.65, marginBottom: 28,
          }}>
            {s.body}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={dismiss} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "rgba(255,255,255,0.3)", padding: 0,
            }}>
              Skip intro
            </button>
            <button onClick={next} style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: "#6E3FF3", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              {step < STEPS.length - 1 ? "Next →" : "Let's go ⚡"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}