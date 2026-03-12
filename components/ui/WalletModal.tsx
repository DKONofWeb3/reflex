// components/ui/WalletModal.tsx
"use client";
import { useEffect, useState } from "react";

interface WalletOption {
  id:       string;
  name:     string;
  icon:     React.ReactNode;
  detected: boolean;
  label?:   string; // "Detected" | "Not installed"
}

function IconMetaMask() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#F6851B"/>
      <path d="M25.5 6.5L17.8 12.1l1.4-3.4L25.5 6.5z" fill="#E2761B"/>
      <path d="M6.5 6.5l7.6 5.7-1.3-3.5L6.5 6.5z" fill="#E4761B"/>
      <path d="M22.7 20.8l-2 3.1 4.3 1.2 1.2-4.2-3.5-.1z" fill="#E4761B"/>
      <path d="M5.8 20.9l1.2 4.2 4.3-1.2-2-3.1-3.5.1z" fill="#E4761B"/>
      <path d="M11 14.7l-1.2 1.8 4.3.2-.1-4.6L11 14.7z" fill="#E4761B"/>
      <path d="M21 14.7l-3-2.7-.2 4.7 4.3-.2L21 14.7z" fill="#E4761B"/>
      <path d="M11.3 23.9l2.6-1.2-2.2-1.7-.4 2.9z" fill="#E4761B"/>
      <path d="M18.1 22.7l2.6 1.2-.4-2.9-2.2 1.7z" fill="#E4761B"/>
    </svg>
  );
}

function IconRabby() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#7B61FF"/>
      <ellipse cx="16" cy="14" rx="7" ry="5" fill="white" fillOpacity="0.9"/>
      <ellipse cx="11" cy="12" rx="2" ry="2.5" fill="#7B61FF"/>
      <ellipse cx="21" cy="12" rx="2" ry="2.5" fill="#7B61FF"/>
      <circle cx="11.5" cy="11.5" r="1" fill="white"/>
      <circle cx="20.5" cy="11.5" r="1" fill="white"/>
      <path d="M13 17c1 1.5 5 1.5 6 0" stroke="#7B61FF" strokeWidth="1" strokeLinecap="round"/>
      <ellipse cx="16" cy="20" rx="5" ry="3" fill="white" fillOpacity="0.7"/>
    </svg>
  );
}

function IconCoinbase() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#1652F0"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <rect x="13" y="13" width="6" height="6" rx="1.5" fill="#1652F0"/>
    </svg>
  );
}

function IconWalletConnect() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#3B99FC"/>
      <path d="M10 14.5c3.3-3.3 8.7-3.3 12 0l.4.4c.2.2.2.5 0 .7l-1.4 1.4c-.1.1-.3.1-.4 0l-.5-.5c-2.3-2.3-6-2.3-8.3 0l-.5.5c-.1.1-.3.1-.4 0l-1.4-1.4c-.2-.2-.2-.5 0-.7l.5-.4zm14.8 2.8l1.2 1.2c.2.2.2.5 0 .7l-5.5 5.5c-.2.2-.5.2-.7 0l-3.9-3.9c-.1-.1-.2-.1-.3 0l-3.9 3.9c-.2.2-.5.2-.7 0l-5.5-5.5c-.2-.2-.2-.5 0-.7l1.2-1.2c.2-.2.5-.2.7 0l3.9 3.9c.1.1.2.1.3 0l3.9-3.9c.2-.2.5-.2.7 0l3.9 3.9c.1.1.2.1.3 0l3.9-3.9c.2-.2.5-.2.7 0z" fill="white"/>
    </svg>
  );
}

function IconBrowser() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: 8,
      background: "rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.5)" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        <path d="M2 12h20"/>
      </svg>
    </div>
  );
}

interface Props {
  onClose:  () => void;
  onConnect: (type: "metamask" | "injected") => Promise<void>;
}

