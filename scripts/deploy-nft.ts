import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: join(__dirname, "../.env.local") });

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Please set WALLET_PRIVATE_KEY in .env.local");
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log("Deploying from account:", account.address);

  const chain = {
    id: 1315, name: "Aeneid" as const, network: "aeneid" as const,
    nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  };

  const client = createWalletClient({ account, transport: http(RPC_URL), chain });

  const { createPublicClient } = await import("viem");
  const publicClient = createPublicClient({ transport: http(RPC_URL), chain });

  const artifact = JSON.parse(
    readFileSync(join(__dirname, "../artifacts/contracts/src/SimpleNFT.sol/SimpleNFT.json"), "utf8")
  );

  console.log("\nDeploying SimpleNFT...");
  const txHash = await client.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
  });
  console.log("SimpleNFT tx:", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const address = receipt.contractAddress;
  console.log("SimpleNFT address:", address);
  console.log("Explorer: https://aeneid.storyscan.io/address/" + address);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
