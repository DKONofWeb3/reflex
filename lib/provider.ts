// lib/provider.ts
import { ethers } from "ethers";
import { SOMNIA_TESTNET } from "@/lib/config";

// HTTP only — WebSocket on Somnia testnet is unreliable, polling is sufficient
export function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(SOMNIA_TESTNET.rpcUrl, {
    chainId: SOMNIA_TESTNET.id,
    name: "somnia-testnet",
  });
}

export async function getSigner(): Promise<ethers.Signer> {
  if (typeof window === "undefined" || !window.ethereum)
    throw new Error("No wallet detected. Please install MetaMask.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export function formatPrice(raw: bigint, decimals: number): string {
  return (Number(raw) / 100).toFixed(decimals);
}
export function formatSTT(wei: bigint): string {
  return ethers.formatEther(wei);
}
export function parseSTT(amount: string): bigint {
  return ethers.parseEther(amount);
}
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
export function getExplorerTxUrl(txHash: string): string {
  return `${SOMNIA_TESTNET.blockExplorer}/tx/${txHash}`;
}