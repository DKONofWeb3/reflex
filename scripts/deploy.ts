// scripts/deploy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hardhat deploy script for REFLEX Phase 2
//
// Deploys in this order (order matters — each contract needs the previous address):
//   1. PriceFeed (ETH)  — initial price $2000.00 = 200000
//   2. PriceFeed (BTC)  — initial price $94000.00 = 9400000
//   3. PriceFeed (SOMI) — initial price $0.45 = 45
//   4. PredictionMarket
//   5. ReactivityHook   — receives PredictionMarket address
//   6. Wire them up:
//        - PredictionMarket.setHook(ReactivityHook)
//        - ReactivityHook.setFeeds(ethFeed, btcFeed, somiFeed)
//   7. Create Reactivity subscriptions for all 3 price feeds
//
// Run with:
//   npm run deploy              → Somnia testnet
//   npm run deploy:local        → local hardhat node
//
// After running: copy the printed addresses into your .env.local file
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "hardhat";
import { parseGwei } from "viem";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env — try .env.local first, then .env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// We import the Reactivity SDK to create on-chain subscriptions after deploy.
// The SDK needs a viem public + wallet client to talk to the chain.
// Install: npm i @somnia-chain/reactivity viem
let SDK: any;
try {
  SDK = require("@somnia-chain/reactivity").SDK;
} catch {
  console.warn("⚠️  @somnia-chain/reactivity not found — skipping subscription setup");
  SDK = null;
}

