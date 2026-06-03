"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { showToast } from "@/components/Toast";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isBitget?: boolean;
  isBitKeep?: boolean;
  isPhantom?: boolean;
  providers?: Eip1193Provider[];
}

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (walletType?: 'bitget' | 'metamask' | 'auto') => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

function findProvider(type: 'bitget' | 'metamask' | 'auto' = 'auto'): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  
  if (type === 'bitget') {
    const bitget = (window as unknown as { bitget?: Eip1193Provider }).bitget;
    if (bitget) return bitget;
    const bitkeep = (window as unknown as { bitkeep?: { ethereum?: Eip1193Provider } }).bitkeep;
    if (bitkeep?.ethereum) return bitkeep.ethereum;
    const eth = window.ethereum;
    if (eth) {
      const all = (eth.providers && eth.providers.length > 0) ? eth.providers : [eth];
      const bitgetProvider = all.find((p) => p.isBitget || p.isBitKeep);
      if (bitgetProvider) return bitgetProvider;
    }
    return undefined;
  }
  
  if (type === 'metamask') {
    const eth = window.ethereum;
    if (!eth) return undefined;
    const all = (eth.providers && eth.providers.length > 0) ? eth.providers : [eth];
    const metamaskProvider = all.find((p) => p.isMetaMask && !p.isPhantom);
    if (metamaskProvider) return metamaskProvider;
    if (eth.isMetaMask && !eth.isPhantom) return eth;
    return undefined;
  }
  
  const bitget = (window as unknown as { bitget?: Eip1193Provider }).bitget;
  if (bitget) return bitget;
  const bitkeep = (window as unknown as { bitkeep?: { ethereum?: Eip1193Provider } }).bitkeep;
  if (bitkeep?.ethereum) return bitkeep.ethereum;
  const eth = window.ethereum;
  if (!eth) return undefined;
  const all = (eth.providers && eth.providers.length > 0) ? eth.providers : [eth];
  const nonPhantom = all.filter((p) => !p.isPhantom);
  if (nonPhantom.length === 0) return undefined;
  return nonPhantom.find((p) => p.isBitget || p.isBitKeep)
    ?? nonPhantom.find((p) => p.isMetaMask)
    ?? nonPhantom[0];
}

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore wallet address from localStorage on mount. The address alone is safe
  // to cache — no private keys, no signatures. When the user actually needs to
  // sign a tx, the wallet popup will re-prompt for permission. This fixes
  // "I connected, refreshed, and now it says NOT CONNECTED" without re-triggering
  // any wallet popup.
  useEffect(() => {
    const saved = localStorage.getItem("wallet_address");
    if (saved) setAddress(saved);
  }, []);

  const connect = async (walletType: 'bitget' | 'metamask' | 'auto' = 'auto') => {
    if (typeof window === "undefined") return;
    setIsConnecting(true);
    setError(null);
    try {
      const provider = findProvider(walletType);
      if (!provider) {
        const walletName = walletType === 'bitget' ? 'Bitget Wallet' : walletType === 'metamask' ? 'MetaMask' : 'wallet';
        const msg = `${walletName} not detected. Please install it and try again.`;
        setError(msg);
        showToast(msg, undefined, "error");
        return;
      }
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = await provider.request({ method: "eth_chainId" });
      const decimalChainId = parseInt(String(chainId), 16);
      if (decimalChainId !== 1315) {
        try {
          await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x523" }] });
          const after = await provider.request({ method: "eth_chainId" });
          if (parseInt(String(after), 16) !== 1315) {
            console.warn("Chain switch did not take effect");
          }
        } catch (switchError: unknown) {
          const code = (switchError as { code?: number })?.code;
          if (code === 4001) console.warn("User rejected chain switch");
          else if (code === 4902) console.warn("Aeneid testnet not added to wallet");
          else console.warn("Could not switch chain:", switchError);
        }
      }
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        localStorage.setItem("wallet_address", accounts[0]);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Connection failed";
      setError(msg);
      showToast(msg, undefined, "error");
      console.error("Connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setError(null);
    localStorage.removeItem("wallet_address");
  };

  return (
    <WalletContext.Provider value={{ address, isConnected: !!address, isConnecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
