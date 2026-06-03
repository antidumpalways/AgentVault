"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/hooks/useAppStore";
import { storeEncryptedMemory } from "@/hooks/useCDRClient";
import { showToast } from "@/components/Toast";
import {
  FAUCET_URLS,
  EXPLORER_URL,
  RPC_URL,
  CHAIN_ID,
} from "@/lib/constants";

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

const MIN_BALANCE_FOR_SPAWN_IP = "0.1";

export default function SpawnContent() {
  const [agentName, setAgentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [balance, setBalance] = useState<{ balanceIp: string; hasSufficientFunds: boolean; requiredIp: string } | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const { address, isConnected, connect } = useWallet();
  const { addAgent } = useAppStore();

  // Check user's IP balance when wallet connects. User needs ~0.1 IP to cover
  // 5 user-signed txs (mint NFT, register IP, attach license, mint license,
  // createAgentAndStoreMemory). The deployer wallet no longer pays for
  // user-owned spawns.
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

  const stepStatus = (i: number) => {
    if (isConnected && i === 0) return "done";
    if (step > i) return "done";
    if (step === i) return "active";
    return "idle";
  };

  const handleSpawn = async () => {
    if (!agentName.trim() || !address) return;
    if (balance && !balance.hasSufficientFunds) {
      showToast(`Need at least ${MIN_BALANCE_FOR_SPAWN_IP} IP — get from a faucet first.`, undefined, "error");
      return;
    }
    setIsCreating(true);
    setLogs([]);
    try {
      // === STEP 1: Allocate CDR vault (server signs, server pays) ===
      setStep(1);
      setLogs((p) => [...p, "[CDR] Allocating threshold-encrypted vault..."]);
      const initialMemory = `I am ${agentName}, created on ${new Date().toISOString()}.`;
      const { uuid, txHash: cdrStoreTxHash } = await storeEncryptedMemory(initialMemory, address);
      setLogs((p) => [
        ...p,
        `[CDR] Vault ID: ${uuid}`,
        `[CDR] File: agent-${uuid}.md`,
        `[CDR] Tx: ${cdrStoreTxHash.slice(0, 14)}...`,
      ]);

      // === STEP 2: User signs 5 ownership-establishing txs ===
      setLogs((p) => [...p, "[STORY] Fetching calldata templates..."]);
      const storyRes = await fetch("/api/story/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, name: agentName, vaultUuid: uuid }),
      });
      const storyData = await storyRes.json();
      if (!storyData.success) throw new Error(storyData.error || "Story setup failed");

      const provider = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!provider) throw new Error("No wallet detected");
      const { createWalletClient, custom, createPublicClient, http, encodeFunctionData } = await import("viem");
      const aeneid = {
        id: CHAIN_ID, name: "Aeneid" as const, network: "aeneid" as const,
        nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
        rpcUrls: { default: { http: [RPC_URL] } },
      };
      const wClient = createWalletClient({ transport: custom(provider as never), chain: aeneid });
      const pub = createPublicClient({ chain: aeneid, transport: http() });
      const [account] = await wClient.requestAddresses();
      if (!account) throw new Error("Wallet returned no account");

      // Verify chain is 1315
      const chainIdHex = await provider.request({ method: "eth_chainId" }) as string;
      if (parseInt(chainIdHex, 16) !== CHAIN_ID) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x523" }],
          });
        } catch (switchErr: unknown) {
          const code = (switchErr as { code?: number })?.code;
          if (code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x523",
                chainName: "Aeneid",
                nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: [EXPLORER_URL],
              }],
            });
          } else {
            throw new Error(`Please switch to Aeneid testnet (chain ${CHAIN_ID}).`);
          }
        }
      }

      setLogs((p) => [...p, "[WALLET] 5 prompts ahead: NFT mint, IP register, attach license, mint license, register agent..."]);

      // --- Tx 1: mint NFT to user ---
      const mintData = encodeFunctionData({
        abi: storyData.mintTx.abi,
        functionName: storyData.mintTx.functionName,
        args: storyData.mintTx.args,
      });
      const mintTxHash = await wClient.sendTransaction({
        account, chain: aeneid,
        to: storyData.mintTx.to as `0x${string}`,
        data: mintData,
        value: BigInt(0),
      });
      const mintReceipt = await pub.waitForTransactionReceipt({ hash: mintTxHash });
      setLogs((p) => [...p, `[STORY] Mint NFT: ${mintTxHash.slice(0, 14)}...`]);

      // Parse tokenId from the SimpleNFT.mint event log
      let tokenId = BigInt(0);
      for (const log of mintReceipt.logs) {
        // SimpleNFT emits Transfer(address,address,uint256). topic[3] is the tokenId.
        if (log.topics.length >= 4 && log.topics[3]) {
          try {
            tokenId = BigInt(log.topics[3]);
            break;
          } catch { /* not a tokenId topic */ }
        }
      }
      if (tokenId === BigInt(0)) throw new Error("Could not parse tokenId from mint receipt");
      setLogs((p) => [...p, `[STORY] Token ID: #${tokenId.toString()}`]);

      // --- Tx 2: register IP Asset ---
      const registerData = encodeFunctionData({
        abi: storyData.registerTx.abi,
        functionName: storyData.registerTx.functionName,
        args: [
          storyData.registerTx.args[0], // chainId
          storyData.registerTx.args[1], // tokenContract
          tokenId,                       // from mint
        ],
      });
      const registerTxHash = await wClient.sendTransaction({
        account, chain: aeneid,
        to: storyData.registerTx.to as `0x${string}`,
        data: registerData,
        value: BigInt(0),
      });
      const registerReceipt = await pub.waitForTransactionReceipt({ hash: registerTxHash });
      setLogs((p) => [...p, `[STORY] Register IP: ${registerTxHash.slice(0, 14)}...`]);

      // Parse IP Account address (ipId) from the register event log
      let ipId: `0x${string}` | null = null;
      for (const log of registerReceipt.logs) {
        // IPRegistered event has ipId in topics[1]
        if (log.topics.length >= 2 && log.topics[1] && log.topics[1].length === 66) {
          const candidate = ("0x" + log.topics[1].slice(26)) as `0x${string}`;
          // sanity: should be non-zero, not the deployer, not a contract addr
          if (candidate !== "0x0000000000000000000000000000000000000000") {
            ipId = candidate;
            break;
          }
        }
      }
      if (!ipId) throw new Error("Could not parse ipId from register receipt");
      setLogs((p) => [...p, `[STORY] IP Account: ${ipId.slice(0, 10)}...${ipId.slice(-6)}`]);

      // Build inner data for attachLicense and mintLicense
      const attachInnerData = encodeFunctionData({
        abi: storyData.attachLicenseTx.innerDataTemplate.abi,
        functionName: storyData.attachLicenseTx.innerDataTemplate.functionName,
        args: [
          ipId,
          storyData.attachLicenseTx.innerDataTemplate.args[1], // PIL_TEMPLATE
          storyData.attachLicenseTx.innerDataTemplate.args[2], // licenseTermsId
        ],
      });
      const mintLicenseInnerData = encodeFunctionData({
        abi: storyData.mintLicenseTx.innerDataTemplate.abi,
        functionName: storyData.mintLicenseTx.innerDataTemplate.functionName,
        args: [
          ipId,
          storyData.mintLicenseTx.innerDataTemplate.args[1],
          storyData.mintLicenseTx.innerDataTemplate.args[2],
          storyData.mintLicenseTx.innerDataTemplate.args[3],
          storyData.mintLicenseTx.innerDataTemplate.args[4],
          storyData.mintLicenseTx.innerDataTemplate.args[5],
          storyData.mintLicenseTx.innerDataTemplate.args[6],
          storyData.mintLicenseTx.innerDataTemplate.args[7],
        ],
      });

      // --- Tx 3: attachLicense via IPAccount.execute ---
      const attachLicenseExecuteData = encodeFunctionData({
        abi: storyData.attachLicenseTx.abi,
        functionName: storyData.attachLicenseTx.functionName,
        args: [
          storyData.attachLicenseTx.args[0], // LICENSING_MODULE
          storyData.attachLicenseTx.args[1], // value 0
          attachInnerData,
        ],
      });
      const attachTxHash = await wClient.sendTransaction({
        account, chain: aeneid,
        to: ipId,
        data: attachLicenseExecuteData,
        value: BigInt(0),
      });
      await pub.waitForTransactionReceipt({ hash: attachTxHash });
      setLogs((p) => [...p, `[STORY] Attach license: ${attachTxHash.slice(0, 14)}...`]);

      // --- Tx 4: mintLicense via IPAccount.execute ---
      const mintLicenseExecuteData = encodeFunctionData({
        abi: storyData.mintLicenseTx.abi,
        functionName: storyData.mintLicenseTx.functionName,
        args: [
          storyData.mintLicenseTx.args[0],
          storyData.mintLicenseTx.args[1],
          mintLicenseInnerData,
        ],
      });
      const mintLicenseTxHash = await wClient.sendTransaction({
        account, chain: aeneid,
        to: ipId,
        data: mintLicenseExecuteData,
        value: BigInt(0),
      });
      await pub.waitForTransactionReceipt({ hash: mintLicenseTxHash });
      setLogs((p) => [...p, `[STORY] Mint license: ${mintLicenseTxHash.slice(0, 14)}...`]);

      // Parse licenseTokenId from the LicenseToken Transfer event (from=0x0, to=user, tokenId)
      let licenseTokenId = "";
      const mintLicenseReceipt = await pub.getTransactionReceipt({ hash: mintLicenseTxHash });
      for (const log of mintLicenseReceipt.logs) {
        if (log.topics.length >= 4 && log.topics[3]) {
          try {
            licenseTokenId = BigInt(log.topics[3]).toString();
            break;
          } catch { /* skip */ }
        }
      }
      if (!licenseTokenId) licenseTokenId = "0";
      setLogs((p) => [...p, `[STORY] License Token: #${licenseTokenId}`]);

      // --- Tx 5: createAgentAndStoreMemory on AgentVault ---
      const agentData = encodeFunctionData({
        abi: storyData.createAgentAndStoreMemoryTx.abi,
        functionName: storyData.createAgentAndStoreMemoryTx.functionName,
        args: [
          ipId,
          storyData.createAgentAndStoreMemoryTx.args[1], // vaultUuid
          storyData.createAgentAndStoreMemoryTx.args[2], // contentHash
          storyData.createAgentAndStoreMemoryTx.args[3], // metadata
        ],
      });
      const createAgentTxHash = await wClient.sendTransaction({
        account, chain: aeneid,
        to: storyData.createAgentAndStoreMemoryTx.to as `0x${string}`,
        data: agentData,
        value: BigInt(0),
      });
      const agentReceipt = await pub.waitForTransactionReceipt({ hash: createAgentTxHash });
      setLogs((p) => [...p, `[AGENTVAULT] createAgent+storeMemory: ${createAgentTxHash.slice(0, 14)}...`]);

      // Parse agentId from AgentCreated event
      let agentId: number | null = null;
      for (const log of agentReceipt.logs) {
        if (log.topics.length >= 2 && log.topics[1] && log.topics[1].length === 66) {
          try {
            agentId = Number(BigInt("0x" + log.topics[1].slice(2, 66)));
            if (agentId > 0) break;
          } catch { /* skip */ }
        }
      }
      if (agentId !== null) {
        setLogs((p) => [...p, `[AGENTVAULT] Agent #${agentId} created`]);
      }

      // === STEP 3: Server registers on AgentVault (registry pointer) ===
      setStep(2);
      try {
        const finalizeRes = await fetch(storyData.finalizeEndpoint || "/api/story/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            ipId,
            vaultUuid: uuid,
            txHashes: { mint: mintTxHash, register: registerTxHash, attach: attachTxHash, mintLicense: mintLicenseTxHash, createAgent: createAgentTxHash },
          }),
        });
        const finalizeData = await finalizeRes.json();
        if (finalizeData.success && !finalizeData.skipped) {
          setLogs((p) => [...p, `[REGISTRY] registerIpForOwner: ${finalizeData.txHash.slice(0, 14)}...`]);
        } else if (finalizeData.skipped) {
          setLogs((p) => [...p, `[REGISTRY] already registered — skipped`]);
        }
      } catch (e) {
        // Non-fatal: the spawn still succeeded, just no registry pointer.
        console.warn("Finalize (registry pointer) failed:", e);
        setLogs((p) => [...p, `[REGISTRY] finalize call failed (non-fatal)`]);
      }

      const agentRecord = {
        id: `agent-${uuid}`,
        name: agentName,
        uuid,
        txHash: cdrStoreTxHash,
        createdAt: new Date().toISOString(),
        memoryCount: 1,
        ipId,
        licenseTokenId,
        agentId: agentId ?? undefined,
        agentVaultTxHash: createAgentTxHash,
      };
      setCreatedAgent({ name: agentName, uuid, txHash: cdrStoreTxHash, createdAt: agentRecord.createdAt });
      addAgent(agentRecord);
      showToast(`Agent "${agentName}" created`, createAgentTxHash, "success");
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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">SPAWN AGENT</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">CREATE A NEW ENCRYPTED AI AGENT</p>
        </div>
      </div>

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
                        <p>INSUFFICIENT IP BALANCE — spawning requires {MIN_BALANCE_FOR_SPAWN_IP} IP for 5 user-signed setup transactions (mint NFT, register IP, attach license, mint license, register agent).</p>
                        <p className="text-[#5a5a5a]">No in-app faucet — get testnet IP from one of the external faucets below.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleRecheckBalance} disabled={checkingBalance} className="font-mono text-[10px] tracking-widest border border-[#1e1e1e] text-[#5a5a5a] px-4 py-2 hover:border-[#00d9ff]/50 hover:text-[#f2ede6] transition-colors disabled:opacity-30">
                        {checkingBalance ? "CHECKING..." : "RECHECK"}
                      </button>
                    </div>
                    <div className="border-t border-[#f87171]/20 pt-3 mt-1 space-y-2">
                      <p className="font-mono text-[9px] text-[#5a5a5a] tracking-widest">GET TESTNET IP FROM AN EXTERNAL FAUCET:</p>
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
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">CDR TX</span>
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
