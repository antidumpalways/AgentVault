"use client";

import { createContext, useContext, ReactNode } from "react";
import { useStore, Agent, Memory } from "@/hooks/useStore";

interface StoreContextType {
  agents: Agent[];
  memories: Memory[];
  loaded: boolean;
  addAgent: (agent: Agent) => void;
  addMemory: (memory: Memory) => void;
  getAgentMemories: (agentId: string) => Memory[];
  totalMemories: number;
  totalAgents: number;
  totalSizeKB: number;
  memoriesByType: { user: number; agent: number };
  memoriesByDay: Record<string, number>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used within StoreProvider");
  return ctx;
}
