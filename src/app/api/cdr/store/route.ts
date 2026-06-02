import { NextRequest, NextResponse } from "next/server";

let wasmInit: Promise<void> | null = null;

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const STORY_API_URL = process.env.STORY_API_URL || "https://aeneid.storyapi.dev";
const OWNER_WRITE = "0x4C9bFC96d7092b590D497A191826C3dA2277c34B";
const LICENSE_READ = "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3";

export async function POST(request: NextRequest) {
  try {
    const { content, walletAddress, readConditionData } = await request.json();
    if (!content || !walletAddress) {
      return NextResponse.json({ error: "Missing content or walletAddress" }, { status: 400 });
    }

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const { CDRClient, uuidToLabel } = await import("@piplabs/cdr-sdk");
    const { createPublicClient, createWalletClient, http, encodeAbiParameters, toHex } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    if (!wasmInit) wasmInit = (await import("@piplabs/cdr-sdk")).initWasm();
    await wasmInit;

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({ transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

    const client = new CDRClient({ network: "testnet", publicClient, walletClient, apiUrl: STORY_API_URL });

    const globalPubKey = await client.observer.getGlobalPubKey();

    const allocateParams = readConditionData
      ? {
          updatable: true,
          writeConditionAddr: OWNER_WRITE as `0x${string}`,
          writeConditionData: encodeAbiParameters([{ type: "address" }], [walletAddress]),
          readConditionAddr: LICENSE_READ as `0x${string}`,
          readConditionData: readConditionData as `0x${string}`,
          skipConditionValidation: true,
        }
      : {
          updatable: true,
          writeConditionAddr: account.address,
          readConditionAddr: account.address,
          writeConditionData: "0x" as `0x${string}`,
          readConditionData: "0x" as `0x${string}`,
          skipConditionValidation: true,
        };

    const { uuid } = await client.uploader.allocate(allocateParams);

    const ciphertext = await client.uploader.encryptDataKey({
      dataKey: new TextEncoder().encode(content),
      globalPubKey,
      label: uuidToLabel(uuid),
    });

    const { txHash } = await client.uploader.write({
      uuid,
      accessAuxData: "0x",
      encryptedData: toHex(ciphertext.raw),
    });

    const memoryFile = `${walletAddress.slice(0, 8)}-memory-${uuid.toString()}.md`;

    return NextResponse.json({
      success: true,
      uuid: uuid.toString(),
      txHash,
      memoryFile,
      message: "Memory encrypted and stored on-chain",
    });
  } catch (error: any) {
    console.error("CDR Store error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to store memory" },
      { status: 500 }
    );
  }
}
