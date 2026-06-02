import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/validate";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const AGENT_VAULT_ADDRESS = "0x8c13bb7d29feb35ed4adb6f8ab031222b1711641";

const AGENT_VAULT_ABI = [
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
    name: "getAgentMemoryCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    const { createPublicClient, http } = await import("viem");

    const publicClient = createPublicClient({ transport: http(RPC_URL) });
    const addr = AGENT_VAULT_ADDRESS as `0x${string}`;

    switch (action) {
      case "getUserAgents": {
        const { userAddress } = params;
        if (!isValidAddress(userAddress)) {
          return NextResponse.json({ error: "Invalid userAddress" }, { status: 400 });
        }
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
        if (!isValidAddress(userAddress)) {
          return NextResponse.json({ error: "Invalid userAddress" }, { status: 400 });
        }
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "checkAccess",
          args: [BigInt(agentId), userAddress as `0x${string}`],
        });
        return NextResponse.json({ success: true, hasAccess: result });
      }

      case "getAgentMemoryCount": {
        const { agentId } = params;
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "getAgentMemoryCount",
          args: [BigInt(agentId)],
        }) as bigint;
        return NextResponse.json({ success: true, count: result.toString() });
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
