// app/layout.tsx
// Root layout — wraps every page in the app
// Sets the HTML <head> metadata (title, description for SEO/sharing)
// Imports global CSS (fonts, colors, animations)
// Wraps everything in <Providers> which gives every page access to:
//   wallet state, live prices, active markets, activity feed, smart bets

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "REFLEX — Fully Reactive Prediction Markets",
  description:
    "Autonomous prediction markets on Somnia testnet. The chain reacts. The market moves.",
  keywords: ["prediction market", "somnia", "web3", "defi", "reactivity"],
  openGraph: {
    title: "REFLEX",
    description: "The chain reacts. The market moves.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-grid min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}