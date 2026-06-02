import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidAddress } from "@/lib/validate";

let wasmInit: Promise<void> | null = null;

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const STORY_API_URL = process.env.STORY_API_URL || "https://aeneid.storyapi.dev";

export async function POST(request: NextRequest) {
  try {
    const { uuid, walletAddress, licenseTokenIds } = await request.json();
    if (!uuid || !walletAddress) {
      return NextResponse.json({ error: "Missing uuid or walletAddress" }, { status: 400 });
    }
    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }

    const rl = rateLimit(`recall:${getClientIp(request)}`, 60, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetMs: rl.resetMs },
        { status: 429 }
      );
    }

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const { CDRClient } = await import("@piplabs/cdr-sdk");
    const { createPublicClient, createWalletClient, http, encodeAbiParameters } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    if (!wasmInit) wasmInit = (await import("@piplabs/cdr-sdk")).initWasm();
    await wasmInit;

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({ transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

    const client = new CDRClient({ network: "testnet", publicClient, walletClient, apiUrl: STORY_API_URL });

    const accessAuxData = (licenseTokenIds && licenseTokenIds.length > 0)
      ? encodeAbiParameters([{ type: "uint256[]" }], [licenseTokenIds.map((id: string | number) => BigInt(id))])
      : "0x";

    const { dataKey, txHash } = await client.consumer.accessCDR({
      uuid: Number(uuid),
      accessAuxData,
      timeoutMs: 120_000,
    });

    return NextResponse.json({
      success: true,
      content: new TextDecoder().decode(dataKey),
      txHash,
      message: "Memory decrypted successfully",
    });
  } catch (error: any) {
    console.error("CDR Recall error:", error?.message, error?.cause?.message || "");
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to recall memory", details: error?.cause?.message || "" },
      { status: 500 }
    );
  }
}
