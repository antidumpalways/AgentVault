"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/hooks/useAppStore";
import { storeEncryptedMemory } from "@/hooks/useCDRClient";
import { showToast } from "@/components/Toast";
import { FAUCET_URLS, EXPLORER_URL } from "@/lib/constants";

interface CreatedAgent {
  name: string;
  uuid: string;
  txHash: string;
  createdAt: string;
}

const steps = [
  { id: 0, label: "WALLET" },
  { id: 1, label: "STORY PROTOCOL" },
  { id: 2, label: "CDR ENCRYPT" },
];

export default function SpawnContent() {
  const [agentName, setAgentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [balance, setBalance] = useState<{ balanceIp: string; hasSufficientFunds: boolean; requiredIp: string } | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [dripping, setDripping] = useState(false);
  const [dripTxHash, setDripTxHash] = useState<string | null>(null);
  const { address, isConnected, connect } = useWallet();
  const { addAgent } = useAppStore();

  // Check user's IP balance when wallet connects. They need ~0.05 IP to cover
  // 4 on-chain txs (mint, register, attachLicense, mintLicense).
  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      setCheckingBalance(true);
      try {
        const res = await fetch("/api/wallet/balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setBalance({ balanceIp: data.balanceIp, hasSufficientFunds: data.hasSufficientFunds, requiredIp: data.requiredIp });
        }
      } catch (e) {
        console.warn("Balance check failed:", e);
      } finally {
        if (!cancelled) setCheckingBalance(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [address]);

  const handleRecheckBalance = async () => {
    if (!address) return;
    setCheckingBalance(true);
    try {
      const res = await fetch("/api/wallet/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance({ balanceIp: data.balanceIp, hasSufficientFunds: data.hasSufficientFunds, requiredIp: data.requiredIp });
        if (data.hasSufficientFunds) showToast("Balance sufficient", undefined, "success");
      }
    } catch {
      // silent
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleDrip = async () => {
    if (!address || dripping) return;
    setDripping(true);
    setDripTxHash(null);
    try {
      const res = await fetch("/api/wallet/drip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        setDripTxHash(data.txHash);
        showToast(`Sent ${data.amountIp} IP — wait 3s, then RECHECK`, data.txHash, "success");
        setTimeout(() => handleRecheckBalance(), 4000);
      } else if (res.status === 503 && data.faucets) {
        showToast("In-app drip offline — use external faucet below", undefined, "error");
      } else {
        showToast(data.error || "Drip failed", undefined, "error");
      }
    } catch (e) {
      showToast("Drip request failed", undefined, "error");
    } finally {
      setDripping(false);
    }
  };

  const stepStatus = (i: number) => {
    if (isConnected && i === 0) return "done";
    if (step > i) return "done";
    if (step === i) return "active";
    return "idle";
  };

  const handleSpawn = async () => {
    if (!agentName.trim() || !address) return;
    if (balance && !balance.hasSufficientFunds) {
      showToast("Insufficient IP balance. Get testnet IP from faucet first.", undefined, "error");
      return;
    }
    setIsCreating(true);
    setLogs([]);
    try {
      setStep(1);
      setLogs(["[STORY] Registering IP Asset on Story Protocol..."]);
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
      const { uuid, txHash } = await storeEncryptedMemory(initialMemory, address);
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

  const insufficientBalance = balance !== null && !balance.hasSufficientFunds;

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
              <button type="button" onClick={connect} className="w-full bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 hover:bg-[#00e6ff] transition-colors font-semibold">
                CONNECT WALLET
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-4 py-3 bg-[#050505] border border-[#1e1e1e]">
                  <div className={`w-1.5 h-1.5 rounded-full ${balance?.hasSufficientFunds ? "bg-[#22c55e]" : "bg-[#f87171]"}`} />
                  <span className="font-mono text-[10px] text-[#5a5a5a]">{address}</span>
                  <span className="ml-auto font-mono text-[10px] text-[#3a3a3a]">
                    {checkingBalance ? "CHECKING..." : balance ? `${parseFloat(balance.balanceIp).toFixed(4)} IP` : "—"}
                  </span>
                </div>

                {insufficientBalance && balance && (
                  <div className="border border-[#f87171]/30 bg-[#f87171]/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="mt-0.5 shrink-0">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div className="font-mono text-[10px] text-[#f87171] space-y-1">
                        <p>INSUFFICIENT IP BALANCE — you need at least {balance.requiredIp} IP to cover 4 setup transactions (mint NFT, register IP, attach license, mint license token).</p>
                        <p className="text-[#5a5a5a]">Click DRIP TESTNET IP to receive 0.5 IP instantly (covers ~500 spawns). One drip per wallet per hour.</p>
                        {dripTxHash && (
                          <p className="text-[#22c55e]">
                            ✓ Drip sent: {dripTxHash.slice(0, 14)}...{dripTxHash.slice(-6)} — auto-rechecking in 4s
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleDrip} disabled={dripping} className="font-mono text-[10px] tracking-widest bg-[#f87171] text-[#0a0e27] px-4 py-2 hover:bg-[#fca5a5] transition-colors font-semibold disabled:opacity-30 disabled:cursor-not-allowed">
                        {dripping ? "SENDING IP..." : "DRIP TESTNET IP →"}
                      </button>
                      <button type="button" onClick={handleRecheckBalance} disabled={checkingBalance} className="font-mono text-[10px] tracking-widest border border-[#1e1e1e] text-[#5a5a5a] px-4 py-2 hover:border-[#00d9ff]/50 hover:text-[#f2ede6] transition-colors disabled:opacity-30">
                        {checkingBalance ? "CHECKING..." : "RECHECK"}
                      </button>
                    </div>
                    <div className="border-t border-[#f87171]/20 pt-3 mt-1 space-y-2">
                      <p className="font-mono text-[9px] text-[#5a5a5a] tracking-widest">OR — GET TESTNET IP FROM AN EXTERNAL FAUCET:</p>
                      <div className="flex flex-wrap gap-2">
                        <a href={FAUCET_URLS.primary} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-4 py-2 hover:bg-[#00e6ff] transition-colors font-semibold">
                          ASTROSTAKE · 1 IP → {address?.slice(0, 6)}...
                        </a>
                        <a href={FAUCET_URLS.quicknode} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] tracking-widest border border-[#1e1e1e] text-[#5a5a5a] px-4 py-2 hover:border-[#00d9ff]/50 hover:text-[#f2ede6] transition-colors">
                          QUICKNODE
                        </a>
                        <a href={FAUCET_URLS.official} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] tracking-widest border border-[#1e1e1e] text-[#5a5a5a] px-4 py-2 hover:border-[#00d9ff]/50 hover:text-[#f2ede6] transition-colors">
                          STORY OFFICIAL
                        </a>
                      </div>
                    </div>
                  </div>
                )}
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
                disabled={isCreating || !isConnected || insufficientBalance}
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
              type="button"
              onClick={handleSpawn}
              disabled={isCreating || !agentName.trim() || !isConnected || insufficientBalance}
              className="w-full bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 hover:bg-[#00e6ff] transition-colors font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isCreating ? "CREATING..." : insufficientBalance ? "NEED MORE IP — VISIT FAUCET" : "SPAWN AGENT"}
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
                <a href={`${EXPLORER_URL}/tx/${createdAgent.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff] transition-colors">
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
