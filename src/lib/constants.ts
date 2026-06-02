export const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
export const STORY_API_URL = process.env.STORY_API_URL || "https://aeneid.storyapi.dev";
export const CHAIN_ID = 1315;

// Story Protocol Aeneid testnet faucets.
// Both require Gitcoin Passport verification — there is no automated API.
// User must visit one of these in a browser to claim testnet IP.
export const FAUCET_URLS = {
  official: "https://aeneid.faucet.story.foundation/",
  legacy: "https://faucet.story.foundation/",
  quicknode: "https://faucet.quicknode.com/story/testnet",
};

export const EXPLORER_URL = "https://aeneid.storyscan.io";

export const CONTRACTS = {
  AGENT_VAULT: "0x7e0f1182c444ba420a1d98c81c2da05bc4d1b0a8",
  OWNER_WRITE_CONDITION: "0x4C9bFC96d7092b590D497A191826C3dA2277c34B",
  LICENSE_READ_CONDITION: "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3",
  LICENSE_TOKEN: "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC",
  DKG: "0xCcCcCC0000000000000000000000000000000004",
  CDR: "0xCcCcCC0000000000000000000000000000000005",
  ROYALTY_MODULE: "0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086",
  WIP: "0x1514000000000000000000000000000000000000",
};
