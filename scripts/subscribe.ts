// scripts/subscribe.ts
// ─────────────────────────────────────────────────────────────────────────────
// Run this AFTER contracts are already deployed.
// Creates the 3 Reactivity subscriptions (one per PriceFeed) so validators
// will call ReactivityHook._onEvent() whenever a price updates.
//
// Usage:
//   npm run subscribe
//
// Requirements:
//   - All 5 contract addresses filled in .env.local
//   - PRIVATE_KEY set in .env.local
//   - Wallet has STT for gas
// ─────────────────────────────────────────────────────────────────────────────

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  console.log("\n📡 Setting up Reactivity subscriptions...\n");

  // ── Validate env ──────────────────────────────────────────────────────────
  const required = [
    "PRIVATE_KEY",
    "NEXT_PUBLIC_PRICE_FEED_ETH",
    "NEXT_PUBLIC_PRICE_FEED_BTC",
    "NEXT_PUBLIC_PRICE_FEED_SOMI",
    "NEXT_PUBLIC_REACTIVITY_HOOK",
  ];

  for (const key of required) {
    if (!process.env[key] || process.env[key] === "") {
      console.error(`❌ Missing env var: ${key}`);
      console.error("   Make sure all contract addresses are in .env.local after deployment\n");
      process.exit(1);
    }
  }

  // ── Import SDK + viem ─────────────────────────────────────────────────────
  const { SDK } = require("@somnia-chain/reactivity");
  const { createPublicClient, createWalletClient, http, defineChain, parseGwei } = require("viem");
  const { privateKeyToAccount } = require("viem/accounts");
  const { ethers } = require("ethers");

  const somniaTestnet = defineChain({
    id: 50312,
    name: "Somnia Testnet",
    nativeCurrency: { decimals: 18, name: "STT", symbol: "STT" },
    rpcUrls: {
      default: { http: [process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network"] },
    },
  });

  // Normalize private key — strip and re-add 0x prefix cleanly
  const rawKey = process.env.PRIVATE_KEY || "";
  const normalizedKey = ("0x" + rawKey.replace(/^0x/i, "")) as `0x${string}`;
  const account = privateKeyToAccount(normalizedKey);

  console.log("   Wallet:", account.address);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(),
  });

  const sdk = new SDK({ public: publicClient, wallet: walletClient });

  // PriceUpdated(string indexed asset, uint256 newPrice, uint256 timestamp)
  const eventSig = ethers.id("PriceUpdated(string,uint256,uint256)") as `0x${string}`;

  const hookAddress = process.env.NEXT_PUBLIC_REACTIVITY_HOOK as `0x${string}`;

  const feeds = [
    { name: "ETH",  address: process.env.NEXT_PUBLIC_PRICE_FEED_ETH  as `0x${string}` },
    { name: "BTC",  address: process.env.NEXT_PUBLIC_PRICE_FEED_BTC  as `0x${string}` },
    { name: "SOMI", address: process.env.NEXT_PUBLIC_PRICE_FEED_SOMI as `0x${string}` },
  ];

  console.log("   Hook:  ", hookAddress);
  console.log("   Feeds: ", feeds.map(f => `${f.name}=${f.address}`).join(", "));
  console.log();

  for (const feed of feeds) {
    console.log(`   Creating subscription for ${feed.name} price feed...`);

    try {
      await sdk.createSoliditySubscription({
        handlerContractAddress: hookAddress,
        emitter:                feed.address,
        eventTopics:            [eventSig],

        // "Complex" gas config — _onEvent makes multiple cross-contract calls
        // Source: https://docs.somnia.network/developer/reactivity/gas-configuration
        priorityFeePerGas: parseGwei("10"),
        maxFeePerGas:      parseGwei("20"),
        gasLimit:          10_000_000n,

        isGuaranteed: true,
        isCoalesced:  false,
      });

      console.log(`   ✓ ${feed.name} subscription created`);
    } catch (err: any) {
      console.error(`   ✗ ${feed.name} failed:`, err?.message || err);
    }
  }

  console.log("\n✅ Subscriptions done! Reactivity is now active.\n");
  console.log("Test it by calling setPrice() on a PriceFeed contract and");
  console.log("watching the explorer for validator calls to ReactivityHook.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});