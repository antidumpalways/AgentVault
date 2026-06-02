import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidAddress } from "@/lib/validate";
import { safeError } from "@/lib/apiError";
import { csrfCheck } from "@/lib/csrf";

let wasmInit: Promise<void> | null = null;

// Cache the global DKG public key — it's a slow RPC call that returns
// the same value for all users. Refresh every 5 minutes.
let cachedPubKey: { key: Uint8Array; expiresAt: number } | null = null;
const PUB_KEY_TTL = 5 * 60 * 1000;

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const STORY_API_URL = process.env.STORY_API_URL || "https://aeneid.storyapi.dev";
const OWNER_WRITE = "0x4C9bFC96d7092b590D497A191826C3dA2277c34B";
const LICENSE_READ = "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3";

export async function POST(request: NextRequest) {
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  try {
    const { content, walletAddress, readConditionData } = await request.json();
    if (!content || !walletAddress) {
      return NextResponse.json({ error: "Missing content or walletAddress" }, { status: 400 });
    }
    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }

    const rl = rateLimit(`store:${getClientIp(request)}`, 60, 60 * 1000);
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

    const { CDRClient, uuidToLabel } = await import("@piplabs/cdr-sdk");
    const { createPublicClient, createWalletClient, http, encodeAbiParameters, toHex } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    if (!wasmInit) wasmInit = (await import("@piplabs/cdr-sdk")).initWasm();
    await wasmInit;

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({ transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

    const client = new CDRClient({ network: "testnet", publicClient, walletClient, apiUrl: STORY_API_URL });

    const globalPubKey: Uint8Array =
      cachedPubKey && cachedPubKey.expiresAt > Date.now()
        ? cachedPubKey.key
        : await (async () => {
            const k = await client.observer.getGlobalPubKey();
            cachedPubKey = { key: k, expiresAt: Date.now() + PUB_KEY_TTL };
            return k;
          })();

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
  } catch (error) {
    return safeError("CDR Store", error);
  }
}
