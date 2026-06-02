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
| Wallet | MetaMask / window.ethereum | User authentication |
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
│   │   │   ├── license/mint/        # License token minting
│   │   │   └── ipa/register/        # IP Asset registration
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
│   │   ├── useStore.ts              # localStorage-backed store
│   │   ├── useAppStore.tsx          # Store context provider
│   │   ├── useWallet.tsx            # MetaMask + demo fallback
│   │   └── useCDRClient.ts          # CDR API fetch helpers
│   └── lib/
│       └── constants.ts             # Contract addresses, RPC URLs
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
| **AgentVault** | `0x8c13bb7d29feb35ed4adb6f8ab031222b1711641` |
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

### POST /api/cdr/store
Encrypt and store memory via CDR threshold encryption.
```json
{ "content": "...", "walletAddress": "0x...", "readConditionData": "0x..." }
// → { "success": true, "uuid": "4936", "txHash": "0x..." }
```

### POST /api/cdr/recall
Decrypt memory from CDR vault via validator partial decryptions.
```json
{ "uuid": 4936, "walletAddress": "0x...", "licenseTokenIds": ["..."] }
// → { "success": true, "content": "...", "txHash": "0x..." }
```

### POST /api/llm/chat
Anthropic Sonnet 3.5 inference.
```json
{ "message": "...", "context": { "agentName": "...", "history": [...] } }
// → { "success": true, "content": "..." }
```

### POST /api/story/setup
Full Story Protocol setup: mint NFT → register IP Asset → attach license terms → mint license token.
```json
{ "walletAddress": "0x..." }
// → { "success": true, "ipId": "0x...", "licenseTokenId": "68084", "readConditionData": "0x..." }
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

Create `.env.local`:

```bash
# RPC
RPC_URL=https://aeneid.storyrpc.io
STORY_API_URL=http://172.192.41.96:1317

# Server signer (for CDR + Story transactions)
WALLET_PRIVATE_KEY=0x...

# LLM
LLM_API_KEY=sk-ant-...
LLM_API_URL=https://api.anthropic.com/v1
LLM_MODEL=claude-sonnet-4-20250514
```

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
