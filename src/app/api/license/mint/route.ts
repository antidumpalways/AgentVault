import { NextRequest, NextResponse } from "next/server";

const LICENSE_TOKEN = "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC";
const LICENSE_READ = "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3";

export async function POST(request: NextRequest) {
  try {
    const { agentId, userAddress } = await request.json();
    if (!agentId || !userAddress) {
      return NextResponse.json({ error: "Missing agentId or userAddress" }, { status: 400 });
    }

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const { createWalletClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
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

    // Simulate license mint transaction
    // In production: call LicenseToken.mint() with agent's IPA ID
    const txHash = await walletClient.writeContract({
      address: LICENSE_TOKEN as `0x${string}`,
      abi: [
        {
          name: "mintLicense",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "agentId", type: "uint256" },
          ],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "mintLicense",
      args: [userAddress as `0x${string}`, BigInt(agentId)],
      account: account.address,
    });

    return NextResponse.json({
      success: true,
      txHash,
      message: "License token minted successfully",
      details: {
        licenseToken: LICENSE_TOKEN,
        readCondition: LICENSE_READ,
        note: "Now the user can read CDR vaults linked to this IPA via LicenseReadCondition",
      },
    });
  } catch (error: unknown) {
    console.error("License mint error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "License mint failed" },
      { status: 200 }
    );
  }
}
