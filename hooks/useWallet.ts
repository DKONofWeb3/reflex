// hooks/useWallet.ts
// React hook that handles everything wallet-related
// Exposes:
//   wallet          → current state (address, chainId, balance, isConnected)
//   connect()       → prompts MetaMask to connect
//   disconnect()    → clears wallet state locally
//   switchToSomnia() → switches MetaMask to Somnia testnet (adds it if not present)
//   isConnecting    → loading state
//   error           → error message string if something went wrong
// Automatically re-runs when the user switches accounts or chains in MetaMask

"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { SOMNIA_TESTNET } from "@/lib/config";
import { WalletState } from "@/types";

const INITIAL_STATE: WalletState = {
  address: null,
  isConnected: false,
  chainId: null,
  balance: null,
  isCorrectNetwork: false,
};

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_STATE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = () => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  };

  // Read current wallet state from MetaMask and update local state
  const updateWalletState = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        setWallet(INITIAL_STATE);
        return;
      }

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const address = accounts[0].address;
      const balance = await provider.getBalance(address);
      const isCorrectNetwork = chainId === SOMNIA_TESTNET.id;

      setWallet({ address, isConnected: true, chainId, balance, isCorrectNetwork });
    } catch (err) {
      console.error("Failed to update wallet state:", err);
    }
  }, []);

  // Trigger MetaMask connection popup
  const connect = useCallback(async () => {
    console.log("🔵 connect() called — window.ethereum:", typeof window !== "undefined" ? !!window.ethereum : "SSR");
    const provider = getProvider();
    if (!provider) {
      alert("No wallet detected — window.ethereum is undefined. Is MetaMask installed and enabled?");
      setError("MetaMask not found. Please install it.");
      return;
    }
    console.log("🟢 provider found, requesting accounts...");

    setIsConnecting(true);
    setError(null);

    try {
      await provider.send("eth_requestAccounts", []);
      await updateWalletState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection rejected";
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [updateWalletState]);

  const disconnect = useCallback(() => {
    setWallet(INITIAL_STATE);
  }, []);

  // Switch MetaMask to Somnia testnet — adds the chain if the user doesn't have it yet
  const switchToSomnia = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      await provider.send("wallet_switchEthereumChain", [
        { chainId: `0x${SOMNIA_TESTNET.id.toString(16)}` },
      ]);
    } catch (err: unknown) {
      // Error code 4902 = chain not added yet
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: number }).code === 4902
      ) {
        try {
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: `0x${SOMNIA_TESTNET.id.toString(16)}`,
              chainName: SOMNIA_TESTNET.name,
              nativeCurrency: SOMNIA_TESTNET.nativeCurrency,
              rpcUrls: [SOMNIA_TESTNET.rpcUrl],
              blockExplorerUrls: [SOMNIA_TESTNET.blockExplorer],
            },
          ]);
        } catch (addErr) {
          console.error("Failed to add Somnia network:", addErr);
        }
      }
    }

    await updateWalletState();
  }, [updateWalletState]);

  // Auto-detect existing connection on page load + listen for MetaMask changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    updateWalletState();

    window.ethereum.on("accountsChanged", updateWalletState);
    window.ethereum.on("chainChanged", updateWalletState);

    return () => {
      window.ethereum?.removeListener("accountsChanged", updateWalletState);
      window.ethereum?.removeListener("chainChanged", updateWalletState);
    };
  }, [updateWalletState]);

  return { wallet, isConnecting, error, connect, disconnect, switchToSomnia };
}