export function WalletModal({ onClose, onConnect }: Props) {
  const [detected, setDetected] = useState<Record<string, boolean>>({});
  const [loading,  setLoading]  = useState<string | null>(null);
  const [err,      setErr]      = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDetected({
      metamask:    !!(window.ethereum?.isMetaMask),
      rabby:       !!(window.ethereum?.isRabby),
      coinbase:    !!(window.ethereum?.isCoinbaseWallet),
      injected:    !!(window.ethereum),
    });
    // Trap scroll on mount
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const wallets: WalletOption[] = [
    {
      id: "metamask", name: "MetaMask",
      icon: <IconMetaMask />,
      detected: detected.metamask,
    },
    {
      id: "rabby", name: "Rabby",
      icon: <IconRabby />,
      detected: detected.rabby,
    },
    {
      id: "injected", name: "Browser Wallet",
      icon: <IconBrowser />,
      detected: detected.injected,
      label: detected.injected ? "Detected" : undefined,
    },
    {
      id: "coinbase", name: "Coinbase Wallet",
      icon: <IconCoinbase />,
      detected: detected.coinbase,
    },
    {
      id: "walletconnect", name: "WalletConnect",
      icon: <IconWalletConnect />,
      detected: false,
      label: "Coming soon",
    },
  ];

  const handleClick = async (wallet: WalletOption) => {
    if (wallet.id === "walletconnect") return;
    if (!wallet.detected && wallet.id !== "injected") {
      // Open install page
      const urls: Record<string, string> = {
        metamask: "https://metamask.io/download/",
        rabby:    "https://rabby.io/",
        coinbase: "https://www.coinbase.com/wallet/downloads",
      };
      window.open(urls[wallet.id], "_blank");
      return;
    }
    setErr(null);
    setLoading(wallet.id);
    try {
      await onConnect("injected");
      onClose();
    } catch (e: any) {
      setErr(e?.message?.slice(0, 100) || "Connection failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "modal-backdrop 0.15s ease",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400,
          background: "#1A1B2E",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "24px",
          animation: "modal-slide 0.2s ease",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff",
              margin: 0, letterSpacing: "-0.02em" }}>Connect Wallet</h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)",
              margin: "4px 0 0" }}>
              Choose a wallet to connect to REFLEX
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.5)", fontSize: 18,
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>×</button>
        </div>

        {/* Wallet list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {wallets.map((w) => {
            const isLoading = loading === w.id;
            const isComingSoon = w.label === "Coming soon";
            const notInstalled = !w.detected && !isComingSoon && w.id !== "injected";

            return (
              <button
                key={w.id}
                onClick={() => handleClick(w)}
                disabled={isComingSoon}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px", borderRadius: 12,
                  border: "1px solid",
                  borderColor: w.detected
                    ? "rgba(110,63,243,0.35)"
                    : "rgba(255,255,255,0.07)",
                  background: w.detected
                    ? "rgba(110,63,243,0.07)"
                    : "rgba(255,255,255,0.03)",
                  cursor: isComingSoon ? "default" : "pointer",
                  opacity: isComingSoon ? 0.4 : 1,
                  transition: "all 0.12s",
                  width: "100%",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isComingSoon)
                    e.currentTarget.style.borderColor = "rgba(110,63,243,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = w.detected
                    ? "rgba(110,63,243,0.35)"
                    : "rgba(255,255,255,0.07)";
                }}
              >
                {/* Icon */}
                <div style={{ flexShrink: 0 }}>
                  {isLoading ? (
                    <div style={{ width: 32, height: 32, borderRadius: 8,
                      border: "2px solid #6E3FF3",
                      borderTopColor: "transparent",
                      animation: "spin 0.6s linear infinite",
                    }} />
                  ) : w.icon}
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600,
                    color: "#fff" }}>{w.name}</div>
                  {notInstalled && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)",
                      marginTop: 1 }}>Not installed · click to install</div>
                  )}
                </div>

                {/* Badge */}
                {w.detected && !isLoading && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 8px",
                    borderRadius: 20, letterSpacing: "0.04em",
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    color: "#22C55E",
                  }}>DETECTED</span>
                )}
                {isComingSoon && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    Soon
                  </span>
                )}
                {!w.detected && !isComingSoon && !isLoading && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {err && (
          <p style={{ fontSize: 12, color: "#F87171", marginTop: 12,
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)" }}>
            {err}
          </p>
        )}

        {/* Footer */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)",
          textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          By connecting you agree to interact with contracts on Somnia Testnet.
          <br/>Not financial advice.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}