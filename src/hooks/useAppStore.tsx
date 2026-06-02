"use client";

import { createContext, useContext, ReactNode } from "react";
import { useStore, Agent, Memory, GrantedLicense } from "@/hooks/useStore";

interface StoreContextType {
  agents: Agent[];
  memories: Memory[];
  grantedLicenses: GrantedLicense[];
  loaded: boolean;
  addAgent: (agent: Agent) => void;
  addMemory: (memory: Memory) => void;
  addGrantedLicense: (license: GrantedLicense) => void;
  removeGrantedLicense: (id: string) => void;
  getAgentMemories: (agentId: string) => Memory[];
  exportJson: () => { blob: Blob; filename: string };
  exportCsv: () => { blob: Blob; filename: string };
  triggerDownload: (blob: Blob, filename: string) => void;
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
