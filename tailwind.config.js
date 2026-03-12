// tailwind.config.js
// Configures Tailwind CSS for REFLEX
// Defines custom colors, fonts, and animations that match the dark trading-terminal aesthetic
// Usage examples: bg-bg-primary, text-accent-cyan, animate-pulse-glow

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Somnia brand-aligned palette
        // Primary: deep violet/purple — Somnia's signature color
        // Accent: magenta/pink — Somnia's highlight color
        // Backgrounds: near-black with subtle purple tint
        bg: {
          primary: "#08060F",   // near-black with purple tint
          secondary: "#0E0B1A", // slightly lighter
          card: "#130F22",      // market card — purple-tinted dark
          border: "#261D40",    // purple-tinted border
        },
        accent: {
          purple: "#8B5CF6",    // Somnia primary — violet
          magenta: "#D946EF",   // Somnia highlight — magenta/pink
          green: "#22C55E",     // YES / profit / resolved
          red: "#EF4444",       // NO / loss
          yellow: "#EAB308",    // BTC highlight
        },
        text: {
          primary: "#F1EEF9",   // warm white with purple tint
          secondary: "#7C6FA0", // muted purple-grey
          muted: "#3D3060",     // deep muted purple
        },
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],          // bold, modern — matches Somnia's headings
        body: ["'Inter'", "sans-serif"],             // clean, readable
        mono: ["'JetBrains Mono'", "monospace"],     // addresses, prices
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "resolve-burst": "resolve-burst 0.6s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(139, 92, 246, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.7)" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "resolve-burst": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};