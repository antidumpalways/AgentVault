import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join } from "path";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

async function getContractAddress(txHash: `0x${string}`): Promise<string> {
  const { createPublicClient } = await import("viem");
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: {
      id: 1315, name: "Aeneid", network: "aeneid",
      nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
  });
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  return receipt.contractAddress || "";
}

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Please set WALLET_PRIVATE_KEY in .env.local");
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log("Deploying from account:", account.address);

  const client = createWalletClient({
    account,
    transport: http(RPC_URL),
    chain: {
      id: 1315, name: "Aeneid", network: "aeneid",
      nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
  });

  const agentVaultArtifact = JSON.parse(
    readFileSync(join(__dirname, "../artifacts/contracts/src/AgentVault.sol/AgentVault.json"), "utf8")
  );

  console.log("\nDeploying AgentVault...");
  const agentVaultHash = await client.deployContract({
    abi: agentVaultArtifact.abi,
    bytecode: agentVaultArtifact.bytecode as `0x${string}`,
  });
  console.log("AgentVault tx:", agentVaultHash);

  const agentVaultAddress = await getContractAddress(agentVaultHash);
  console.log("AgentVault address:", agentVaultAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("AgentVault:", agentVaultAddress);
  console.log("Update src/lib/constants.ts → CONTRACTS.AGENT_VAULT with the new address.");
  console.log("Explorer: https://aeneid.storyscan.io/");
  console.log("========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
