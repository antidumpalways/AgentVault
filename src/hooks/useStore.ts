"use client";

import { useState, useEffect, useCallback } from "react";

export interface Agent {
  id: string;
  name: string;
  uuid: string;
  txHash: string;
  createdAt: string;
  memoryCount: number;
  ipId?: string;
  licenseTokenId?: string;
  agentId?: number;
  agentVaultTxHash?: string;
}

export interface Memory {
  id: string;
  agentId: string;
  agentName: string;
  uuid: string;
  txHash: string;
  content: string;
  role: "user" | "agent";
  createdAt: string;
}

export interface GrantedLicense {
  id: string;
  agentId: string;
  agentName: string;
  ipId: string;
  granteeAddress: string;
  licenseTokenId: string;
  txHash: string;
  grantedAt: string;
}

export interface MarketListing {
  id: string;
  title: string;
  description: string;
  agentId?: string;
  agentName: string;
  ipId: string;
  priceIp: string;
  type: "decision" | "insight" | "conversation";
  createdAt: string;
  // True when the listing was created by the user (real on-chain IP).
  // False when the listing is demo/dummy data with a mock IP.
  isUserListing: boolean;
  sales: number;
  rating: number;
}

interface StoreData {
  agents: Agent[];
  memories: Memory[];
  grantedLicenses: GrantedLicense[];
  marketListings: MarketListing[];
}

const STORAGE_KEY = "agentvault_store";

function loadStore(): StoreData {
  if (typeof window === "undefined") return { agents: [], memories: [], grantedLicenses: [], marketListings: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { agents: [], memories: [], grantedLicenses: [], marketListings: [] };
    const parsed = JSON.parse(raw);
    return {
      agents: parsed.agents || [],
      memories: parsed.memories || [],
      grantedLicenses: parsed.grantedLicenses || [],
      marketListings: parsed.marketListings || [],
    };
  } catch {
    return { agents: [], memories: [], grantedLicenses: [], marketListings: [] };
  }
}

