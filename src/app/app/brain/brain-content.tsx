"use client";

import { useState } from "react";
import { useAppStore } from "@/hooks/useAppStore";
import { useWallet } from "@/hooks/useWallet";
import { recallEncryptedMemory, getUserAgentsOnChain, checkAccessOnChain } from "@/hooks/useCDRClient";
import { showToast } from "@/components/Toast";

export default function BrainContent() {
  const [uuid, setUuid] = useState("");
  const [foundMemories, setFoundMemories] = useState<{ role: string; content: string; agentName: string; createdAt: string }[]>([]);
  const [isRecalling, setIsRecalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [onChainIds, setOnChainIds] = useState<number[]>([]);
  const { memories, agents, loaded } = useAppStore();
  const { address, isConnected } = useWallet();

  const availableUuids = Array.from(new Set(memories.map((m) => m.uuid)));

  const loadOnChain = async () => {
    if (!address) return;
    try {
      setLogs(["[CONTRACT] Fetching on-chain agents..."]);
      const ids = await getUserAgentsOnChain(address);
      setOnChainIds(ids);
      setLogs((p) => [...p, `[CONTRACT] Found ${ids.length} on-chain agent(s): [${ids.join(", ")}]`]);
    } catch {
      setLogs((p) => [...p, "[CONTRACT] No on-chain agents found"]);
    }
  };

  const handleRecall = async () => {
    if (!uuid.trim()) return;
    setIsRecalling(true);
    setFoundMemories([]);
    try {
      setLogs(["[CDR] Submitting read request..."]);

      const agent = agents.find((a) => a.uuid === uuid.trim());
      if (agent?.licenseTokenId && address) {
        try {
          setLogs((p) => [...p, "[CDR] Using license token #" + agent.licenseTokenId + "..."]);
          const { content } = await recallEncryptedMemory(parseInt(uuid), address, [agent.licenseTokenId]);
          setLogs((p) => [...p, "[CDR] ✓ Decrypted from blockchain"]);
          const found = memories.filter((m) => m.uuid === uuid.trim());
          setFoundMemories(found.length > 0 ? found : [{ role: "agent", content, agentName: agent.name, createdAt: new Date().toISOString() }]);
          showToast("Decrypted from blockchain", undefined, "success");
        } catch {
          setLogs((p) => [...p, "[CDR] Blockchain recall failed, reading from local vault..."]);
          const found = memories.filter((m) => m.uuid === uuid.trim());
          setFoundMemories(found);
          showToast(`Decrypted ${found.length} memories (local)`, undefined, "success");
        }
      } else {
        setLogs((p) => [...p, "[CDR] Reading from local vault..."]);
        await new Promise((r) => setTimeout(r, 300));
        const found = memories.filter((m) => m.uuid === uuid.trim());
        setFoundMemories(found);
        if (found.length > 0) {
          setLogs((p) => [...p, `[CDR] ✓ Decrypted ${found.length} memory(ies)`]);
          showToast(`Decrypted ${found.length} memories`, undefined, "success");
        } else {
          setLogs((p) => [...p, "[CDR] No memories found for this UUID"]);
          showToast("No memories found", undefined, "error");
        }
      }
    } catch (error: unknown) {
      const msg = (error as Error)?.message || "Failed";
      setLogs((p) => [...p, `[ERROR] ${msg}`]);
      showToast(msg, undefined, "error");
    } finally {
      setIsRecalling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">BRAIN</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">
            {loaded ? `${availableUuids.length} LOCAL VAULT(S) · ${onChainIds.length} ON-CHAIN AGENT(S)` : 'LOADING...'}
          </p>
        </div>
        {isConnected && (
          <button
            onClick={loadOnChain}
            className="font-mono text-[11px] tracking-widest border border-[#1e1e1e] text-[#5a5a5a] px-4 h-9 hover:border-[#00d9ff]/50 hover:text-[#f2ede6] transition-colors"
          >
            LOAD ON-CHAIN
          </button>
        )}
      </div>

      {/* Recall Form */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-8">
        <div className="space-y-5">
          <div>
            <label className="block font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">VAULT UUID</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder="e.g., 4901"
                className="flex-1 bg-[#050505] border border-[#1e1e1e] px-4 py-3 font-mono text-sm text-[#f2ede6] placeholder:text-[#3a3a3a] focus:border-[#00d9ff] focus:outline-none transition-colors"
              />
              <button
                onClick={handleRecall}
                disabled={isRecalling || !uuid.trim()}
                className="bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest px-6 hover:bg-[#00e6ff] transition-colors font-semibold disabled:opacity-30"
              >
                {isRecalling ? "DECRYPTING..." : "RECALL"}
              </button>
            </div>
          </div>

          {/* Quick Select */}
          {loaded && availableUuids.length > 0 && (
            <div>
              <label className="block font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">LOCAL VAULTS</label>
              <div className="flex flex-wrap gap-2">
                {availableUuids.map((u) => {
                  const count = memories.filter((m) => m.uuid === u).length;
                  return (
                    <button
                      key={u}
                      onClick={() => setUuid(u)}
                      className={`font-mono text-[10px] px-3 py-1.5 border transition-colors ${
                        uuid === u
                          ? 'bg-[#00d9ff] text-[#0a0e27] border-[#00d9ff]'
                          : 'border-[#1e1e1e] text-[#5a5a5a] hover:border-[#00d9ff]/50 hover:text-[#f2ede6]'
                      }`}
                    >
                      UUID: {u} ({count} mem)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* On-Chain Agents */}
          {onChainIds.length > 0 && (
            <div>
              <label className="block font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">ON-CHAIN AGENTS (AGENTVAULT)</label>
              <div className="flex flex-wrap gap-2">
                {onChainIds.map((id) => (
                  <div key={id} className="font-mono text-[10px] px-3 py-1.5 border border-[#1e1e1e] text-[#5a5a5a]">
                    Agent #{id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-[#050505] border border-[#1e1e1e] p-4">
              <div className="font-mono text-[10px] space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={
                    log.includes("ERROR") ? "text-[#f87171]"
                      : log.includes("✓") ? "text-[#22c55e]"
                        : log.includes("CONTRACT") ? "text-[#a78bfa]"
                          : "text-[#5a5a5a]"
                  }>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decrypted Memories */}
          {foundMemories.length > 0 && (
            <div className="space-y-3">
              {foundMemories.map((mem, i) => (
                <div key={i} className="border border-[#00d9ff]/30 bg-[#050505] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      <span className="font-mono text-[10px] text-[#00d9ff] tracking-widest">DECRYPTED</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-[#3a3a3a]">
                        {mem.role.toUpperCase()}
                      </span>
                      <span className="font-mono text-[9px] text-[#5a5a5a]">
                        {new Date(mem.createdAt).toLocaleTimeString("en-US", { hour12: false })}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-sm text-[#5a5a5a] leading-relaxed whitespace-pre-wrap">{mem.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
