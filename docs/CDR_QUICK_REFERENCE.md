# CDR Quick Reference

> Based on official CDR Skill: https://github.com/jacob-tucker/cdr-skill

## Essential Imports

```typescript
import { CDRClient, initWasm, uuidToLabel } from "@piplabs/cdr-sdk";
import { createPublicClient, createWalletClient, http, toHex, encodeAbiParameters } from "viem";
```

## Setup Pattern

```typescript
// 1. Initialize WASM ONCE at startup
await initWasm();

// 2. Create CDRClient
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: "http://172.192.41.96:1317", // Required!
});
```

## Owner-Only Pattern (EOA)

```typescript
// From CDR Skill: Use EOA as condition with skipConditionValidation
const owner = walletClient.account.address;

const { uuid } = await client.uploader.allocate({
  updatable: false,
  writeConditionAddr: "0x4C9bFC96d7092b590D497A191826C3dA2277c34B",
  writeConditionData: encodeAbiParameters([{ type: "address" }], [owner]),
  readConditionAddr: owner, // EOA
  readConditionData: "0x",
  skipConditionValidation: true, // Required for EOA
});

// Encrypt
const globalPubKey = await client.observer.getGlobalPubKey();
const ciphertext = await client.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode("secret"),
  globalPubKey,
  label: uuidToLabel(uuid),
});

// Write
await client.uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ciphertext.raw),
});

// Read
const { dataKey } = await client.consumer.accessCDR({
  uuid,
  accessAuxData: "0x",
  timeoutMs: 120_000,
});
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `wasm not initialized` | Missing `initWasm()` | Call `await initWasm()` first |
| `InvalidConditionContractError` | EOA without skip | Add `skipConditionValidation: true` |
| `read reverts` | Wrong condition type | EOA can't be used with `uploadCDR()` |
| `PartialCollectionTimeout` | Not enough validators | Increase `timeoutMs` |

## Key Rules

1. **Always call `initWasm()` first** - Before any encrypt/decrypt
2. **Use `skipConditionValidation: true`** - When using EOA as condition
3. **`apiUrl` is required** - For DKG state reads
4. **Inline data max 1024 bytes** - Use `uploadFile()` for larger data
5. **`timeoutMs: 120_000`** - Good starting point for partial collection

## Deployed Contracts (Aeneid)

| Contract | Address |
|----------|---------|
| OwnerWriteCondition | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` |
| LicenseReadCondition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` |
| LicenseToken | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` |
| DKG | `0xCcCcCC0000000000000000000000000000000004` |
| CDR | `0xCcCcCC0000000000000000000000000000000005` |

## Resources

- [CDR SDK Docs](https://docs.story.foundation/developers/cdr-sdk/overview)
- [CDR Skill](https://github.com/jacob-tucker/cdr-skill)
- [Live Demo](https://usecdr.dev/)
- [Discord](https://discord.gg/storybuilders)
