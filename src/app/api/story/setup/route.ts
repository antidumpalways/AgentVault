import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidAddress } from "@/lib/validate";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";

const SIMPLE_NFT = "0x6ceb4c8882a74532754363aa8662cc2d0166ff89";
const IP_ASSET_REGISTRY = "0x77319B4031e6eF1250907aa00018B8B1c67a244b";
const LICENSING_MODULE = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f";
const PIL_TEMPLATE = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316";
const LICENSE_TOKEN = "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC";

const chain = {
  id: 1315, name: "Aeneid" as const, network: "aeneid" as const,
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

let nonceLock: Promise<void> = Promise.resolve();

export async function POST(request: NextRequest) {
  // Serialize story setup requests to avoid nonce conflicts
  const releaseLock = await new Promise<() => void>((resolve) => {
    const prev = nonceLock;
    let release!: () => void;
    nonceLock = new Promise<void>((r) => { release = r; });
    prev.then(() => resolve(release));
  });

  try {
    const { walletAddress } = await request.json();
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }
    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }

    const rl = rateLimit(`story:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetMs: rl.resetMs },
        { status: 429 }
      );
    }

    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const viem = await import("viem");
    const { createPublicClient, createWalletClient, http, encodeFunctionData, encodeAbiParameters } = viem;
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const publicClient = createPublicClient({ transport: http(RPC_URL), chain });
    const walletClient = createWalletClient({ account, transport: http(RPC_URL), chain });

    const sendTx = async (params: { to: `0x${string}`; data: `0x${string}`; nonce: number }) => {
      const gasPrice = await publicClient.getGasPrice();
      const signed = await walletClient.signTransaction({
        ...params,
        account,
        value: BigInt(0),
        gas: BigInt(300000),
        gasPrice,
        chainId: chain.id,
      });
      return publicClient.sendRawTransaction({ serializedTransaction: signed });
    };

    // Process a transaction step: send → wait → bump nonce
    const processStep = async (
      label: string,
      build: (nonce: number) => { to: `0x${string}`; data: `0x${string}` }
    ): Promise<{ txHash: `0x${string}`; receipt: any; nextNonce: number }> => {
      const txHash = await sendTx({ ...build(currentNonce), nonce: currentNonce });
      console.log(`${label} tx:`, txHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") {
        throw new Error(`${label} tx reverted: ${txHash}`);
      }
      return { txHash, receipt, nextNonce: currentNonce + 1 };
    };

    let currentNonce = await publicClient.getTransactionCount({ address: account.address });

    // 1. Mint NFT to deployer (server-side flow — deployer owns IP for license management)
    const mintStep = await processStep("Mint", (n) => ({
      to: SIMPLE_NFT as `0x${string}`,
      data: encodeFunctionData({
        abi: [{ inputs: [{ internalType: "address", name: "to", type: "address" }], name: "mint", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "nonpayable", type: "function" }],
        functionName: "mint",
        args: [account.address as `0x${string}`],
      }),
    }));
    currentNonce = mintStep.nextNonce;
    const tokenId = mintStep.receipt.logs[0] ? BigInt(mintStep.receipt.logs[0].topics[3] || "0x0") : BigInt(0);
    console.log("Token ID:", tokenId.toString());

    // 2. Register IP Asset
    const registerStep = await processStep("Register", (n) => ({
      to: IP_ASSET_REGISTRY as `0x${string}`,
      data: encodeFunctionData({
        abi: [{ inputs: [{ internalType: "uint256", name: "chainId", type: "uint256" }, { internalType: "address", name: "tokenContract", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "register", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }],
        functionName: "register",
        args: [BigInt(chain.id), SIMPLE_NFT as `0x${string}`, tokenId],
      }),
    }));
    currentNonce = registerStep.nextNonce;
    let ipId = account.address;
    for (const log of registerStep.receipt.logs) {
      if (log.address.toLowerCase() === IP_ASSET_REGISTRY.toLowerCase() && log.topics.length >= 2) {
        ipId = ("0x" + log.topics[1]?.slice(26)) as `0x${string}`;
        break;
      }
    }
    console.log("IP ID:", ipId);

    // 3. Attach License Terms
    const licenseTermsId = BigInt(2054);
    const attachStep = await processStep("AttachLicense", (n) => ({
      to: LICENSING_MODULE as `0x${string}`,
      data: encodeFunctionData({
        abi: [{ inputs: [{ type: "address", name: "ipId" }, { type: "address", name: "licenseTemplate" }, { type: "uint256", name: "licenseTermsId" }], name: "attachLicenseTerms", stateMutability: "nonpayable", type: "function" }],
        functionName: "attachLicenseTerms",
        args: [ipId, PIL_TEMPLATE as `0x${string}`, licenseTermsId],
      }),
    }));
    currentNonce = attachStep.nextNonce;
    console.log("License terms attached");

    // 4. Mint License Tokens — parse the actual minted tokenId from Transfer event
    const mintLicenseStep = await processStep("MintLicense", (n) => ({
      to: LICENSING_MODULE as `0x${string}`,
      data: encodeFunctionData({
        abi: [{
          inputs: [
            { type: "address", name: "licensorIpId" }, { type: "address", name: "licenseTemplate" },
            { type: "uint256", name: "licenseTermsId" }, { type: "uint256", name: "amount" },
            { type: "address", name: "receiver" }, { type: "bytes", name: "royaltyContext" },
            { type: "uint256", name: "maxMintingFee" }, { type: "uint32", name: "maxRevenueShare" },
          ],
          name: "mintLicenseTokens", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function",
        }],
        functionName: "mintLicenseTokens",
        args: [ipId, PIL_TEMPLATE as `0x${string}`, licenseTermsId, BigInt(1), account.address as `0x${string}`, "0x", BigInt(0), 0],
      }),
    }));
    currentNonce = mintLicenseStep.nextNonce;

    // Parse LicenseToken Transfer event (from=0x0 indicates mint) — scan the block
    // because mintLicenseTokens mints internally and the Transfer event may not appear
    // in the tx receipt itself.
    let licenseTokenId = BigInt(0);
    try {
      const mintLogs = await publicClient.getLogs({
        address: LICENSE_TOKEN as `0x${string}`,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: true },
          ],
        },
        args: {
          from: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        },
        fromBlock: mintLicenseStep.receipt.blockNumber,
        toBlock: mintLicenseStep.receipt.blockNumber,
      } as any);
      if (mintLogs.length > 0) {
        // Take the last mint (in case multiple happened in same block)
        // topic[3] is tokenId (indexed uint256)
        const lastLog = mintLogs[mintLogs.length - 1];
        licenseTokenId = BigInt(lastLog.topics[3] || "0x0");
      }
    } catch (err) {
      console.warn("Failed to parse mint event, falling back to totalSupply - 1:", err);
      // Fallback: read totalSupply
      const totalSupply = await publicClient.readContract({
        address: LICENSE_TOKEN as `0x${string}`,
        abi: [{ name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
        functionName: "totalSupply",
      });
      licenseTokenId = totalSupply - BigInt(1);
    }
    console.log("License tokens minted, tokenId:", licenseTokenId.toString());

    const readConditionData = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }],
      [LICENSE_TOKEN as `0x${string}`, ipId]
    );

    return NextResponse.json({
      success: true,
      ipId,
      licenseTokenId: licenseTokenId.toString(),
      licenseTermsId: licenseTermsId.toString(),
      readConditionData,
      mintTx: mintStep.txHash,
      registerTx: registerStep.txHash,
      attachTx: attachStep.txHash,
      mintLicenseTx: mintLicenseStep.txHash,
    });
  } catch (error: any) {
    console.error("Story setup error:", error);
    return NextResponse.json(
      { error: error?.message || "Story setup failed" },
      { status: 500 }
    );
  } finally {
    releaseLock();
  }
}
