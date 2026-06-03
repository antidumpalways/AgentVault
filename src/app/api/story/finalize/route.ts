import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidAddress, isPositiveIntString } from "@/lib/validate";
import { safeError } from "@/lib/apiError";
import { csrfCheck } from "@/lib/csrf";
import { CONTRACTS, RPC_URL, CHAIN_ID } from "@/lib/constants";

const REGISTER_IP_ABI = [
  {
    name: "registerIpForOwner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "ipId", type: "address" },
      { name: "vaultId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// POST /api/story/finalize
// Called by the client after the user has signed all 5 spawn txs
// (mint, register, attachLicense, mintLicense, createAgentAndStoreMemory).
// Server signs `AgentVault.registerIpForOwner(owner, ipId, vaultId)` so
// external clients can discover the agent via `getUserIpIds(owner)`.
//
// Body: { walletAddress, ipId, vaultUuid, txHashes: { mint, register, attachLicense, mintLicense, createAgentAndStoreMemory } }
//
// txHashes are not strictly required (we don't verify on-chain here) but
// the client passes them for observability.

let finalizeLock: Promise<void> = Promise.resolve();

export async function POST(request: NextRequest) {
  const releaseLock = await new Promise<() => void>((resolve) => {
    const prev = finalizeLock;
    let release!: () => void;
    finalizeLock = new Promise<void>((r) => { release = r; });
    prev.then(() => resolve(release));
  });

  try {
    const csrf = csrfCheck(request);
    if (csrf) return csrf;

    const { walletAddress, ipId, vaultUuid } = await request.json();
    if (!walletAddress || !isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }
    if (!ipId || !isValidAddress(ipId)) {
      return NextResponse.json({ error: "Invalid ipId" }, { status: 400 });
    }
    if (!isPositiveIntString(String(vaultUuid))) {
      return NextResponse.json({ error: "Invalid vaultUuid" }, { status: 400 });
    }

    const rl = rateLimit(`story-finalize:${getClientIp(request)}`, 30, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetMs: rl.resetMs },
        { status: 429 }
      );
    }

    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const { createPublicClient, createWalletClient, http, encodeFunctionData } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const chain = {
      id: CHAIN_ID, name: "Aeneid" as const, network: "aeneid" as const,
      nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    };
    const publicClient = createPublicClient({ transport: http(RPC_URL), chain });
    const walletClient = createWalletClient({ account, transport: http(RPC_URL), chain });

    const data = encodeFunctionData({
      abi: REGISTER_IP_ABI,
      functionName: "registerIpForOwner",
      args: [
        walletAddress as `0x${string}`,
        ipId as `0x${string}`,
        BigInt(vaultUuid),
      ],
    });

    // If the IP was already registered (duplicate), skip. We check via
    // ipInfo mapping to avoid the revert costing gas.
    let alreadyRegistered = false;
    try {
      const exists = await publicClient.readContract({
        address: CONTRACTS.AGENT_VAULT as `0x${string}`,
        abi: [{
          name: "ipInfo",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "ipId", type: "address" }],
          outputs: [
            { name: "owner", type: "address" },
            { name: "agentId", type: "uint256" },
            { name: "vaultId", type: "uint256" },
            { name: "exists", type: "bool" },
          ],
        }],
        functionName: "ipInfo",
        args: [ipId as `0x${string}`],
      }) as readonly [string, bigint, bigint, boolean];
      alreadyRegistered = exists[3];
    } catch {
      // readContract can fail on a freshly-deployed contract that has no
      // storage yet — assume not registered.
      alreadyRegistered = false;
    }

    if (alreadyRegistered) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "IP already registered on AgentVault",
      });
    }

    const nonce = await publicClient.getTransactionCount({ address: account.address });
    const gasPrice = await publicClient.getGasPrice();
    const signed = await walletClient.signTransaction({
      account,
      to: CONTRACTS.AGENT_VAULT as `0x${string}`,
      data,
      value: BigInt(0),
      gas: BigInt(200000),
      gasPrice,
      nonce,
      chainId: CHAIN_ID,
    });
    const txHash = await publicClient.sendRawTransaction({ serializedTransaction: signed });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    return safeError("Story finalize", error);
  } finally {
    releaseLock();
  }
}
