"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isBitget?: boolean;
  isTokenPocket?: boolean;
  isTrust?: boolean;
  providers?: Eip1193Provider[];
}

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
      // Pick the right provider when multiple wallets are installed.
      // EIP-5749: window.ethereum.providers is an array of all injected providers.
      // Falls back to window.ethereum directly if the array isn't present.
      const eth = window.ethereum;
      const providers: Eip1193Provider[] | undefined = eth?.providers ?? (eth ? [eth] : undefined);
      const provider = providers?.find((p) => p.isBitget)
        ?? providers?.find((p) => p.isMetaMask)
        ?? providers?.[0];

      if (provider) {
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];

        // Check chain
        const chainId = await provider.request({ method: "eth_chainId" });
        const decimalChainId = parseInt(String(chainId), 16);
        if (decimalChainId !== 1315) {
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x523" }],
            });
            // Verify the switch actually took effect — wallets may report success
            // without flipping the chain if they only added it as a suggestion.
            const after = await provider.request({ method: "eth_chainId" });
            if (parseInt(String(after), 16) !== 1315) {
              console.warn("Chain switch did not take effect (still on", after, ")");
            }
          } catch (switchError: unknown) {
            // 4001 = user rejected; 4902 = chain not added to wallet.
            const code = (switchError as { code?: number })?.code;
            if (code === 4001) {
              console.warn("User rejected chain switch to Aeneid testnet");
            } else if (code === 4902) {
              console.warn("Aeneid testnet not added to wallet");
            } else {
              console.warn("Could not switch to Aeneid testnet (chain 1315):", switchError);
            }
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
    ethereum?: Eip1193Provider;
  }
}
