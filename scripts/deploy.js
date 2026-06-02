require("dotenv").config({ path: ".env.local" });
const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { readFileSync } = require("fs");
const { join } = require("path");
const solc = require("solc");

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

  // Read + compile AgentVault.sol
  const sourcePath = join(__dirname, "..", "contracts", "src", "AgentVault.sol");
  const source = readFileSync(sourcePath, "utf8");

  const input = {
    language: "Solidity",
    sources: { "AgentVault.sol": { content: source } },
    settings: {
      evmVersion: "cancun",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };

  function findImports(path) {
    try {
      return { contents: readFileSync(join(__dirname, "..", "node_modules", path), "utf8") };
    } catch {
      return { error: "File not found: " + path };
    }
  }

  console.log("Compiling AgentVault.sol ...");
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length > 0) {
      console.error("Compile errors:");
      fatal.forEach((e) => console.error(e.formattedMessage));
      throw new Error("Compilation failed");
    }
  }

  const abi = output.contracts["AgentVault.sol"].AgentVault.abi;
  const bytecode = output.contracts["AgentVault.sol"].AgentVault.evm.bytecode.object;

  // Deploy
  const nonce = await publicClient.getTransactionCount({ address: account.address });
  const gasPrice = await publicClient.getGasPrice();

  console.log("Sending deploy tx (nonce", nonce, ") ...");
  const signed = await walletClient.signTransaction({
    account,
    to: undefined,
    data: "0x" + bytecode,
    value: BigInt(0),
    gas: BigInt(2000000),
    gasPrice,
    nonce,
    chainId: chain.id,
  });
  const txHash = await publicClient.sendRawTransaction({ serializedTransaction: signed });
  console.log("Deploy tx:", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
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
  console.log("Tx:             ", txHash);
  console.log("Block:          ", receipt.blockNumber);
  console.log("\nUpdate src/app/api/contract/route.ts:");
  console.log(`  const AGENT_VAULT_ADDRESS = "${address}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
