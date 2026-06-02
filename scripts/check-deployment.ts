import { createPublicClient, http } from "viem";

const RPC_URL = "https://aeneid.storyrpc.io";
const CHAIN_ID = 1315;

const agentVaultTx = "0x9002fa5e76aef66f890c04350909eb4c78d4a50095a998b11412059d5aaa22f4";
const timeBasedTx = "0x252e6e910aef89dd179254d1d877dddaba92f96a46c22bc16cc1d479e28d73e4";

async function main() {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: {
      id: CHAIN_ID,
      name: "Aeneid",
      network: "aeneid",
      nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
  });

  console.log("Checking transactions...\n");

  try {
    const agentVaultReceipt = await client.getTransactionReceipt({ hash: agentVaultTx as `0x${string}` });
    if (agentVaultReceipt) {
      console.log("AgentVault:");
      console.log("  Address:", agentVaultReceipt.contractAddress);
      console.log("  Status:", agentVaultReceipt.status === "success" ? "✓ Success" : "✗ Failed");
      console.log("  Explorer: https://aeneid.storyscan.io/address/" + agentVaultReceipt.contractAddress);
    }
  } catch (e) {
    console.log("AgentVault tx not found yet");
  }

  try {
    const timeBasedReceipt = await client.getTransactionReceipt({ hash: timeBasedTx as `0x${string}` });
    if (timeBasedReceipt) {
      console.log("\nTimeBasedReadCondition:");
      console.log("  Address:", timeBasedReceipt.contractAddress);
      console.log("  Status:", timeBasedReceipt.status === "success" ? "✓ Success" : "✗ Failed");
      console.log("  Explorer: https://aeneid.storyscan.io/address/" + timeBasedReceipt.contractAddress);
    }
  } catch (e) {
    console.log("TimeBasedReadCondition tx not found yet");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
