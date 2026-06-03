import { NextRequest, NextResponse } from "next/server";
import { csrfCheck } from "@/lib/csrf";
import { isValidAddress } from "@/lib/validate";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";

// Minimum balance to spawn an agent: covers 5 user-signed txs (mint NFT, register
// IP, attach license, mint license, createAgentAndStoreMemory). On Aeneid a typical
// tx costs ~0.005–0.01 IP, so 0.1 IP is enough for one spawn with safety margin.
const SPAWN_MIN_BALANCE_WEI = BigInt("100000000000000000"); // 0.1 IP

export async function POST(request: NextRequest) {
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  try {
    const { walletAddress } = await request.json();
    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }

    const { createPublicClient, http, formatEther } = await import("viem");
    const publicClient = createPublicClient({ transport: http(RPC_URL) });

    const balanceWei = await publicClient.getBalance({
      address: walletAddress as `0x${string}`,
    });

    return NextResponse.json({
      success: true,
      address: walletAddress,
      balanceWei: balanceWei.toString(),
      balanceIp: formatEther(balanceWei),
      hasSufficientFunds: balanceWei >= SPAWN_MIN_BALANCE_WEI,
      requiredIp: formatEther(SPAWN_MIN_BALANCE_WEI),
    });
  } catch (error) {
    console.error("Balance check error:", error);
    return NextResponse.json(
      { error: "Failed to check balance" },
      { status: 500 }
    );
  }
}