function saveStore(data: StoreData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStore() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [grantedLicenses, setGrantedLicenses] = useState<GrantedLicense[]>([]);
  const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadStore();
    setAgents(data.agents);
    setMemories(data.memories);
    setGrantedLicenses(data.grantedLicenses);
    setMarketListings(data.marketListings);
    setLoaded(true);
  }, []);

  const addAgent = useCallback((agent: Agent) => {
    setAgents((prev) => {
      const next = [...prev, agent];
      const data = loadStore();
      saveStore({ agents: next, memories: data.memories, grantedLicenses: data.grantedLicenses, marketListings: data.marketListings });
      return next;
    });
  }, []);

  const addMemory = useCallback((memory: Memory) => {
    setMemories((prev) => {
      const next = [...prev, memory];
      const data = loadStore();
      saveStore({ agents: data.agents, memories: next, grantedLicenses: data.grantedLicenses, marketListings: data.marketListings });
      return next;
    });
    setAgents((prev) => {
      const next = prev.map((a) =>
        a.id === memory.agentId ? { ...a, memoryCount: a.memoryCount + 1 } : a
      );
      const data = loadStore();
      saveStore({ agents: next, memories: data.memories, grantedLicenses: data.grantedLicenses, marketListings: data.marketListings });
      return next;
    });
  }, []);

  const addGrantedLicense = useCallback((license: GrantedLicense) => {
    setGrantedLicenses((prev) => {
      const next = [...prev, license];
      const data = loadStore();
      saveStore({ agents: data.agents, memories: data.memories, grantedLicenses: next, marketListings: data.marketListings });
      return next;
    });
  }, []);

  const removeGrantedLicense = useCallback((id: string) => {
    setGrantedLicenses((prev) => {
      const next = prev.filter((l) => l.id !== id);
      const data = loadStore();
      saveStore({ agents: data.agents, memories: data.memories, grantedLicenses: next, marketListings: data.marketListings });
      return next;
    });
  }, []);

  const addMarketListing = useCallback((listing: MarketListing) => {
    setMarketListings((prev) => {
      const next = [listing, ...prev];
      const data = loadStore();
      saveStore({ agents: data.agents, memories: data.memories, grantedLicenses: data.grantedLicenses, marketListings: next });
      return next;
    });
  }, []);

  const removeMarketListing = useCallback((id: string) => {
    setMarketListings((prev) => {
      const next = prev.filter((l) => l.id !== id);
      const data = loadStore();
      saveStore({ agents: data.agents, memories: data.memories, grantedLicenses: data.grantedLicenses, marketListings: next });
      return next;
    });
  }, []);

  // Export everything to JSON. Returns a Blob the caller can save via URL.createObjectURL.
  // The encrypted on-chain UUIDs are preserved so a fresh device can re-decrypt via the
  // CDR recall flow using a license token granted by the IP owner.
  const exportJson = useCallback((): { blob: Blob; filename: string } => {
    const data = loadStore();
    const payload = {
      schema: "agentvault-export-v1",
      exportedAt: new Date().toISOString(),
      counts: {
        agents: data.agents.length,
        memories: data.memories.length,
        grantedLicenses: data.grantedLicenses.length,
      },
      agents: data.agents,
      memories: data.memories,
      grantedLicenses: data.grantedLicenses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const filename = `agentvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    return { blob, filename };
  }, []);

  // Import a JSON payload previously produced by exportJson().
  // Returns { added: { agents, memories, grantedLicenses }, skipped } — IDs that
  // already exist locally are skipped (de-dupe by `id`).
  const importJson = useCallback((raw: unknown): {
    added: { agents: number; memories: number; grantedLicenses: number };
    skipped: { agents: number; memories: number; grantedLicenses: number };
    error?: string;
  } => {
    try {
      if (!raw || typeof raw !== "object") {
        return { added: { agents: 0, memories: 0, grantedLicenses: 0 }, skipped: { agents: 0, memories: 0, grantedLicenses: 0 }, error: "Invalid JSON: not an object" };
      }
      const payload = raw as Partial<{
        schema: string;
        agents: Agent[];
        memories: Memory[];
        grantedLicenses: GrantedLicense[];
      }>;
      if (payload.schema && payload.schema !== "agentvault-export-v1") {
        return { added: { agents: 0, memories: 0, grantedLicenses: 0 }, skipped: { agents: 0, memories: 0, grantedLicenses: 0 }, error: `Unsupported schema: ${payload.schema}` };
      }
      const incomingAgents = Array.isArray(payload.agents) ? payload.agents : [];
      const incomingMemories = Array.isArray(payload.memories) ? payload.memories : [];
      const incomingLicenses = Array.isArray(payload.grantedLicenses) ? payload.grantedLicenses : [];

      const data = loadStore();
      const existingAgentIds = new Set(data.agents.map((a) => a.id));
      const existingMemoryIds = new Set(data.memories.map((m) => m.id));
      const existingLicenseIds = new Set(data.grantedLicenses.map((l) => l.id));

      const newAgents = incomingAgents.filter((a) => a && a.id && !existingAgentIds.has(a.id));
      const newMemories = incomingMemories.filter((m) => m && m.id && !existingMemoryIds.has(m.id));
      const newLicenses = incomingLicenses.filter((l) => l && l.id && !existingLicenseIds.has(l.id));

      if (newAgents.length === 0 && newMemories.length === 0 && newLicenses.length === 0) {
        return {
          added: { agents: 0, memories: 0, grantedLicenses: 0 },
          skipped: { agents: incomingAgents.length, memories: incomingMemories.length, grantedLicenses: incomingLicenses.length },
        };
      }

      const merged: StoreData = {
        agents: [...data.agents, ...newAgents],
        memories: [...data.memories, ...newMemories],
        grantedLicenses: [...data.grantedLicenses, ...newLicenses],
        marketListings: data.marketListings,
      };
      saveStore(merged);

      // Also reflect into React state
      setAgents(merged.agents);
      setMemories(merged.memories);
      setGrantedLicenses(merged.grantedLicenses);

      return {
        added: { agents: newAgents.length, memories: newMemories.length, grantedLicenses: newLicenses.length },
        skipped: {
          agents: incomingAgents.length - newAgents.length,
          memories: incomingMemories.length - newMemories.length,
          grantedLicenses: incomingLicenses.length - newLicenses.length,
        },
      };
    } catch (e) {
      return {
        added: { agents: 0, memories: 0, grantedLicenses: 0 },
        skipped: { agents: 0, memories: 0, grantedLicenses: 0 },
        error: (e as Error)?.message || "Import failed",
      };
    }
  }, []);

  // Export memories to CSV. Useful for spreadsheet analysis / archival.
  const exportCsv = useCallback((): { blob: Blob; filename: string } => {
    const data = loadStore();
    const rows = [
      ["agentName", "agentId", "role", "content", "uuid", "txHash", "createdAt"].join(","),
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`;
    for (const m of data.memories) {
      rows.push(
        [m.agentName, m.agentId, m.role, m.content, m.uuid, m.txHash, m.createdAt]
          .map((v) => escape(String(v ?? "")))
          .join(",")
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const filename = `agentvault-memories-${new Date().toISOString().slice(0, 10)}.csv`;
    return { blob, filename };
  }, []);

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const getAgentMemories = useCallback(
    (agentId: string) => memories.filter((m) => m.agentId === agentId),
    [memories]
  );

  const totalMemories = memories.length;
  const totalAgents = agents.length;
  const totalSizeKB = memories.reduce((acc, m) => acc + new Blob([m.content]).size / 1024, 0);

  const memoriesByType = {
    user: memories.filter((m) => m.role === "user").length,
    agent: memories.filter((m) => m.role === "agent").length,
  };

  const memoriesByDay = (() => {
    const map: Record<string, number> = {};
    memories.forEach((m) => {
      const day = m.createdAt.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  })();

  return {
    agents,
    memories,
    grantedLicenses,
    marketListings,
    loaded,
    addAgent,
    addMemory,
    addGrantedLicense,
    removeGrantedLicense,
    addMarketListing,
    removeMarketListing,
    getAgentMemories,
    exportJson,
    importJson,
    exportCsv,
    triggerDownload,
    totalMemories,
    totalAgents,
    totalSizeKB,
    memoriesByType,
    memoriesByDay,
  };
}