async function main() {
  // ── Guard: make sure private key is loaded ────────────────────────────────
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === "0x_your_private_key_here") {
    console.error("\n❌ ERROR: PRIVATE_KEY is not set in .env.local");
    console.error("   1. Open your .env.local file");
    console.error("   2. Set PRIVATE_KEY=0x<your actual key>");
    console.error("   3. Get it from MetaMask → Account Details → Export Private Key\n");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("\n🚀 Deploying REFLEX contracts");
  console.log("   Deployer:", deployer.address);
  console.log("   Network: ", (await ethers.provider.getNetwork()).name);
  console.log("─".repeat(55));

  // ── 1. Deploy PriceFeed × 3 ───────────────────────────────────────────────

  console.log("\n[1/5] Deploying PriceFeed contracts...");

  const PriceFeed = await ethers.getContractFactory("PriceFeed");

  // Prices are stored × 100 to support 2 decimal places
  const ethFeed = await PriceFeed.deploy("ETH", 200_000);   // $2000.00
  await ethFeed.waitForDeployment();
  console.log("   ✓ PriceFeed (ETH) :", await ethFeed.getAddress());

  const btcFeed = await PriceFeed.deploy("BTC", 9_400_000); // $94000.00
  await btcFeed.waitForDeployment();
  console.log("   ✓ PriceFeed (BTC) :", await btcFeed.getAddress());

  const somiFeed = await PriceFeed.deploy("SOMI", 45);       // $0.45
  await somiFeed.waitForDeployment();
  console.log("   ✓ PriceFeed (SOMI):", await somiFeed.getAddress());

  // ── 2. Deploy PredictionMarket ────────────────────────────────────────────

  console.log("\n[2/5] Deploying PredictionMarket...");

  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy();
  await predictionMarket.waitForDeployment();
  console.log("   ✓ PredictionMarket:", await predictionMarket.getAddress());

  // ── 3. Deploy ReactivityHook ──────────────────────────────────────────────

  console.log("\n[3/5] Deploying ReactivityHook...");

  const ReactivityHook = await ethers.getContractFactory("ReactivityHook");
  const reactivityHook = await ReactivityHook.deploy(await predictionMarket.getAddress());
  await reactivityHook.waitForDeployment();
  console.log("   ✓ ReactivityHook  :", await reactivityHook.getAddress());

  // ── 4. Wire contracts together ────────────────────────────────────────────

  console.log("\n[4/5] Wiring contracts...");

  // Tell PredictionMarket which address is allowed to call createMarket/resolveMarket
  const setHookTx = await predictionMarket.setHook(await reactivityHook.getAddress());
  await setHookTx.wait();
  console.log("   ✓ PredictionMarket.setHook() done");

  // Tell ReactivityHook which addresses are the 3 price feeds
  // (so it can map emitter address → asset string in _onEvent)
  const setFeedsTx = await reactivityHook.setFeeds(
    await ethFeed.getAddress(),
    await btcFeed.getAddress(),
    await somiFeed.getAddress()
  );
  await setFeedsTx.wait();
  console.log("   ✓ ReactivityHook.setFeeds() done");

  // ── 5. Create Reactivity Subscriptions ───────────────────────────────────

  console.log("\n[5/5] Creating Reactivity subscriptions...");

  if (SDK) {
    await setupReactivitySubscriptions({
      ethFeedAddress:      await ethFeed.getAddress(),
      btcFeedAddress:      await btcFeed.getAddress(),
      somiFeedAddress:     await somiFeed.getAddress(),
      hookAddress:         await reactivityHook.getAddress(),
    });
  } else {
    console.log("   ⚠️  Skipped (SDK not available)");
    console.log("   Run setupSubscriptions.ts separately after installing @somnia-chain/reactivity");
  }

  // ── Print summary FIRST (before subscriptions, so addresses are never lost) ──

  const deployedAddresses = {
    ethFeed:          await ethFeed.getAddress(),
    btcFeed:          await btcFeed.getAddress(),
    somiFeed:         await somiFeed.getAddress(),
    predictionMarket: await predictionMarket.getAddress(),
    reactivityHook:   await reactivityHook.getAddress(),
  };

  console.log("\n" + "═".repeat(55));
  console.log("✅ CONTRACTS DEPLOYED — copy into .env.local:");
  console.log("═".repeat(55));
  console.log(`\nNEXT_PUBLIC_PRICE_FEED_ETH=${deployedAddresses.ethFeed}`);
  console.log(`NEXT_PUBLIC_PRICE_FEED_BTC=${deployedAddresses.btcFeed}`);
  console.log(`NEXT_PUBLIC_PRICE_FEED_SOMI=${deployedAddresses.somiFeed}`);
  console.log(`NEXT_PUBLIC_PREDICTION_MARKET=${deployedAddresses.predictionMarket}`);
  console.log(`NEXT_PUBLIC_REACTIVITY_HOOK=${deployedAddresses.reactivityHook}`);
  console.log("\n" + "═".repeat(55));

  // ── 5. Create Reactivity Subscriptions ───────────────────────────────────

  console.log("\n[5/5] Creating Reactivity subscriptions...");

  if (SDK) {
    await setupReactivitySubscriptions({
      ethFeedAddress:   deployedAddresses.ethFeed,
      btcFeedAddress:   deployedAddresses.btcFeed,
      somiFeedAddress:  deployedAddresses.somiFeed,
      hookAddress:      deployedAddresses.reactivityHook,
    });
  } else {
    console.log("   ⚠️  Skipped (SDK not available)");
  }

  console.log("\n✅ All done!\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Creates 3 Reactivity subscriptions — one per PriceFeed contract.
// Each subscription tells validators: "when PriceFeed[X] emits PriceUpdated,
// call ReactivityHook._onEvent()"
//
// Gas config follows Somnia docs for "Complex" handlers (multiple external calls):
//   priorityFeePerGas: 10 gwei
//   maxFeePerGas:      20 gwei
//   gasLimit:          10_000_000 (required because _onEvent makes external calls
//                      + storage ops need 1M gas reserve per Somnia docs)
// ─────────────────────────────────────────────────────────────────────────────
async function setupReactivitySubscriptions(addresses: {
  ethFeedAddress:  string;
  btcFeedAddress:  string;
  somiFeedAddress: string;
  hookAddress:     string;
}) {
  const { createPublicClient, createWalletClient, http, defineChain } = require("viem");
  const { privateKeyToAccount } = require("viem/accounts");

  const somniaTestnet = defineChain({
    id: 50312,
    name: "Somnia Testnet",
    nativeCurrency: { decimals: 18, name: "STT", symbol: "STT" },
    rpcUrls: { default: { http: [process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network"] } },
  });

  const rawKey = process.env.PRIVATE_KEY || "";
  // viem requires exactly: "0x" + 64 hex chars
  // Normalise: strip 0x if present, then re-add it cleanly
  const normalizedKey = ("0x" + rawKey.replace(/^0x/i, "")) as `0x${string}`;

  const account = privateKeyToAccount(normalizedKey);

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

  const feeds = [
    { name: "ETH",  address: addresses.ethFeedAddress  as `0x${string}` },
    { name: "BTC",  address: addresses.btcFeedAddress  as `0x${string}` },
    { name: "SOMI", address: addresses.somiFeedAddress as `0x${string}` },
  ];

  for (const feed of feeds) {
    console.log(`   Creating subscription for ${feed.name} price feed...`);

    try {
      await sdk.createSoliditySubscription({
        handlerContractAddress: addresses.hookAddress as `0x${string}`,
        emitter:                feed.address,
        eventTopics:            [eventSig],

        // ⚠️  CRITICAL: These gas values are correct per Somnia docs.
        // "Complex" handler config — our _onEvent makes multiple cross-contract calls.
        // Too low = silent failure. Validators skip without any error.
        priorityFeePerGas: parseGwei("10"),   // 10 gwei tip to validators
        maxFeePerGas:      parseGwei("20"),   // 20 gwei ceiling
        gasLimit:          10_000_000n,       // 10M gas — covers multiple external calls + storage

        isGuaranteed: true,   // ensure delivery even if some validators skip
        isCoalesced:  false,  // process each price update individually (don't batch)
      });

      console.log(`   ✓ Subscription created for ${feed.name}`);
    } catch (err) {
      console.error(`   ✗ Failed for ${feed.name}:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });