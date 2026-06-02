"use client";

import { useCallback, useState } from "react";
import { createWalletClient, createPublicClient, http, encodeFunctionData, custom, defineChain } from "viem";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://aeneid.storyrpc.io";

const aeneid = defineChain({
  id: 1315,
  name: "Aeneid",
  network: "aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const LICENSING_MODULE = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f";
const PIL_TEMPLATE = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316";
const LICENSE_TOKEN = "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC";
const LICENSE_TERMS_ID = BigInt(2054);

const LICENSING_MODULE_ABI = [
  {
    inputs: [
      { type: "address", name: "licensorIpId" },
      { type: "address", name: "licenseTemplate" },
      { type: "uint256", name: "licenseTermsId" },
      { type: "uint256", name: "amount" },
      { type: "address", name: "receiver" },
      { type: "bytes", name: "royaltyContext" },
      { type: "uint256", name: "maxMintingFee" },
      { type: "uint32", name: "maxRevenueShare" },
    ],
    name: "mintLicenseTokens",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const LICENSE_TOKEN_ABI = [
  {
    inputs: [{ type: "address", name: "owner" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { type: "address", name: "owner" },
      { type: "uint256", name: "index" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface GrantLicenseParams {
  ipId: `0x${string}`;
  granteeAddress: `0x${string}`;
}

export interface GrantLicenseResult {
  txHash: `0x${string}`;
  licenseTokenId: string;
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isBitget?: boolean;
  isTokenPocket?: boolean;
  isTrust?: boolean;
  providers?: Eip1193Provider[];
}

function pickProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (!eth) return null;
  const providers = (eth.providers ?? [eth]) as Eip1193Provider[];
  return (
    providers.find((p) => p.isBitget) ??
    providers.find((p) => p.isMetaMask) ??
    providers[0] ??
    null
  );
}

export function useGrantLicense() {
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantLicense = useCallback(
    async ({ ipId, granteeAddress }: GrantLicenseParams): Promise<GrantLicenseResult> => {
      setError(null);
      setIsGranting(true);
      try {
        const provider = pickProvider();
        if (!provider) throw new Error("No wallet detected. Connect a wallet first.");

        const transport = custom(provider as unknown as Parameters<typeof custom>[0]);
        const walletClient = createWalletClient({ transport, chain: aeneid });
        const publicClient = createPublicClient({ transport: http(RPC_URL), chain: aeneid });

        const [account] = await walletClient.requestAddresses();
        if (!account) throw new Error("Wallet returned no account");

        const data = encodeFunctionData({
          abi: LICENSING_MODULE_ABI,
          functionName: "mintLicenseTokens",
          args: [
            ipId,
            PIL_TEMPLATE as `0x${string}`,
            LICENSE_TERMS_ID,
            BigInt(1),
            granteeAddress,
            "0x",
            BigInt(0),
            0,
          ],
        });

        const txHash = await walletClient.sendTransaction({
          account,
          chain: aeneid,
          to: LICENSING_MODULE as `0x${string}`,
          data,
          value: BigInt(0),
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "reverted") {
          throw new Error(`Transaction reverted: ${txHash}`);
        }

        // Parse the new licenseTokenId from the LicenseToken Transfer event in the same block.
        // mintLicenseTokens emits a Transfer(from=0x0, to=grantee, tokenId=newId) on LicenseToken.
        let licenseTokenId = "0";
        try {
          const mintLogs = await publicClient.getLogs({
            address: LICENSE_TOKEN as `0x${string}`,
            event: {
              type: "event",
              name: "Transfer",
              inputs: [
                { name: "from", type: "address", indexed: true },
                { name: "to", type: "address", indexed: true },
                { name: "tokenId", type: "uint256", indexed: true },
              ],
            },
            args: {
              from: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              to: granteeAddress,
            },
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
          });
          if (mintLogs.length > 0) {
            const lastLog = mintLogs[mintLogs.length - 1];
            licenseTokenId = (lastLog.topics[3] ? BigInt(lastLog.topics[3]) : BigInt(0)).toString();
          } else {
            // Fallback: read balanceOf(grantee) and use the latest token
            const balance = await publicClient.readContract({
              address: LICENSE_TOKEN as `0x${string}`,
              abi: LICENSE_TOKEN_ABI,
              functionName: "balanceOf",
              args: [granteeAddress],
            });
            if (balance > BigInt(0)) {
              const lastIdx = balance - BigInt(1);
              const tok = await publicClient.readContract({
                address: LICENSE_TOKEN as `0x${string}`,
                abi: LICENSE_TOKEN_ABI,
                functionName: "tokenOfOwnerByIndex",
                args: [granteeAddress, lastIdx],
              });
              licenseTokenId = tok.toString();
            }
          }
        } catch (parseErr) {
          console.warn("Could not parse license token id from event:", parseErr);
        }

        return { txHash, licenseTokenId };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to grant license";
        setError(msg);
        throw e;
      } finally {
        setIsGranting(false);
      }
    },
    []
  );

  return { grantLicense, isGranting, error };
}

export async function getLicensesOwnedBy(
  owner: `0x${string}`
): Promise<string[]> {
  const publicClient = createPublicClient({ transport: http(RPC_URL), chain: aeneid });
  const balance = (await publicClient.readContract({
    address: LICENSE_TOKEN as `0x${string}`,
    abi: LICENSE_TOKEN_ABI,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint;
  if (balance === BigInt(0)) return [];
  const ids: string[] = [];
  for (let i = BigInt(0); i < balance; i++) {
    const tok = (await publicClient.readContract({
      address: LICENSE_TOKEN as `0x${string}`,
      abi: LICENSE_TOKEN_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [owner, i],
    })) as bigint;
    ids.push(tok.toString());
  }
  return ids;
}
