"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/hooks/useAppStore";
import { storeEncryptedMemory } from "@/hooks/useCDRClient";
import { showToast } from "@/components/Toast";

interface CreatedAgent {
  name: string;
  uuid: string;
  txHash: string;
  createdAt: string;
}

const steps = [
  { id: 0, label: "WALLET" },
  { id: 1, label: "ENCRYPT" },
  { id: 2, label: "STORE" },
];

export default function SpawnContent() {
  const [agentName, setAgentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { address, isConnected, connect } = useWallet();
  const { addAgent } = useAppStore();

  const stepStatus = (i: number) => {
    if (isConnected && i === 0) return "done";
    if (step > i) return "done";
    if (step === i) return "active";
    return "idle";
  };

  const handleSpawn = async () => {
    if (!agentName.trim() || !address) return;
    setIsCreating(true);
    setLogs([]);
    try {
      setStep(1);
      setLogs(["[STORY] Registering IP Asset..."]);
      const storyRes = await fetch("/api/story/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const storyData = await storyRes.json();
      if (!storyData.success) throw new Error(storyData.error || "Story setup failed");
      setLogs((p) => [...p, `[STORY] IP: ${storyData.ipId?.slice(0, 14)}...`, `[STORY] License Token: #${storyData.licenseTokenId}`]);

      setLogs((p) => [...p, "[CDR] Initializing threshold encryption..."]);
      const initialMemory = `I am ${agentName}, created on ${new Date().toISOString()}.`;
      const { uuid, txHash } = await storeEncryptedMemory(initialMemory, address, storyData.readConditionData);
      setStep(2);
      setLogs((p) => [...p, `[CDR] Vault UUID: ${uuid}`, `[CDR] File: agent-${uuid}.md`, `[CDR] Tx: ${txHash.slice(0, 14)}...`]);
      const agentData = {
        id: `agent-${uuid}`, name: agentName, uuid, txHash,
        createdAt: new Date().toISOString(), memoryCount: 1,
        ipId: storyData.ipId, licenseTokenId: storyData.licenseTokenId,
      };
      setCreatedAgent({ name: agentName, uuid, txHash, createdAt: agentData.createdAt });
      addAgent(agentData);
      showToast(`Agent "${agentName}" created`, txHash, "success");
    } catch (error: unknown) {
      const msg = (error as Error)?.message || "Failed";
      setLogs((p) => [...p, `[ERROR] ${msg}`]);
      showToast(msg, undefined, "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">SPAWN AGENT</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">CREATE A NEW ENCRYPTED AI AGENT</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 flex items-center justify-center text-[10px] font-mono ${
                stepStatus(i) === "done"
                  ? "bg-[#00d9ff] text-[#0a0e27]"
                  : stepStatus(i) === "active"
                    ? "bg-[#f2ede6] text-[#0a0e27]"
                    : "bg-[#0e0e0e] text-[#3a3a3a] border border-[#1e1e1e]"
              }`}>
                {stepStatus(i) === "done" ? "✓" : s.id + 1}
              </div>
              <span className={`font-mono text-[10px] tracking-widest ${
                stepStatus(i) === "idle" ? "text-[#3a3a3a]" : "text-[#f2ede6]"
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-[#1e1e1e]" />}
          </div>
        ))}
      </div>

      {/* Form / Result */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-8">
        {!createdAgent ? (
          <div className="space-y-5">
            {!isConnected ? (
              <button onClick={connect} className="w-full bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 hover:bg-[#00e6ff] transition-colors font-semibold">
                CONNECT WALLET
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-[#050505] border border-[#1e1e1e]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                <span className="font-mono text-[10px] text-[#5a5a5a]">{address}</span>
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">AGENT NAME</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., Research Agent Alpha"
                className="w-full bg-[#050505] border border-[#1e1e1e] px-4 py-3 font-mono text-sm text-[#f2ede6] placeholder:text-[#3a3a3a] focus:border-[#00d9ff] focus:outline-none transition-colors"
                disabled={isCreating || !isConnected}
              />
            </div>

            {logs.length > 0 && (
              <div className="bg-[#050505] border border-[#1e1e1e] p-4">
                <div className="font-mono text-[10px] space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className={log.includes("ERROR") ? "text-[#f87171]" : "text-[#5a5a5a]"}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSpawn}
              disabled={isCreating || !agentName.trim() || !isConnected}
              className="w-full bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 hover:bg-[#00e6ff] transition-colors font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isCreating ? "CREATING..." : "SPAWN AGENT"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00d9ff] flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0e27" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <h2 className="font-display text-lg text-[#f2ede6]">AGENT CREATED</h2>
                <p className="font-mono text-[10px] text-[#5a5a5a]">{createdAgent.name}</p>
              </div>
            </div>

            <div className="bg-[#050505] border border-[#1e1e1e] p-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">UUID</span>
                <span className="font-mono text-[10px] text-[#f2ede6]">{createdAgent.uuid}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">STATUS</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  <span className="font-mono text-[10px] text-[#22c55e]">ENCRYPTED</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">TX</span>
                <a href={`https://aeneid.storyscan.io/tx/${createdAgent.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff] transition-colors">
                  {createdAgent.txHash.slice(0, 10)}...→
                </a>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">FILE</span>
                <span className="font-mono text-[10px] text-[#5a5a5a]">agent-{createdAgent.uuid}.md</span>
              </div>
            </div>

            <div className="flex gap-3">
              <a href="/app/train" className="flex-1 bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 text-center hover:bg-[#00e6ff] transition-colors font-semibold">TRAIN</a>
              <a href="/app/brain" className="flex-1 border border-[#1e1e1e] text-[#f2ede6] font-mono text-[11px] tracking-widest py-3 text-center hover:border-[#00d9ff]/30 hover:text-[#00d9ff] transition-colors">BRAIN</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
