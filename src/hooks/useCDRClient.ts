"use client";

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

export async function getUserAgentsOnChain(walletAddress: string): Promise<number[]> {
  const response = await fetch("/api/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getUserAgents", userAddress: walletAddress }),
  });

  if (!response.ok) throw new Error("Failed to get agents");
  const result = await response.json();
  return result.agents;
}

export async function checkAccessOnChain(agentId: number, userAddress: string): Promise<boolean> {
  const response = await fetch("/api/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "checkAccess", agentId, userAddress }),
  });

  if (!response.ok) throw new Error("Failed to check access");
  const result = await response.json();
  return result.hasAccess;
}
