import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      return NextResponse.json({ error: "Server signer not configured" }, { status: 500 });
    }

    const viem = await import("viem");
    const { createPublicClient, createWalletClient, http, encodeFunctionData, encodeAbiParameters, parseAbi } = viem;
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

    const nonce = await publicClient.getTransactionCount({ address: account.address });

    // 1. Mint NFT to deployer (server-side flow — deployer owns IP for license management)
    const mintData = encodeFunctionData({
      abi: [{ inputs: [{ internalType: "address", name: "to", type: "address" }], name: "mint", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "nonpayable", type: "function" }],
      functionName: "mint",
      args: [account.address as `0x${string}`],
    });
    const mintHash = await sendTx({ to: SIMPLE_NFT as `0x${string}`, data: mintData, nonce });
    console.log("Mint tx:", mintHash);
    const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
    const tokenId = mintReceipt.logs[0] ? BigInt(mintReceipt.logs[0].topics[3] || "0x0") : BigInt(0);
    console.log("Token ID:", tokenId.toString());

    // 2. Register IP Asset
    const registerData = encodeFunctionData({
      abi: [{ inputs: [{ internalType: "uint256", name: "chainId", type: "uint256" }, { internalType: "address", name: "tokenContract", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "register", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }],
      functionName: "register",
      args: [BigInt(chain.id), SIMPLE_NFT as `0x${string}`, tokenId],
    });
    const registerHash = await sendTx({ to: IP_ASSET_REGISTRY as `0x${string}`, data: registerData, nonce: nonce + 1 });
    console.log("Register tx:", registerHash);
    const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });
    let ipId = account.address;
    for (const log of registerReceipt.logs) {
      if (log.address.toLowerCase() === IP_ASSET_REGISTRY.toLowerCase() && log.topics.length >= 2) {
        ipId = ("0x" + log.topics[1]?.slice(26)) as `0x${string}`;
        break;
      }
    }
    console.log("IP ID:", ipId);

    // 3. Attach License Terms
    const licenseTermsId = BigInt(2054);
    const attachData = encodeFunctionData({
      abi: [{ inputs: [{ type: "address", name: "ipId" }, { type: "address", name: "licenseTemplate" }, { type: "uint256", name: "licenseTermsId" }], name: "attachLicenseTerms", stateMutability: "nonpayable", type: "function" }],
      functionName: "attachLicenseTerms",
      args: [ipId, PIL_TEMPLATE as `0x${string}`, licenseTermsId],
    });
    const attachHash = await sendTx({ to: LICENSING_MODULE as `0x${string}`, data: attachData, nonce: nonce + 2 });
    await publicClient.waitForTransactionReceipt({ hash: attachHash });
    console.log("License terms attached");

    // 4. Mint License Tokens
    const mintLicenseData = encodeFunctionData({
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
    });
    const mintLicenseHash = await sendTx({ to: LICENSING_MODULE as `0x${string}`, data: mintLicenseData, nonce: nonce + 3 });
    await publicClient.waitForTransactionReceipt({ hash: mintLicenseHash });
    console.log("License tokens minted");

    const totalSupply = await publicClient.readContract({
      address: LICENSE_TOKEN as `0x${string}`,
      abi: parseAbi(["function totalSupply() view returns (uint256)"]),
      functionName: "totalSupply",
    });
    const licenseTokenId = totalSupply - BigInt(1);

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
      mintTx: mintHash,
      registerTx: registerHash,
      attachTx: attachHash,
      mintLicenseTx: mintLicenseHash,
    });
  } catch (error: any) {
    console.error("Story setup error:", error);
    return NextResponse.json(
      { error: error?.message || "Story setup failed" },
      { status: 500 }
    );
  }
}
