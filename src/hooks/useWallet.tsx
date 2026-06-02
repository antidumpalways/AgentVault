"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if wallet was previously connected
    const savedAddress = localStorage.getItem("wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  const connect = async () => {
    if (typeof window === "undefined") return;

    setIsConnecting(true);
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        // Check chain
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        const decimalChainId = parseInt(chainId, 16);
        if (decimalChainId !== 1315) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x523" }],
            });
          } catch {
            console.warn("Could not switch to Aeneid testnet (chain 1315)");
          }
        }

        if (accounts.length > 0) {
          setAddress(accounts[0]);
          localStorage.setItem("wallet_address", accounts[0]);
        }
      } else {
        // Demo mode — deployer address
        const demoAddress = "0x936CDB5dD5DCE69a2DeC06299C986E7798ab274B";
        setAddress(demoAddress);
        localStorage.setItem("wallet_address", demoAddress);
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem("wallet_address");
  };

  return (
    <WalletContext.Provider value={{ address, isConnected: !!address, isConnecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

// Add window.ethereum type
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}
