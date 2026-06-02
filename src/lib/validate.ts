export function isValidAddress(addr: unknown): addr is `0x${string}` {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function isNonEmptyString(v: unknown, maxLen: number = 10_000): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

export function isPositiveIntString(v: unknown): v is string {
  return typeof v === "string" && /^\d+$/.test(v) && v !== "0";
}

export function isHexString(v: unknown): v is `0x${string}` {
  return typeof v === "string" && /^0x([a-fA-F0-9]{2})*$/.test(v);
}

export function isValidAgentName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length >= 1 && name.length <= 100;
}
