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
  ipId?: string;
  licenseTokenId?: string;
  agentId?: number;
  agentVaultTxHash?: string;
  storeMemoryTxHash?: string;
  storyMintTx?: string;
  storyRegisterTx?: string;
  storyAttachTx?: string;
  storyMintLicenseTx?: string;
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
      setLogs(["[CDR] Initializing threshold encryption..."]);
      const initialMemory = `I am ${agentName}, created on ${new Date().toISOString()}.`;
      const { uuid, txHash } = await storeEncryptedMemory(initialMemory, address);
      setLogs((p) => [...p, `[CDR] Vault UUID: ${uuid}`, `[CDR] File: agent-${uuid}.md`, `[CDR] Tx: ${txHash.slice(0, 14)}...`]);

      setLogs((p) => [...p, "[STORY] Registering IP Asset on Story Protocol..."]);
      const storyRes = await fetch("/api/story/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, name: agentName, vaultUuid: uuid }),
      });
      const storyData = await storyRes.json();
      if (!storyData.success) throw new Error(storyData.error || "Story setup failed");
      setLogs((p) => [...p, `[STORY] IP: ${storyData.ipId?.slice(0, 14)}...`]);

      // If user is not the deployer, sign the licensing + AgentVault txs client-side.
      // Group 1: Licensing txs (to IP Account — sequential, must go through IP Account proxy)
      // Group 2: createAgent + storeMemory (to AgentVault — batched via EIP-5792 if supported)
      let licenseTokenId = storyData.licenseTokenId;
      let agentId: number | null = storyData.agentId;
      let agentVaultTxHash: string | null = storyData.agentVaultTx;
      let storeMemoryTxHash: string | null = storyData.storeMemoryTx;
      if (storyData.requiresUserSigning && storyData.pendingUserTxs) {
        setLogs((p) => [...p, "[WALLET] 2 prompts ahead: licensing (2 txs) + AgentVault (1-2 txs)..."]);
        const provider = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
        if (!provider) throw new Error("No wallet detected");
        const { createWalletClient, custom, createPublicClient, http, decodeEventLog } = await import("viem");
        const { defineChain } = await import("viem");
        const aeneid = defineChain({ id: 1315, name: "Aeneid", network: "aeneid",
          nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
          rpcUrls: { default: { http: ["https://aeneid.storyrpc.io"] } } });
        const wClient = createWalletClient({ transport: custom(provider as never), chain: aeneid });
        const pub = createPublicClient({ chain: aeneid, transport: http() });
        const [account] = await wClient.requestAddresses();
        if (!account) throw new Error("Wallet returned no account");

        // Verify chain is 1315 before signing — user may have switched chains
        // away from Aeneid after the initial connect() check. If not, force switch.
        const currentChainIdHex = await provider.request({ method: "eth_chainId" }) as string;
        const currentChainId = parseInt(currentChainIdHex, 16);
        if (currentChainId !== 1315) {
          setLogs((p) => [...p, `[WALLET] On chain ${currentChainId} — switching to Aeneid (1315)...`]);
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x523" }],
            });
            const after = await provider.request({ method: "eth_chainId" }) as string;
            if (parseInt(after, 16) !== 1315) {
              throw new Error(`Chain switch did not take effect (still on ${after})`);
            }
            setLogs((p) => [...p, "[WALLET] Switched to Aeneid"]);
          } catch (switchErr: unknown) {
            const code = (switchErr as { code?: number })?.code;
            if (code === 4902) {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: "0x523", chainName: "Aeneid",
                  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
                  rpcUrls: ["https://aeneid.storyrpc.io"],
                  blockExplorerUrls: ["https://aeneid.storyscan.io"],
                }],
              });
            } else {
              throw new Error(`Please switch your wallet to Aeneid testnet (chain 1315). Error: ${(switchErr as Error)?.message || switchErr}`);
            }
          }
        }

        // === PROMPT 1 of 2: Licensing txs (sequential, must go to IP Account) ===
        setLogs((p) => [...p, "[LICENSING] Sign 2 licensing txs..."]);
        const attachHash = await wClient.sendTransaction({
          account, chain: aeneid,
          to: storyData.pendingUserTxs.targets.attachLicenseTerms as `0x${string}`,
          data: storyData.pendingUserTxs.attachLicenseTerms as `0x${string}`,
          value: BigInt(0),
        });
        setLogs((p) => [...p, `[LICENSING] Attach: ${attachHash.slice(0, 14)}...`]);

        const mintLicenseHash = await wClient.sendTransaction({
          account, chain: aeneid,
          to: storyData.pendingUserTxs.targets.mintLicenseTokens as `0x${string}`,
          data: storyData.pendingUserTxs.mintLicenseTokens as `0x${string}`,
          value: BigInt(0),
        });
        setLogs((p) => [...p, `[LICENSING] MintLicense: ${mintLicenseHash.slice(0, 14)}...`]);

        // Look up canonical licenseTokenId
        try {
          const canonical = await pub.readContract({
            address: storyData.pendingUserTxs.licensingModule as `0x${string}`,
            abi: [{ name: "getLicenseTokenId", type: "function", stateMutability: "view",
                    inputs: [{ type: "address", name: "ipId" }, { type: "address", name: "licenseTemplate" }, { type: "uint256", name: "licenseTermsId" }],
                    outputs: [{ type: "uint256" }] }],
            functionName: "getLicenseTokenId",
            args: [storyData.ipId as `0x${string}`,
                   storyData.pendingUserTxs.pilTemplate as `0x${string}`,
                   BigInt(storyData.pendingUserTxs.licenseTermsId)],
          }) as bigint;
          if (canonical > BigInt(0)) {
            licenseTokenId = canonical.toString();
            setLogs((p) => [...p, `[LICENSING] Canonical tokenId: #${licenseTokenId}`]);
          }
        } catch (e) {
          console.warn("getLicenseTokenId lookup failed", e);
        }

        // === PROMPT 2 of 2: AgentVault txs (createAgent + storeMemory) ===
        // Try EIP-5792 wallet_sendCalls for a single batched prompt. If the wallet
        // doesn't support it, fall back to 2 sequential prompts.
        const calls = [
          { to: storyData.pendingUserTxs.targets.createAgent as `0x${string}`,
            data: storyData.pendingUserTxs.createAgent as `0x${string}`, value: "0x0" },
          { to: storyData.pendingUserTxs.targets.storeMemory as `0x${string}`,
            data: storyData.pendingUserTxs.storeMemory as `0x${string}`, value: "0x0" },
        ];
        const agentVaultAddr = storyData.pendingUserTxs.targets.createAgent as `0x${string}`;

        let batchId: string | undefined;
        let usedBatch = false;
        try {
          const caps = await provider.request({
            method: "wallet_getCapabilities",
            params: [account],
          }) as Record<string, { atomicBatch?: { supported: boolean } }> | undefined;
          const supported = !!caps?.["0x523"]?.atomicBatch?.supported;
          if (supported) {
            batchId = await provider.request({
              method: "wallet_sendCalls",
              params: [{
                version: "1.0",
                chainId: "0x523",
                from: account,
                calls,
              }],
            }) as string;
            usedBatch = true;
            setLogs((p) => [...p, "[AGENTVAULT] Batch sent via EIP-5792 — wait for receipts..."]);
            // Wait for the batch to land. wallet_getCallsStatus returns 'success' when all confirmed.
            const deadline = Date.now() + 120_000;
            while (Date.now() < deadline) {
              const status = await provider.request({
                method: "wallet_getCallsStatus",
                params: [batchId],
              }) as { status: number | string; receipts?: Array<{ transactionHash: string }> };
              const code = typeof status.status === "string" ? parseInt(status.status as string, 16) : status.status;
              if (code === 200) {
                const hashes = (status.receipts ?? []).map((r) => r.transactionHash);
                if (hashes[0]) {
                  agentVaultTxHash = hashes[0];
                  setLogs((p) => [...p, `[AGENTVAULT] createAgent: ${hashes[0].slice(0, 14)}...`]);
                }
                if (hashes[1]) {
                  storeMemoryTxHash = hashes[1];
                  setLogs((p) => [...p, `[AGENTVAULT] storeMemory: ${hashes[1].slice(0, 14)}...`]);
                }
                break;
              }
              if (code >= 400) throw new Error(`EIP-5792 batch failed (status ${code})`);
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
        } catch (batchErr) {
          console.warn("EIP-5792 batch unavailable, falling back to sequential:", batchErr);
          usedBatch = false;
        }

        if (!usedBatch) {
          // Fallback: 2 sequential prompts for createAgent + storeMemory
          setLogs((p) => [...p, "[AGENTVAULT] Sign 2 AgentVault txs (EIP-5792 not supported)..."]);
          const createHash = await wClient.sendTransaction({
            account, chain: aeneid,
            to: agentVaultAddr,
            data: storyData.pendingUserTxs.createAgent as `0x${string}`,
            value: BigInt(0),
          });
          agentVaultTxHash = createHash;
          setLogs((p) => [...p, `[AGENTVAULT] createAgent: ${createHash.slice(0, 14)}...`]);

          const storeHash = await wClient.sendTransaction({
            account, chain: aeneid,
            to: storyData.pendingUserTxs.targets.storeMemory as `0x${string}`,
            data: storyData.pendingUserTxs.storeMemory as `0x${string}`,
            value: BigInt(0),
          });
          storeMemoryTxHash = storeHash;
          setLogs((p) => [...p, `[AGENTVAULT] storeMemory: ${storeHash.slice(0, 14)}...`]);
        }

        // Parse agentId from AgentCreated event in the createAgent receipt
        try {
          const txHash = agentVaultTxHash;
          if (txHash) {
            const receipt = await pub.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
            const agentVaultAddress = storyData.pendingUserTxs.agentVault as `0x${string}`;
            for (const log of receipt.logs) {
              if (log.address.toLowerCase() !== agentVaultAddress.toLowerCase()) continue;
              try {
                const decoded = decodeEventLog({
                  abi: [{
                    name: "AgentCreated", type: "event",
                    inputs: [
                      { name: "agentId", type: "uint256", indexed: true },
                      { name: "owner", type: "address", indexed: true },
                      { name: "vaultUuid", type: "uint256", indexed: false },
                    ],
                  }],
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded.eventName === "AgentCreated") {
                  const args = decoded.args as { agentId: bigint; owner: string };
                  agentId = Number(args.agentId);
                  setLogs((p) => [...p, `[AGENTVAULT] Agent #${agentId} created`]);
                  break;
                }
              } catch {
                continue;
              }
            }
          }
        } catch (e) {
          console.warn("agentId parse from receipt failed", e);
        }
      }

      setLogs((p) => [...p, `[STORY] License Token: #${licenseTokenId}`]);

      setStep(2);
      const agentData = {
        id: `agent-${uuid}`, name: agentName, uuid, txHash,
        createdAt: new Date().toISOString(), memoryCount: 1,
        ipId: storyData.ipId, licenseTokenId,
        agentId: agentId ?? undefined,
        agentVaultTxHash: agentVaultTxHash ?? undefined,
      };
      setCreatedAgent({
        name: agentName, uuid, txHash, createdAt: agentData.createdAt,
        ipId: storyData.ipId,
        licenseTokenId: licenseTokenId || undefined,
        agentId: agentId ?? undefined,
        agentVaultTxHash: agentVaultTxHash ?? undefined,
        storeMemoryTxHash: storeMemoryTxHash ?? undefined,
        storyMintTx: storyData.mintTx,
        storyRegisterTx: storyData.registerTx,
        storyAttachTx: storyData.attachTx,
        storyMintLicenseTx: storyData.mintLicenseTx,
      });
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
              <div className="space-y-2">
                <button type="button" onClick={() => connect('bitget')} className="w-full bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 hover:bg-[#00e6ff] transition-colors font-semibold">
                  CONNECT BITGET WALLET
                </button>
                <button type="button" onClick={() => connect('metamask')} className="w-full bg-[#1e1e1e] text-[#f2ede6] font-mono text-[11px] tracking-widest py-3 hover:bg-[#2a2a2a] transition-colors font-semibold">
                  CONNECT METAMASK
                </button>
              </div>
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
                        <p className="text-[#5a5a5a]">Click DRIP TESTNET IP to receive 0.1 IP instantly (covers ~20 spawns). One drip per wallet per hour.</p>
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
              {createdAgent.agentId !== undefined && (
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">AGENT ID</span>
                  <span className="font-mono text-[10px] text-[#a78bfa]">#{createdAgent.agentId}</span>
                </div>
              )}
              {createdAgent.licenseTokenId && createdAgent.licenseTokenId !== "0" && (
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">LICENSE</span>
                  <span className="font-mono text-[10px] text-[#f2ede6]">#{createdAgent.licenseTokenId}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">STATUS</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  <span className="font-mono text-[10px] text-[#22c55e]">ENCRYPTED · 5-6 TXS</span>
                </div>
              </div>
              <div className="border-t border-[#1e1e1e] pt-3 mt-1 space-y-1.5">
                <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest mb-1">ON-CHAIN TRANSACTIONS</div>
                {createdAgent.storyMintTx && (
                  <div className="flex justify-between text-[10px]">
                    <span className="font-mono text-[#5a5a5a]">Mint NFT</span>
                    <a href={`${EXPLORER_URL}/tx/${createdAgent.storyMintTx}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.storyMintTx.slice(0, 10)}...→</a>
                  </div>
                )}
                {createdAgent.storyRegisterTx && (
                  <div className="flex justify-between text-[10px]">
                    <span className="font-mono text-[#5a5a5a]">Register IP</span>
                    <a href={`${EXPLORER_URL}/tx/${createdAgent.storyRegisterTx}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.storyRegisterTx.slice(0, 10)}...→</a>
                  </div>
                )}
                {createdAgent.storyAttachTx && (
                  <div className="flex justify-between text-[10px]">
                    <span className="font-mono text-[#5a5a5a]">Attach License</span>
                    <a href={`${EXPLORER_URL}/tx/${createdAgent.storyAttachTx}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.storyAttachTx.slice(0, 10)}...→</a>
                  </div>
                )}
                {createdAgent.storyMintLicenseTx && (
                  <div className="flex justify-between text-[10px]">
                    <span className="font-mono text-[#5a5a5a]">Mint License</span>
                    <a href={`${EXPLORER_URL}/tx/${createdAgent.storyMintLicenseTx}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.storyMintLicenseTx.slice(0, 10)}...→</a>
                  </div>
                )}
                {createdAgent.agentVaultTxHash && (
                  <div className="flex justify-between text-[10px]">
                    <span className="font-mono text-[#5a5a5a]">CreateAgent</span>
                    <a href={`${EXPLORER_URL}/tx/${createdAgent.agentVaultTxHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.agentVaultTxHash.slice(0, 10)}...→</a>
                  </div>
                )}
                {createdAgent.storeMemoryTxHash && (
                  <div className="flex justify-between text-[10px]">
                    <span className="font-mono text-[#5a5a5a]">StoreMemory</span>
                    <a href={`${EXPLORER_URL}/tx/${createdAgent.storeMemoryTxHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.storeMemoryTxHash.slice(0, 10)}...→</a>
                  </div>
                )}
                <div className="flex justify-between text-[10px] pt-1 border-t border-[#1e1e1e]/50">
                  <span className="font-mono text-[#5a5a5a]">CDR Write</span>
                  <a href={`${EXPLORER_URL}/tx/${createdAgent.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#00d9ff] hover:text-[#00e6ff]">{createdAgent.txHash.slice(0, 10)}...→</a>
                </div>
              </div>
              <div className="flex justify-between pt-1">
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
