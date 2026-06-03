import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/validate";
import { csrfCheck } from "@/lib/csrf";
import { CONTRACTS, RPC_URL } from "@/lib/constants";

const AGENT_VAULT_ABI = [
  {
    name: "getUserIpIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getUserAgents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getIpInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "ipId", type: "address" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "vaultId", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "agentId", type: "uint256" },
      { name: "ipId", type: "address" },
      { name: "vaultId", type: "uint256" },
      { name: "owner", type: "address" },
      { name: "memoryRoot", type: "bytes32" },
      { name: "createdAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
  },
] as const;

// POST /api/contract
// Read-only access to the AgentVault registry.
// Actions:
//   - getUserIpIds(address)  → address[] of IP Asset ids owned by user
//   - getUserAgents(address) → uint256[] of agentIds created by user
//   - getIpInfo(address)     → { owner, agentId, vaultId, exists }
//   - getAgent(uint256)      → full agent struct
export async function POST(request: NextRequest) {
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  try {
    const { action, ...params } = await request.json();

    const { createPublicClient, http } = await import("viem");
    const publicClient = createPublicClient({ transport: http(RPC_URL) });
    const addr = CONTRACTS.AGENT_VAULT as `0x${string}`;

    switch (action) {
      case "getUserIpIds": {
        const { userAddress } = params;
        if (!isValidAddress(userAddress)) {
          return NextResponse.json({ error: "Invalid userAddress" }, { status: 400 });
        }
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "getUserIpIds",
          args: [userAddress as `0x${string}`],
        });
        return NextResponse.json({ success: true, ipIds: result });
      }

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

      case "getIpInfo": {
        const { ipId } = params;
        if (!isValidAddress(ipId)) {
          return NextResponse.json({ error: "Invalid ipId" }, { status: 400 });
        }
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "getIpInfo",
          args: [ipId as `0x${string}`],
        });
        return NextResponse.json({ success: true, info: result });
      }

      case "getAgent": {
        const { agentId } = params;
        const result = await publicClient.readContract({
          address: addr,
          abi: AGENT_VAULT_ABI,
          functionName: "getAgent",
          args: [BigInt(agentId)],
        });
        return NextResponse.json({ success: true, agent: result });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Contract error:", error);
    return NextResponse.json(
      { error: "Contract interaction failed" },
      { status: 500 }
    );
  }
}
