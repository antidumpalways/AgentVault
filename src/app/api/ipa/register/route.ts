import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, vaultUuid, ownerAddress } = await request.json();
    if (!name || !vaultUuid || !ownerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
    const { createWalletClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      transport: http(RPC_URL),
      chain: {
        id: 1315, name: "Aeneid", network: "aeneid",
        nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
        rpcUrls: { default: { http: [RPC_URL] } },
      },
    });

    // Register IP Asset on Story Protocol
    // In production: call StoryProtocol's IPAssetRegistry.register()
    const txHash = await walletClient.writeContract({
      address: "0xcC0bBdBcC1c5CbACbBcc1c5CbACBcc1C5cBacC1" as `0x${string}`,
      abi: [
        {
          name: "registerIPAsset",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "owner", type: "address" },
            { name: "vaultUuid", type: "uint256" },
            { name: "name", type: "string" },
          ],
          outputs: [{ name: "ipAssetId", type: "uint256" }],
        },
      ],
      functionName: "registerIPAsset",
      args: [ownerAddress as `0x${string}`, BigInt(vaultUuid), name],
      account: account.address,
    });

    return NextResponse.json({
      success: true,
      txHash,
      ipaId: vaultUuid,
      message: "IP Asset registered. License tokens can now be minted.",
    });
  } catch (error: unknown) {
    console.error("IPA register error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "IPA registration failed" },
      { status: 200 }
    );
  }
}
