import { NextRequest, NextResponse } from "next/server";
import { csrfCheck } from "@/lib/csrf";
import { isValidAddress } from "@/lib/validate";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";

// Drip 0.5 IP per request — covers ~500x spawns (each spawn is ~0.001 IP gas)
const DRIP_AMOUNT_WEI = BigInt("500000000000000000"); // 0.5 IP

// Track which wallets have been dripped to (in-memory, resets on deploy).
// Combined with rateLimit() this gives us "1 drip per wallet per hour" semantics.
const dripedRecently = new Map<string, number>();
const DRIP_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  const csrf = csrfCheck(request);
  if (csrf) return csrf;

  const rl = rateLimit(`drip:${getClientIp(request)}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many drip requests. Try again later.", resetMs: rl.resetMs },
      { status: 429 }
    );
  }

  try {
    const { walletAddress } = await request.json();
    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }

    // Cooldown: 1 drip per wallet per hour
    const lastDrip = dripedRecently.get(walletAddress.toLowerCase());
    if (lastDrip && Date.now() - lastDrip < DRIP_COOLDOWN_MS) {
      const remainingMs = DRIP_COOLDOWN_MS - (Date.now() - lastDrip);
      return NextResponse.json(
        {
          error: "This wallet was already dripped recently. Try again later.",
          retryInMs: remainingMs,
          retryInMin: Math.ceil(remainingMs / 60_000),
        },
        { status: 429 }
      );
    }

    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const { createPublicClient, createWalletClient, http, parseEther, formatEther } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const publicClient = createPublicClient({ transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

    // Check deployer has enough balance to drip
    const deployerBalance = await publicClient.getBalance({ address: account.address });
    if (deployerBalance < DRIP_AMOUNT_WEI) {
      console.error("Deployer wallet low on IP:", formatEther(deployerBalance));
      return NextResponse.json(
        { error: "Server wallet is low on IP. Ask the operator to refill." },
        { status: 503 }
      );
    }

    // Send IP drip
    const txHash = await walletClient.sendTransaction({
      account,
      to: walletAddress as `0x${string}`,
      value: DRIP_AMOUNT_WEI,
      chain: { id: 1315, name: "Aeneid", network: "aeneid", nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } },
    });

    console.log(`Drip ${formatEther(DRIP_AMOUNT_WEI)} IP → ${walletAddress}: ${txHash}`);

    // Mark this wallet as dripped
    dripedRecently.set(walletAddress.toLowerCase(), Date.now());

    return NextResponse.json({
      success: true,
      txHash,
      amountWei: DRIP_AMOUNT_WEI.toString(),
      amountIp: formatEther(DRIP_AMOUNT_WEI),
      recipient: walletAddress,
      message: `Sent ${formatEther(DRIP_AMOUNT_WEI)} IP. Wait a few seconds for the tx to confirm, then click RECHECK.`,
    });
  } catch (error) {
    console.error("Drip error:", error);
    return NextResponse.json(
      { error: "Drip failed" },
      { status: 500 }
    );
  }
}
