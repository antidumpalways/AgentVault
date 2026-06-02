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

interface StoreData {
  agents: Agent[];
  memories: Memory[];
}

const STORAGE_KEY = "agentvault_store";

function loadStore(): StoreData {
  if (typeof window === "undefined") return { agents: [], memories: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { agents: [], memories: [] };
    return JSON.parse(raw);
  } catch {
    return { agents: [], memories: [] };
  }
}

function saveStore(data: StoreData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStore() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadStore();
    setAgents(data.agents);
    setMemories(data.memories);
    setLoaded(true);
  }, []);

  const addAgent = useCallback((agent: Agent) => {
    setAgents((prev) => {
      const next = [...prev, agent];
      saveStore({ agents: next, memories: loadStore().memories });
      return next;
    });
  }, []);

  const addMemory = useCallback((memory: Memory) => {
    setMemories((prev) => {
      const next = [...prev, memory];
      saveStore({ agents: loadStore().agents, memories: next });
      return next;
    });
    // Update agent memoryCount
    setAgents((prev) => {
      const next = prev.map((a) =>
        a.id === memory.agentId ? { ...a, memoryCount: a.memoryCount + 1 } : a
      );
      saveStore({ agents: next, memories: loadStore().memories });
      return next;
    });
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
    loaded,
    addAgent,
    addMemory,
    getAgentMemories,
    totalMemories,
    totalAgents,
    totalSizeKB,
    memoriesByType,
    memoriesByDay,
  };
}
