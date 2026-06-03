require("dotenv").config({ path: ".env.local" });
const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

async function main() {
  const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
  const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    throw new Error("WALLET_PRIVATE_KEY not set in .env.local");
  }

  const chain = {
    id: 1315,
    name: "Aeneid",
    network: "aeneid",
    nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  };

  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ transport: http(RPC_URL), chain });
  const walletClient = createWalletClient({ account, transport: http(RPC_URL), chain });

  console.log("Deploying AgentVault to Aeneid (chainId 1315) ...");
  console.log("Deployer:", account.address);

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer balance:", (Number(balance) / 1e18).toFixed(4), "IP");
  if (balance < BigInt(1e16)) { // 0.01 IP
    throw new Error("Deployer balance too low. Drip from external faucet first.");
  }

  // Read the hardhat-compiled artifact
  const artifactPath = join(__dirname, "..", "artifacts", "contracts", "src", "AgentVault.sol", "AgentVault.json");
  if (!existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run 'hardhat compile' first.`);
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode;

  // Deploy
  const nonce = await publicClient.getTransactionCount({ address: account.address });
  const gasPrice = await publicClient.getGasPrice();

  console.log("Sending deploy tx (nonce", nonce, ") ...");
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode,
    args: [],
  });
  console.log("Deploy tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;

  if (!address) {
    throw new Error("Deployment failed: no contractAddress in receipt");
  }

  // Verify
  const code = await publicClient.getBytecode({ address });
  if (!code || code === "0x") {
    throw new Error("Deployment failed: no code at address");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Network:        Aeneid testnet (chainId 1315)");
  console.log("AgentVault:     ", address);
  console.log("Code size:      ", (code.length - 2) / 2, "bytes");
  console.log("Deployer:       ", account.address);
  console.log("Tx:             ", hash);
  console.log("Block:          ", receipt.blockNumber);
  console.log("\nUpdate src/lib/constants.ts → CONTRACTS.AGENT_VAULT with:");
  console.log(`  AGENT_VAULT: "${address}",`);
  console.log("=========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message || error);
    process.exit(1);
  });
