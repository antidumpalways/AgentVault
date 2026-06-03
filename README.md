# AgentVault

> Sovereign AI Agent Memory on Story Protocol with CDR Threshold Encryption

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Story Protocol](https://img.shields.io/badge/Story-Protocol-6366f1.svg)](https://story.foundation)
[![CDR](https://img.shields.io/badge/CDR-Threshold%20Encryption-10b981.svg)](https://docs.story.foundation/developers/cdr-sdk/overview)

---

## Overview

AgentVault is a platform for managing persistent, encrypted AI agent memory on Story Protocol. It uses **CDR (Confidential Data Rails)** threshold encryption and real **LLM inference** (Anthropic Sonnet) to create AI agents with sovereign memory.

| Property | How |
|----------|-----|
| **Encrypted** | CDR threshold encryption — M-of-N Story validators must agree to decrypt |
| **Portable** | Memory lives on-chain as CDR vaults, not locked to any platform |
| **Intelligent** | Real LLM (Anthropic Sonnet 3.5) powers every agent response |
| **IP-Protected** | Story Protocol IP Assets + License Tokens for ownership and access control |
| **Composable** | OwnerWriteCondition + LicenseReadCondition integrate with Story Protocol |
| **Open** | Data lives on-chain — any client with the right SDK + license token can recall memories, not just AgentVault |

### The Problem

Today's AI agents have no persistent, private memory:
- ChatGPT forgets you after each session
- Agent memory is owned by platforms (OpenAI, Anthropic)
- No way to monetize or share agent knowledge

### The Solution

User chats with an AI agent. The conversation is encrypted via CDR threshold encryption and stored on-chain as a vault. The agent's IP is registered on Story Protocol. Only authorized holders can decrypt and access the memory.

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js 14 + Dark Crypto Elegance UI)    │
│  /app/spawn  /app/train  /app/brain  /app/vaults    │
│  /app/memories  /app/analytics  /app/marketplace     │
├─────────────────────────────────────────────────────┤
│  API Routes (Server-Side)                            │
│  /api/cdr/store    CDR encrypt + store on-chain      │
│  /api/cdr/recall   CDR decrypt from validators       │
│  /api/llm/chat     Anthropic Sonnet inference        │
│  /api/story/setup  IP Asset + License registration   │
├─────────────────────────────────────────────────────┤
│  CDR SDK (@piplabs/cdr-sdk v0.2.1)                   │
│  observer · uploader · consumer                      │
├─────────────────────────────────────────────────────┤
│  Story Protocol (Aeneid Testnet)                     │
│  IPAssetRegistry · LicensingModule · LicenseToken    │
│  OwnerWriteCondition · LicenseReadCondition          │
│  DKG Validators (threshold decryption)               │
└─────────────────────────────────────────────────────┘
```

### Data Flow: Spawn Agent

```
User → Enter Name → Story Setup (Mint NFT + Register IP + Attach License)
     → CDR Store (Allocate Vault + TDH2 Encrypt + Write On-Chain)
     → Agent saved with UUID, IP ID, License Token ID
```

### Data Flow: Train Agent (Chat + Encrypt)

```
User → Type Message → POST /api/llm/chat (Anthropic Sonnet)
     → AI Response displayed
     → POST /api/cdr/store (encrypt + store both user & AI messages)
     → Memory encrypted on-chain with CDR threshold encryption
```

### Data Flow: Recall Memory

```
User → Enter UUID → POST /api/cdr/recall
     → CDR consumer.accessCDR() submits read request on-chain
     → DKG validators produce partial decryptions
     → Partials combined client-side → original content recovered
```

### Open Ecosystem Architecture

AgentVault is **one of many clients** that can read and write the shared on-chain memory layer. The data, encryption, and access control are protocol-level — not owned by AgentVault. Any client implementing the same primitives can interoperate.

```
                ┌─────────────────────────────────────────┐
                │     Story Protocol (Aeneid / Mainnet)   │
                │  IP Asset Registry · LicensingModule    │
                │  LicenseToken · DKG · CDR Validators   │
                └────────┬────────────┬─────────────┬─────┘
                         │            │             │
        ┌────────────────┴──┐  ┌──────┴──────┐  ┌───┴────────────┐
        │  AgentVault (UI)  │  │  External   │  │  Third-party   │
        │  /app/* dashboard │  │  Agent #1   │  │  Memory Market │
        │  (this repo)      │  │  (LangChain │  │  (license      │
        │                   │  │  / Eliza /  │  │  trading)      │
        │                   │  │  custom)    │  │                │
        └───────────────────┘  └──────┬──────┘  └────────────────┘
                                      │
                                      │ reads via SDK
                                      │ (open standard)
                                      ▼
                          ┌──────────────────────┐
                          │  Shared Memory Layer │
                          │  (CDR + DKG + IP)    │
                          └──────────────────────┘
                                      ▲
                                      │ writes via SDK
                          ┌───────────┴──────────┐
                          │  Other Memory Apps   │
                          │  (Notus, custom,     │
                          │   research)          │
                          └──────────────────────┘
```

**Implication:** A user's memories are not locked inside AgentVault. An external agent (LangChain, custom Node script, another dApp) can:
1. Receive a `licenseTokenId` from the IP owner (granted via `/app/vaults` → `+ LICENSE`)
2. Use the same `uuid` to look up the encrypted vault on-chain
3. Call `cdr.consumer.accessCDR(uuid, licenseTokenId)` with the user's wallet signature
4. Receive partial decryptions from the DKG and combine them locally
5. Continue the conversation with the decrypted memory as LLM context — outside AgentVault

AgentVault is the reference client, not a silo.

---

## How It Works

### 1. Spawn Agent (`/app/spawn`)

- Enter agent name → click "Spawn"
- Story Setup runs: mint NFT → register IP Asset → attach license terms → mint license token
- CDR vault created with encrypted initial memory
- Agent saved to local store with UUID, IP ID, license token ID

### 2. Train Agent (`/app/train`)

- Split-screen: **Chat** (left) + **CDR Stream** (right)
- Each message: sent to Anthropic Sonnet → AI response displayed → full conversation encrypted via CDR → stored on-chain
- Real-time logs show DKG key fetch, TDH2 encrypt, vault write

### 3. Recall Memory (`/app/brain`)

- Enter vault UUID or select from quick-select buttons
- CDR recall submits read request → validators provide partial decryptions → combined client-side
- Decrypted memories displayed with encryption badge

### 4. Vaults (`/app/vaults`)

- View all created agents and their memory counts
- Shows vault UUID, creation date, IP registration status
- **Grant License** — IP owner can mint a license token to any address, transferring read access. The grantee (a human wallet, another agent, a service) can then decrypt the vault's memory using the standard CDR recall flow. License grants are signed by the user's own wallet — AgentVault never holds the IP.

### 5. Memories (`/app/memories`)

- Browse all stored memories across agents
- Filter by role (user/agent/system), search by content

### 6. Analytics (`/app/analytics`)

- Real-time stats: agents count, memories count, storage size
- Memory type breakdown, growth chart, recent activity feed

### 7. Marketplace (`/app/marketplace`)

- Browse agent listings (demo data)
- License-based access model

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, React 18 | UI framework |
| Styling | Tailwind CSS | Dark Crypto Elegance design system |
| AI | Anthropic Sonnet 3.5 | LLM agent responses |
| CDR SDK | @piplabs/cdr-sdk v0.2.1 | Threshold encryption |
| Blockchain | Story Aeneid Testnet (chainId 1315) | L1 network |
| Smart Contracts | Solidity 0.8.26, OpenZeppelin | On-chain logic |
| Wallet | EIP-1193 (Bitget, MetaMask) | User authentication |
| Persistence | localStorage (useStore hook) | Client-side data |

---

## Project Structure

```
agentvault/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cdr/store/           # CDR encrypt + store on-chain
│   │   │   ├── cdr/recall/          # CDR decrypt from validators
│   │   │   ├── llm/chat/            # Anthropic Sonnet inference
│   │   │   ├── story/setup/         # IP Asset + License registration
│   │   │   ├── contract/            # AgentVault.sol interaction
│   │   │   ├── license/list-owned/  # Enumerate license tokens held by wallet
│   │   │   └── wallet/              # balance + server-side IP drip
│   │   ├── app/
│   │   │   ├── spawn/               # Agent creation
│   │   │   ├── train/               # Chat + CDR encryption
│   │   │   ├── brain/               # Memory recall/decrypt
│   │   │   ├── vaults/              # Agent vault management
│   │   │   ├── memories/            # Memory browser
│   │   │   ├── analytics/           # Usage analytics
│   │   │   └── marketplace/         # Agent marketplace
│   │   ├── spawn/                   # Redirect → /app/spawn
│   │   ├── train/                   # Redirect → /app/train
│   │   ├── brain/                   # Redirect → /app/brain
│   │   └── market/                  # Redirect → /app/marketplace
│   ├── components/
│   │   ├── dashboard/app-layout.tsx # Unified sidebar navigation
│   │   ├── Toast.tsx                # Toast notifications
│   │   ├── ClientLayout.tsx         # Wallet + Store providers
│   │   ├── landing/                 # Landing page sections
│   │   └── error-boundary.tsx       # Error boundary
│   ├── hooks/
│   │   ├── useStore.ts              # localStorage-backed store (agents, memories, granted licenses)
│   │   ├── useAppStore.tsx          # Store context provider
│   │       ├── useWallet.tsx            # EIP-1193 multi-wallet (Bitget, MetaMask) + demo fallback
│   │   ├── useCDRClient.ts          # CDR API fetch helpers
│   │   └── useGrantLicense.ts       # Client-side license minting via user wallet
│   └── lib/
│       ├── constants.ts             # Contract addresses, RPC URLs, faucet URLs
│       ├── apiError.ts              # safeError() — hides internals, returns sanitized JSON
│       ├── csrf.ts                  # Origin-based CSRF check for POST routes
│       ├── rateLimit.ts             # IP-based rate limiter (in-memory)
│       └── validate.ts              # isValidAddress(), payload sanitizers
├── contracts/
│   └── src/
│       ├── AgentVault.sol           # Core agent management
│       ├── TimeBasedReadCondition.sol
│       └── SimpleNFT.sol            # NFT for IP Asset registration
├── scripts/                         # Deployment scripts
├── docs/
│   └── TEE_ARCHITECTURE.md          # Double-signer production vision
└── .env.local.example               # Environment template
```

---

## Smart Contracts

### Deployed on Aeneid Testnet

| Contract | Address |
|----------|---------|
| **SimpleNFT** | `0x6ceb4c8882a74532754363aa8662cc2d0166ff89` |
| **AgentVault** | `0x7e0f1182c444ba420a1d98c81c2da05bc4d1b0a8` |
| OwnerWriteCondition | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` |
| LicenseReadCondition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` |
| LicenseToken | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` |
| CDR | `0xCcCcCC0000000000000000000000000000000005` |
| DKG | `0xCcCcCC0000000000000000000000000000000004` |
| IPAssetRegistry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` |
| LicensingModule | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` |
| PILicenseTemplate | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` |

### AgentVault.sol

Core contract for managing agents and their memories.

```solidity
function createAgent(string name, uint256 vaultUuid) external returns (uint256);
function storeMemory(uint256 agentId, bytes32 contentHash, string metadata) external returns (uint256);
function grantAccess(uint256 agentId, address grantee) external;
function revokeAccess(uint256 agentId, address grantee) external;
function checkAccess(uint256 agentId, address user) external view returns (bool);
```

---

## CDR Integration

CDR (Confidential Data Rails) is Story Protocol's threshold encryption layer. Data is encrypted with a DKG public key generated by the validator network. Decryption requires M-of-N validators to produce partial decryptions.

### Flow

1. **Allocate** a vault on-chain with read/write conditions
2. **Fetch** the DKG global public key from validators
3. **Encrypt** data locally using TDH2 threshold encryption
4. **Write** encrypted ciphertext to the vault on-chain
5. **Read** by submitting a request → validators produce partial decryptions → combined client-side

### Access Patterns

| Pattern | Write Condition | Read Condition |
|---------|----------------|----------------|
| **Owner-Only** (current) | OwnerWriteCondition + wallet address | OwnerWriteCondition + wallet address |
| **License-Gated** (planned) | OwnerWriteCondition + wallet address | LicenseReadCondition + License Token |

### Key Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| OwnerWriteCondition | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` | Only vault owner can write |
| LicenseReadCondition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` | License token holders can read |

---

## API Endpoints

Full OpenAPI 3.0 spec is served at **`/openapi.json`** and rendered at **`/docs`** (Swagger UI). Both are generated alongside the code; the spec is the source of truth for external clients building against the protocol.

| Tag | Endpoint | Summary |
|-----|----------|---------|
| CDR | `POST /api/cdr/store` | Encrypt + store memory on-chain via TDH2 threshold encryption |
| CDR | `POST /api/cdr/recall` | Decrypt memory via DKG validator partials |
| Story | `POST /api/story/setup` | Mint NFT → register IP → attach license → mint license token |
| LLM | `POST /api/llm/chat` | Anthropic Claude inference proxy with history |
| Contract | `POST /api/contract` | Read AgentVault registry (`getUserAgents`, `checkAccess`, `getAgentMemoryCount`) |
| Wallet | `POST /api/wallet/balance` | Native IP balance + sufficiency check |
| Wallet | `POST /api/wallet/drip` | Server-side 0.1 IP testnet drip (1h cooldown) |
| License | `POST /api/license/list-owned` | Enumerate license token IDs held by a wallet |
| Marketplace | `POST /api/marketplace/purchase` | Pre-encode `mintLicenseTokens` calldata for a buyer to sign (off-chain listing → on-chain license) |

**Client-side license grant** (in `src/hooks/useGrantLicense.ts`): the IP owner signs `LicensingModule.mintLicenseTokens` directly with their wallet. No server-side signer is involved because the IP is owned by the user, not the deployer. The transaction mints an ERC-721 license token to the specified grantee address.

### Quick examples

```bash
# Check balance
curl -X POST http://localhost:3000/api/wallet/balance \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"walletAddress": "0x936CDB5dD5DCE69a2DeC06299C986E7798ab274B"}'

# Store encrypted memory
curl -X POST http://localhost:3000/api/cdr/store \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"content": "Hello, agent", "walletAddress": "0x..."}'

# Recall with license token
curl -X POST http://localhost:3000/api/cdr/recall \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"uuid": 4936, "walletAddress": "0x...", "licenseTokenIds": ["68084"]}'
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- MetaMask or compatible wallet
- IP tokens on Aeneid testnet (get from [faucet](https://faucet.story.foundation/))
- Anthropic API key

### Installation

```bash
git clone https://github.com/your-username/agentvault.git
cd agentvault
npm install --legacy-peer-deps
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `RPC_URL` | yes | Story Aeneid RPC endpoint |
| `STORY_API_URL` | yes | Story API/indexer endpoint |
| `WALLET_PRIVATE_KEY` | yes | Server signer for CDR + Story txs (must hold IP on Aeneid) |
| `LLM_API_KEY` | no | Anthropic key; without it, chat falls back to a demo reply |
| `LLM_API_URL` | no | Defaults to Anthropic Messages |
| `LLM_MODEL` | no | Defaults to `claude-sonnet-4-20250514` |
| `NEXT_PUBLIC_SITE_URL` | prod | Used by CSRF allow-list for deployed origin |

For Vercel, set the same variables in the project's Environment Variables tab. `VERCEL_URL` is auto-populated and also accepted by the CSRF allow-list.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture Vision

AgentVault's long-term architecture targets **TEE (Trusted Execution Environment)** double-signer security:

| Stage | Signer | Security Model |
|-------|--------|----------------|
| **Current (Demo)** | Server private key | Simple, functional |
| **Production Target** | User Wallet + TEE Enclave | Dual authorization |

See [`docs/TEE_ARCHITECTURE.md`](docs/TEE_ARCHITECTURE.md) for the complete vision.

---

## Demo

- Spawn an agent → Story IP registration + CDR vault creation
- Train with real AI (Anthropic Sonnet) → encrypted on-chain
- Recall memory → threshold decryption via validators
- Grant a license to another wallet → that address can decrypt your agent's memory
- Browse vaults, memories, analytics

Submission deadline: June 3, 2026

---

## Acknowledgments

- [Story Protocol](https://story.foundation/) — IP infrastructure and CDR
- [CDR SDK](https://docs.story.foundation/developers/cdr-sdk/overview) — Threshold encryption
- [Linear](https://linear.app/) — Design inspiration

---

## License

MIT
