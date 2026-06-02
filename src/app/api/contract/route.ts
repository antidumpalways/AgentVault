import { NextRequest, NextResponse } from "next/server";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const AGENT_VAULT_ADDRESS = "0x8c13bb7d29feb35ed4adb6f8ab031222b1711641";

const AGENT_VAULT_ABI = [
  {
    name: "createAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "vaultUuid", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "storeMemory",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "contentHash", type: "bytes32" },
      { name: "metadata", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "checkAccess",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getUserAgents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "AgentCreated",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "vaultUuid", type: "uint256", indexed: false },
    ],
  },
];

const chain = {
  id: 1315, name: "Aeneid", network: "aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    const { createPublicClient, createWalletClient, http, decodeEventLog } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const publicClient = createPublicClient({ transport: http(RPC_URL) });

    const addr = AGENT_VAULT_ADDRESS as `0x${string}`;

    switch (action) {
      case "getUserAgents": {
        const { userAddress } = params;
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "getUserAgents",
          args: [userAddress as `0x${string}`],
        });
        return NextResponse.json({ success: true, agents: result });
      }

      case "checkAccess": {
        const { agentId, userAddress } = params;
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "checkAccess",
          args: [BigInt(agentId), userAddress as `0x${string}`],
        });
        return NextResponse.json({ success: true, hasAccess: result });
      }

      case "createAgent": {
        const { name, vaultUuid, privateKey } = params;
        if (!privateKey) {
          return NextResponse.json({ error: "Private key required" }, { status: 400 });
        }

        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const walletClient = createWalletClient({ account, transport: http(RPC_URL), chain });

        const { request } = await publicClient.simulateContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "createAgent",
          args: [name, BigInt(vaultUuid)],
          account: account.address,
        });

        const txHash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        let agentId = null;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: AGENT_VAULT_ABI,
              data: log.data,
              topics: log.topics.filter(Boolean) as [`0x${string}`, ...`0x${string}`[]],
            });
            if (decoded.eventName === "AgentCreated") {
              agentId = (decoded.args as any).agentId.toString();
              break;
            }
          } catch {}
        }

        return NextResponse.json({
          success: true,
          txHash,
          agentId,
          blockNumber: receipt.blockNumber.toString(),
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Contract error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Contract interaction failed" },
      { status: 500 }
    );
  }
}
