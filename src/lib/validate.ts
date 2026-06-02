export function isValidAddress(addr: unknown): addr is `0x${string}` {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}
