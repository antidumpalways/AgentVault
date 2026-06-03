export const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
export const STORY_API_URL = process.env.STORY_API_URL || "https://aeneid.storyapi.dev";
export const CHAIN_ID = 1315;

// Story Protocol constants — single source of truth for the frontend.
// Any change to a contract address or license term here propagates everywhere.
export const LICENSE_TERMS_ID = 2054;

export const CONTRACTS = {
  // AgentVault — the project-owned registry + atomic agent/memory creation.
  // Redeployed 2026-06-04 with createAgentAndStoreMemory() + registry functions.
  AGENT_VAULT: "0xa2adbd7988e1e51218f3df1b64217c313e122ecb",
  // Story Protocol shared modules
  IP_ASSET_REGISTRY: "0x77319B4031e6eF1250907aa00018B8B1c67a244b",
  LICENSING_MODULE: "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f",
  PIL_TEMPLATE: "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316",
  LICENSE_TOKEN: "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC",
  OWNER_WRITE_CONDITION: "0x4C9bFC96d7092b590D497A191826C3dA2277c34B",
  LICENSE_READ_CONDITION: "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3",
  SIMPLE_NFT: "0x6ceb4c8882a74532754363aa8662cc2d0166ff89",
  // CDR precompiles on Aeneid
  DKG: "0xCcCcCC0000000000000000000000000000000004",
  CDR: "0xCcCcCC0000000000000000000000000000000005",
  ROYALTY_MODULE: "0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086",
  WIP: "0x1514000000000000000000000000000000000000",
};

// Story Protocol Aeneid testnet faucets.
// Ordered by reliability for end users (no Gitcoin Passport, no signup, no tweet).
// 0.1 IP covers ~1 spawn (4-5 user-signed ownership txs + 1 CDR tx).
export const FAUCET_URLS = {
  primary: "https://faucet.astrostake.xyz/story-aeneid",
  quicknode: "https://faucet.quicknode.com/story/aeneid",
  official: "https://aeneid.faucet.story.foundation/",
};

export const EXPLORER_URL = "https://aeneid.storyscan.io";
