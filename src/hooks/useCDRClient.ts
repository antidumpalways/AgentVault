"use client";
// CDR client wrapper functions. Not a React hook despite the file name —
// kept for backward compat with imports across the dashboard.

export async function storeEncryptedMemory(
  content: string,
  walletAddress: string,
  readConditionData?: string
): Promise<{ uuid: string; txHash: string }> {
  const response = await fetch("/api/cdr/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, walletAddress, readConditionData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to store memory");
  }

  const result = await response.json();
  return { uuid: result.uuid, txHash: result.txHash };
}

export async function recallEncryptedMemory(
  uuid: number,
  walletAddress: string,
  licenseTokenIds?: string[]
): Promise<{ content: string; txHash: string }> {
  const response = await fetch("/api/cdr/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid, walletAddress, licenseTokenIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to recall memory");
  }

  const result = await response.json();
  return { content: result.content, txHash: result.txHash };
}

// Returns the on-chain IP Asset IDs owned by the wallet (from the AgentVault
// registry contract). Each entry is the IP Account address as a 0x-prefixed
// hex string. Sorted by registry insertion order.
export async function getUserAgentsOnChain(walletAddress: string): Promise<string[]> {
  const response = await fetch("/api/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getUserIpIds", userAddress: walletAddress }),
  });

  if (!response.ok) throw new Error("Failed to get agents");
  const result = await response.json();
  return (result.ipIds as string[]) || [];
}
