# REFLEX ⚡
### Fully Reactive Prediction Markets on Somnia

> **The chain reacts. The market moves.**

Autonomous prediction markets on Somnia testnet powered entirely by the Reactivity SDK.
No off-chain bots. No cron jobs. No admin triggers. The blockchain does everything.

---

## How it works

```
PriceFeed.sol (×3)         emits PriceUpdated(asset, price)
       ↓
ReactivityHook.sol         SomniaEventHandler — listens and triggers
       ↓
PredictionMarket.sol       createMarket / placeBet / resolveMarket / claimPayout
       ↓
Next.js Frontend           real-time dashboard via Reactivity SDK + ethers.js
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Open .env.local and fill in your PRIVATE_KEY

# 3. Run the app
npm run dev
# Open http://localhost:3000

# 4. Compile Solidity contracts
npm run compile

# 5. Deploy to Somnia testnet
npm run deploy
# After deploying, copy the contract addresses into .env.local
```

---

## Project Structure

```
reflex/
├── app/
│   ├── layout.tsx              root layout + metadata
│   ├── globals.css             fonts, colors, animations
│   ├── page.tsx                redirects to /dashboard
│   ├── dashboard/page.tsx      main live dashboard (Phase 4)
│   └── history/page.tsx        past markets + user history (Phase 4)
│
├── components/
│   ├── market/                 MarketCard, CountdownTimer, PoolBar
│   ├── betting/                BetForm, SmartBetCreator
│   ├── feed/                   ActivityFeed, FeedItem
│   └── ui/                     Button, Badge, Navbar (shared primitives)
│
├── contracts/
│   ├── PriceFeed.sol           stores price, emits PriceUpdated (deployed ×3)
│   ├── PredictionMarket.sol    core market logic
│   └── ReactivityHook.sol      SomniaEventHandler — the autonomous trigger layer
│
├── hooks/
│   ├── useWallet.ts            MetaMask connect, switch network
│   ├── useMarkets.ts           fetch and watch active markets (Phase 3)
│   ├── usePriceFeed.ts         live price updates (Phase 3)
│   └── useActivityFeed.ts      real-time event stream (Phase 3)
│
├── lib/
│   ├── config.ts               chain config, asset params, contract addresses
│   ├── provider.ts             ethers.js providers + format helpers
│   └── utils.ts                cn() class utility
│
├── scripts/
│   └── deploy.ts               Hardhat deploy script (Phase 2)
│
└── types/
    └── index.ts                all shared TypeScript interfaces
```

---

## Hackathon

| | |
|---|---|
| **Event** | Somnia Reactivity Mini Hackathon — DoraHacks |
| **Deadline** | March 20, 2026 |
| **Prize** | $300 SOMI per winner |
| **Key angle** | Reactivity controls the full market lifecycle across 3 assets with zero human intervention |

## Docs
- [Somnia Reactivity SDK](https://docs.somnia.network/developer/reactivity)
- [Somnia Testnet Docs](https://docs.somnia.network)