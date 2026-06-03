import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidAddress, isNonEmptyString, isPositiveIntString } from "@/lib/validate";
import { safeError } from "@/lib/apiError";
import { csrfCheck } from "@/lib/csrf";
import {
  CONTRACTS,
  RPC_URL,
  STORY_API_URL,
  CHAIN_ID,
  LICENSE_TERMS_ID,
} from "@/lib/constants";
import { keccak256, encodePacked } from "viem";

// POST /api/story/setup
//
// Spawn flow (user-pays model):
//   1. Client: POST /api/story/setup with { walletAddress, name, vaultUuid }
//      → server returns pre-encoded calldata templates for the 5 user-signed txs:
//        mint, register, attachLicense, mintLicense, createAgentAndStoreMemory
//   2. Client: signs `mint` (server returns tokenId from receipt)
//   3. Client: signs `register` (gets the IP Account address = ipId)
//   4. Client: signs `attachLicense` via IPAccount.execute
//   5. Client: signs `mintLicense` via IPAccount.execute
//   6. Client: signs `createAgentAndStoreMemory` (user becomes agent.owner)
//   7. Client: POST /api/story/setup/finalize with the receipts → server signs
//      `registerIpForOwner(owner, ipId, vaultId)` on the AgentVault contract
//      so external clients can discover this agent via getUserIpIds(owner).
//
// The user pays for 5 txs. The deployer wallet only pays for the registry
// pointer (1 tx). No more "deployer drained" issue.
//
// Pre-flight: the user must have at least 0.1 IP on Aeneid. The spawn page
// shows external faucet links if the balance check fails.

const AGENT_VAULT_ABI = [
  {
    name: "createAgentAndStoreMemory",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ipId", type: "address" },
      { name: "vaultId", type: "uint256" },
      { name: "contentHash", type: "bytes32" },
      { name: "metadata", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

const SIMPLE_NFT_MINT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const IP_REGISTRY_REGISTER_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "chainId", type: "uint256" },
      { name: "tokenContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const LICENSING_ATTACH_ABI = [
  {
    name: "attachLicenseTerms",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ipId", type: "address" },
      { name: "licenseTemplate", type: "address" },
      { name: "licenseTermsId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const LICENSING_MINT_ABI = [
  {
    name: "mintLicenseTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "licensorIpId", type: "address" },
      { name: "licenseTemplate", type: "address" },
      { name: "licenseTermsId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "royaltyContext", type: "bytes" },
      { name: "maxMintingFee", type: "uint256" },
      { name: "maxRevenueShare", type: "uint32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const IP_ACCOUNT_EXECUTE_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "result", type: "bytes" }],
  },
] as const;

let initLock: Promise<void> = Promise.resolve();

export async function POST(request: NextRequest) {
  // Serialize init requests to prevent nonce conflicts on the registry side.
  const releaseLock = await new Promise<() => void>((resolve) => {
    const prev = initLock;
    let release!: () => void;
    initLock = new Promise<void>((r) => { release = r; });
    prev.then(() => resolve(release));
  });

  try {
    const csrf = csrfCheck(request);
    if (csrf) return csrf;

    const body = await request.json();
    const { walletAddress, name, vaultUuid } = body;

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }
    if (!isNonEmptyString(name, 100)) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!isPositiveIntString(String(vaultUuid))) {
      return NextResponse.json({ error: "Invalid vaultUuid" }, { status: 400 });
    }

    const rl = rateLimit(`story-init:${getClientIp(request)}`, 30, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetMs: rl.resetMs },
        { status: 429 }
      );
    }

    // Pre-encode the inner data for attachLicense and mintLicense (these go
    // inside IPAccount.execute). The client wraps them with the IP Account's
    // `execute(to=licensingModule, value=0, data=<inner>)` calldata at sign time.
    const attachLicenseInnerDataPlaceholder =
      "0x" as `0x${string}`; // client fills in with real ipId
    const mintLicenseInnerDataPlaceholder =
      "0x" as `0x${string}`;

    // contentHash = keccak256(vaultUuid). Stable across the agent's lifetime.
    const vaultIdBig = BigInt(vaultUuid);
    const contentHash = keccak256(encodePacked(["uint256"], [vaultIdBig]));

    return NextResponse.json({
      success: true,
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      licenseTermsId: LICENSE_TERMS_ID.toString(),

      // Pre-signed mint calldata (user signs this first).
      mintTx: {
        to: CONTRACTS.SIMPLE_NFT,
        abi: SIMPLE_NFT_MINT_ABI,
        functionName: "mint",
        args: [walletAddress],
      },

      // The remaining 4 txs need data from receipts (tokenId from mint, ipId
      // from register). The client encodes them with viem using the ABIs and
      // arg templates below.
      registerTx: {
        to: CONTRACTS.IP_ASSET_REGISTRY,
        abi: IP_REGISTRY_REGISTER_ABI,
        functionName: "register",
        args: [BigInt(CHAIN_ID), CONTRACTS.SIMPLE_NFT, "<tokenId-from-mint>"],
        // After signing, parse the IP Account address from the IPAssetRegistry
        // event log. The IP Account is created with CREATE2 so the address is
        // deterministic — but we let the client read it from the receipt to
        // avoid hardcoding the CREATE2 formula.
        ipIdFromReceipt: true,
      },

      attachLicenseTx: {
        to: "<ipId>", // IP Account address (from register receipt)
        abi: IP_ACCOUNT_EXECUTE_ABI,
        functionName: "execute",
        args: [
          CONTRACTS.LICENSING_MODULE,
          BigInt(0),
          "<innerAttachLicenseData>",
        ],
        // Client builds inner data using this template:
        innerDataTemplate: {
          abi: LICENSING_ATTACH_ABI,
          functionName: "attachLicenseTerms",
          args: ["<ipId>", CONTRACTS.PIL_TEMPLATE, BigInt(LICENSE_TERMS_ID)],
        },
      },

      mintLicenseTx: {
        to: "<ipId>",
        abi: IP_ACCOUNT_EXECUTE_ABI,
        functionName: "execute",
        args: [
          CONTRACTS.LICENSING_MODULE,
          BigInt(0),
          "<innerMintLicenseData>",
        ],
        innerDataTemplate: {
          abi: LICENSING_MINT_ABI,
          functionName: "mintLicenseTokens",
          args: [
            "<ipId>",
            CONTRACTS.PIL_TEMPLATE,
            BigInt(LICENSE_TERMS_ID),
            BigInt(1),
            walletAddress,
            "0x",
            BigInt(0),
            0,
          ],
        },
      },

      createAgentAndStoreMemoryTx: {
        to: CONTRACTS.AGENT_VAULT,
        abi: AGENT_VAULT_ABI,
        functionName: "createAgentAndStoreMemory",
        args: ["<ipId>", vaultIdBig, contentHash, String(vaultUuid)],
      },

      // Reference: where to call finalize after all 5 user txs are mined.
      finalizeEndpoint: "/api/story/finalize",
    });
  } catch (error) {
    return safeError("Story setup", error);
  } finally {
    releaseLock();
  }
}
