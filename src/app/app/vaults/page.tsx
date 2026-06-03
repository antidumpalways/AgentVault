'use client'
/* eslint-disable react/no-unescaped-entities */

import { useAppStore } from '@/hooks/useAppStore'
import { useWallet } from '@/hooks/useWallet'
import { getUserAgentsOnChain } from '@/hooks/useCDRClient'
import { useGrantLicense, getLicensesOwnedBy } from '@/hooks/useGrantLicense'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validate'
import { showToast } from '@/components/Toast'

export default function VaultsPage() {
  const { agents, memories, grantedLicenses, marketListings, loaded, totalSizeKB, addGrantedLicense, removeGrantedLicense, addMarketListing, exportJson, importJson, exportCsv, triggerDownload } = useAppStore()
  const { address } = useWallet()
  const { grantLicense, isGranting, error: grantError } = useGrantLicense()
  const [onChainIds, setOnChainIds] = useState<string[]>([])
  const [grantingAgent, setGrantingAgent] = useState<string | null>(null)
  const [granteeInput, setGranteeInput] = useState('')
  const [grantedTx, setGrantedTx] = useState<{ tokenId: string; txHash: string; grantee: string } | null>(null)
  const [receivedLicenses, setReceivedLicenses] = useState<string[]>([])
  const [loadingReceived, setLoadingReceived] = useState(false)
  const [listingAgent, setListingAgent] = useState<string | null>(null)
  const [listingPrice, setListingPrice] = useState('0.10')
  const [listingType, setListingType] = useState<'decision' | 'insight' | 'conversation'>('insight')
  const [listingDescription, setListingDescription] = useState('')

  useEffect(() => {
    if (!address) return
    getUserAgentsOnChain(address).then(setOnChainIds).catch(() => setOnChainIds([]))
  }, [address])

  useEffect(() => {
    if (!address) return
    setLoadingReceived(true)
    getLicensesOwnedBy(address as `0x${string}`)
      .then(setReceivedLicenses)
      .catch(() => setReceivedLicenses([]))
      .finally(() => setLoadingReceived(false))
  }, [address, grantedLicenses.length])

  const openGrant = (agentId: string) => {
    setGrantingAgent(agentId)
    setGranteeInput('')
    setGrantedTx(null)
  }

  const closeGrant = () => {
    setGrantingAgent(null)
    setGranteeInput('')
    setGrantedTx(null)
  }

  const handleGrant = async () => {
    if (!grantingAgent) return
    const agent = agents.find((a) => a.id === grantingAgent)
    if (!agent?.ipId) return
    if (!isValidAddress(granteeInput)) return

    try {
      const { txHash, licenseTokenId } = await grantLicense({
        ipId: agent.ipId as `0x${string}`,
        granteeAddress: granteeInput as `0x${string}`,
      })
      addGrantedLicense({
        id: `${txHash}-${licenseTokenId}`,
        agentId: agent.id,
        agentName: agent.name,
        ipId: agent.ipId,
        granteeAddress: granteeInput,
        licenseTokenId,
        txHash,
        grantedAt: new Date().toISOString(),
      })
      setGrantedTx({ tokenId: licenseTokenId, txHash, grantee: granteeInput })
    } catch {
      // error already in grantError state
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">VAULTS</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">MANAGE YOUR ENCRYPTED AGENT MEMORY</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#1e1e1e]">
            <button
              type="button"
              disabled={memories.length === 0}
              onClick={() => {
                const { blob, filename } = exportJson();
                triggerDownload(blob, filename);
              }}
              className="font-mono text-[10px] tracking-widest text-[#f2ede6] px-3 py-2 hover:bg-[#1e1e1e] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Download full export (agents + memories + granted licenses) as JSON"
            >
              EXPORT JSON
            </button>
            <div className="w-px bg-[#1e1e1e]" />
            <label
              className="font-mono text-[10px] tracking-widest text-[#f2ede6] px-3 py-2 hover:bg-[#1e1e1e] cursor-pointer"
              title="Restore from a previously exported JSON file"
            >
              IMPORT JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    const res = importJson(parsed);
                    if (res.error) {
                      showToast(`Import failed: ${res.error}`, undefined, "error");
                    } else if (res.added.agents + res.added.memories + res.added.grantedLicenses === 0) {
                      showToast("Nothing new to import", undefined, "info");
                    } else {
                      showToast(
                        `Imported ${res.added.agents} agents, ${res.added.memories} memories, ${res.added.grantedLicenses} licenses`,
                        undefined,
                        "success"
                      );
                    }
                  } catch (err) {
                    showToast(`Import failed: ${(err as Error)?.message || "parse error"}`, undefined, "error");
                  } finally {
                    // Allow re-importing the same file
                    e.target.value = "";
                  }
                }}
              />
            </label>
            <div className="w-px bg-[#1e1e1e]" />
            <button
              type="button"
              disabled={memories.length === 0}
              onClick={() => {
                const { blob, filename } = exportCsv();
                triggerDownload(blob, filename);
              }}
              className="font-mono text-[10px] tracking-widest text-[#f2ede6] px-3 py-2 hover:bg-[#1e1e1e] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Download memories as CSV (spreadsheet-friendly)"
            >
              CSV
            </button>
          </div>
          <Link
            href="/app/spawn"
            className="font-mono text-[11px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-5 h-9 flex items-center hover:bg-[#00e6ff] transition-colors font-semibold"
          >
            + CREATE VAULT
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'LOCAL AGENTS', value: agents.length.toString() },
          { label: 'AGENTVAULT CONTRACT', value: onChainIds.length.toString() },
          { label: 'TOTAL MEMORIES', value: memories.length.toString() },
          { label: 'STORAGE USED', value: `${totalSizeKB.toFixed(1)} KB` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff]/30 transition-colors"
          >
            <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">{stat.label}</div>
            <div className="font-display text-3xl text-[#f2ede6]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Vaults Table */}
      {!loaded ? (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-12 text-center">
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">LOADING...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-12 text-center">
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">NO VAULTS YET</p>
          <p className="font-mono text-[10px] text-[#5a5a5a] mb-4">Spawn your first agent to create an encrypted vault</p>
          <Link
            href="/app/spawn"
            className="inline-block font-mono text-[11px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-5 py-2 hover:bg-[#00e6ff] transition-colors font-semibold"
          >
            SPAWN AGENT
          </Link>
        </div>
      ) : (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e]">
          {/* Table Header */}
          <div className="border-b border-[#1e1e1e] px-6 py-4 flex items-center gap-4 bg-[#050505]">
            <div className="flex-1 grid grid-cols-7 gap-4">
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">VAULT NAME</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">UUID</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">AGENT ID</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">MEMORIES</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">IP ID</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">CREATED</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">STATUS</div>
            </div>
            <div className="w-32 text-right">
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">ACTIONS</div>
            </div>
          </div>

          {/* Table Body */}
          {agents.map((agent) => {
            const agentLicenses = grantedLicenses.filter((l) => l.agentId === agent.id)
            return (
              <div key={agent.id} className="border-b border-[#1e1e1e] last:border-b-0">
                <div className="px-6 py-4 flex items-center gap-4 hover:bg-[#141414] transition-colors group">
                  <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                    <div className="font-mono text-sm text-[#f2ede6] group-hover:text-[#00d9ff] transition-colors">
                      {agent.name}
                    </div>
                    <div className="font-mono text-sm text-[#5a5a5a]">{agent.uuid}</div>
                    <div className="font-mono text-[10px] text-[#5a5a5a]" title="On-chain AgentVault contract ID">
                      {agent.agentId !== undefined ? `#${agent.agentId}` : <span className="text-[#3a3a3a]">—</span>}
                    </div>
                    <div className="font-mono text-sm text-[#5a5a5a]">{agent.memoryCount}</div>
                    <div className="font-mono text-[10px] text-[#3a3a3a] truncate">
                      {agent.ipId ? `${agent.ipId.slice(0, 8)}...` : '—'}
                    </div>
                    <div className="font-mono text-sm text-[#5a5a5a]">
                      {agent.createdAt.slice(0, 10)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${agent.ipId ? 'bg-[#22c55e]' : 'bg-[#f87171]'}`} />
                      <span className={`font-mono text-[10px] tracking-widest ${agent.ipId ? 'text-[#22c55e]' : 'text-[#f87171]'}`}>
                        {agent.ipId ? 'ON-CHAIN' : 'LOCAL'}
                      </span>
                    </div>
                  </div>
                  <div className="w-32 flex justify-end gap-2">
                    {agent.ipId && (
                      <>
                        <button
                          type="button"
                          onClick={() => openGrant(agent.id)}
                          className="font-mono text-[10px] tracking-widest text-[#00d9ff] border border-[#00d9ff]/30 px-2 py-1 hover:bg-[#00d9ff]/10 transition-colors"
                        >
                          + LICENSE
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setListingAgent(agent.id);
                            setListingPrice('0.10');
                            setListingType('insight');
                            setListingDescription(`Access to ${agent.name}'s encrypted memory on Story Protocol.`);
                          }}
                          className="font-mono text-[10px] tracking-widest text-[#a78bfa] border border-[#a78bfa]/30 px-2 py-1 hover:bg-[#a78bfa]/10 transition-colors"
                          title="List this agent on the marketplace"
                        >
                          LIST
                        </button>
                      </>
                    )}
                    <a
                      href={`https://aeneid.storyscan.io/tx/${agent.agentVaultTxHash ?? agent.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff] flex items-center"
                      title={agent.agentVaultTxHash ? "View createAgent tx" : "View CDR write tx"}
                    >
                      TX →
                    </a>
                  </div>
                </div>

                {/* Granted licenses for this agent */}
                {agentLicenses.length > 0 && (
                  <div className="bg-[#0a0a0a] border-t border-[#1e1e1e] px-6 py-3">
                    <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest mb-2">
                      GRANTED LICENSES ({agentLicenses.length})
                    </div>
                    <div className="space-y-1.5">
                      {agentLicenses.map((lic) => (
                        <div key={lic.id} className="flex items-center gap-3 font-mono text-[10px]">
                          <span className="text-[#00d9ff]">#{lic.licenseTokenId}</span>
                          <span className="text-[#5a5a5a]">→</span>
                          <span className="text-[#f2ede6]">{lic.granteeAddress.slice(0, 8)}...{lic.granteeAddress.slice(-6)}</span>
                          <span className="text-[#3a3a3a]">·</span>
                          <span className="text-[#3a3a3a]">{new Date(lic.grantedAt).toLocaleDateString()}</span>
                          <a
                            href={`https://aeneid.storyscan.io/tx/${lic.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00d9ff] hover:text-[#00e6ff]"
                          >
                            TX →
                          </a>
                          <button
                            type="button"
                            onClick={() => removeGrantedLicense(lic.id)}
                            className="ml-auto text-[#5a5a5a] hover:text-[#f87171] text-[10px]"
                            title="Remove from local record (license still exists on-chain)"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List for Sale Modal */}
      {listingAgent && (() => {
        const agent = agents.find((a) => a.id === listingAgent);
        if (!agent?.ipId) return null;
        return (
          <div className="fixed inset-0 z-50 bg-[#050505]/90 flex items-center justify-center p-4" onClick={() => setListingAgent(null)}>
            <div
              className="border border-[#a78bfa]/40 bg-[#0e0e0e] p-8 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-mono text-[10px] text-[#a78bfa] tracking-widest mb-1">LIST FOR SALE</div>
              <h2 className="font-display text-2xl text-[#f2ede6] mb-1">{agent.name}</h2>
              <p className="font-mono text-[10px] text-[#5a5a5a] mb-6">
                IP {agent.ipId.slice(0, 10)}...{agent.ipId.slice(-8)} · TERMS #2054 (PIL)
              </p>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="font-mono text-[10px] text-[#3a3a3a] tracking-widest block mb-1">PRICE (IP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    className="w-full bg-[#050505] border border-[#1e1e1e] px-3 py-2 font-mono text-sm text-[#f2ede6] focus:border-[#a78bfa] focus:outline-none"
                  />
                  <p className="font-mono text-[9px] text-[#3a3a3a] mt-1">For demo, license is minted with maxMintingFee=0 (free). The price is recorded in the listing for display.</p>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#3a3a3a] tracking-widest block mb-1">TYPE</label>
                  <div className="flex gap-2">
                    {(['decision', 'insight', 'conversation'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setListingType(t)}
                        className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors ${
                          listingType === t
                            ? 'bg-[#a78bfa] text-[#0a0e27] border-[#a78bfa]'
                            : 'border-[#1e1e1e] text-[#5a5a5a] hover:border-[#a78bfa]/50'
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#3a3a3a] tracking-widest block mb-1">DESCRIPTION</label>
                  <textarea
                    value={listingDescription}
                    onChange={(e) => setListingDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-[#050505] border border-[#1e1e1e] px-3 py-2 font-mono text-sm text-[#f2ede6] focus:border-[#a78bfa] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="border border-[#a78bfa]/30 bg-[#a78bfa]/5 p-3 mb-6">
                <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
                  This will create a marketplace listing pointing to this agent's real IP. Buyers will sign
                  a <code className="text-[#f2ede6]">mintLicenseTokens</code> tx in their wallet to mint a
                  non-transferable license token that authorizes them to recall this agent's memories.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setListingAgent(null)}
                  className="font-mono text-[10px] tracking-widest text-[#5a5a5a] border border-[#1e1e1e] px-4 py-2 hover:border-[#5a5a5a]"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addMarketListing({
                      id: `list-${Date.now()}`,
                      title: agent.name,
                      description: listingDescription,
                      agentId: agent.id,
                      agentName: agent.name,
                      ipId: agent.ipId!,
                      priceIp: listingPrice,
                      type: listingType,
                      createdAt: new Date().toISOString(),
                      isUserListing: true,
                      sales: 0,
                      rating: 0,
                    });
                    setListingAgent(null);
                    showToast('Listed on marketplace — visit /app/marketplace', undefined, 'success');
                  }}
                  className="font-mono text-[10px] tracking-widest bg-[#a78bfa] text-[#0a0e27] px-4 py-2 hover:bg-[#c4b5fd] font-semibold"
                >
                  LIST →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grant License Modal */}
      {grantingAgent && (() => {
        const agent = agents.find((a) => a.id === grantingAgent)
        if (!agent?.ipId) return null
        return (
          <div className="fixed inset-0 z-50 bg-[#050505]/90 flex items-center justify-center p-4" onClick={closeGrant}>
            <div
              className="border border-[#1e1e1e] bg-[#0e0e0e] p-8 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-1">GRANT LICENSE</div>
              <h2 className="font-display text-2xl text-[#f2ede6] mb-1">{agent.name}</h2>
              <p className="font-mono text-[10px] text-[#5a5a5a] mb-6">
                IP {agent.ipId.slice(0, 10)}...{agent.ipId.slice(-8)} · TERMS #2054 (PIL)
              </p>

              {!grantedTx ? (
                <>
                  <label className="font-mono text-[10px] text-[#3a3a3a] tracking-widest block mb-2">
                    GRANTEE ADDRESS
                  </label>
                  <input
                    type="text"
                    value={granteeInput}
                    onChange={(e) => setGranteeInput(e.target.value.trim())}
                    placeholder="0x..."
                    disabled={isGranting}
                    className="w-full bg-[#050505] border border-[#1e1e1e] px-3 py-2 font-mono text-sm text-[#f2ede6] focus:border-[#00d9ff] focus:outline-none mb-2"
                  />
                  {granteeInput && !isValidAddress(granteeInput) && (
                    <p className="font-mono text-[10px] text-[#f87171] mb-3">Invalid address</p>
                  )}

                  {grantError && (
                    <div className="border border-[#f87171]/30 bg-[#f87171]/5 p-3 mb-4">
                      <p className="font-mono text-[10px] text-[#f87171]">{grantError}</p>
                    </div>
                  )}

                  <div className="border border-[#1e1e1e] bg-[#050505] p-3 mb-6">
                    <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
                      Your wallet will sign a transaction calling{' '}
                      <span className="text-[#f2ede6]">LicensingModule.mintLicenseTokens</span>.
                      The grantee receives a non-transferable license token (ERC-721) that
                      authorizes them to decrypt this agent&apos;s memory.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={closeGrant}
                      disabled={isGranting}
                      className="font-mono text-[10px] tracking-widest text-[#5a5a5a] border border-[#1e1e1e] px-4 py-2 hover:border-[#5a5a5a] disabled:opacity-30"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleGrant}
                      disabled={isGranting || !isValidAddress(granteeInput)}
                      className="font-mono text-[10px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-4 py-2 hover:bg-[#00e6ff] font-semibold disabled:opacity-30"
                    >
                      {isGranting ? 'SIGNING...' : 'GRANT →'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="border border-[#22c55e]/30 bg-[#22c55e]/5 p-4 mb-6">
                    <div className="font-mono text-[10px] text-[#22c55e] tracking-widest mb-2">
                      LICENSE GRANTED
                    </div>
                    <div className="space-y-1 font-mono text-[10px] text-[#f2ede6]">
                      <div><span className="text-[#3a3a3a]">TOKEN ID </span>#{grantedTx.tokenId}</div>
                      <div><span className="text-[#3a3a3a]">RECIPIENT </span>{grantedTx.grantee.slice(0, 10)}...{grantedTx.grantee.slice(-8)}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <a
                      href={`https://aeneid.storyscan.io/tx/${grantedTx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] tracking-widest text-[#00d9ff] border border-[#00d9ff]/30 px-4 py-2 hover:bg-[#00d9ff]/10"
                    >
                      VIEW TX →
                    </a>
                    <button
                      type="button"
                      onClick={closeGrant}
                      className="font-mono text-[10px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-4 py-2 hover:bg-[#00e6ff] font-semibold"
                    >
                      DONE
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* On-Chain IP Asset IDs (from AgentVault registry) */}
      {onChainIds.length > 0 && (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-4">ON-CHAIN IP ASSETS (AGENTVAULT REGISTRY)</div>
          <div className="flex flex-wrap gap-2">
            {onChainIds.map((ipId) => (
              <div key={ipId} className="font-mono text-[10px] px-3 py-1.5 border border-[#1e1e1e] text-[#5a5a5a]">
                IP {ipId.slice(0, 6)}...{ipId.slice(-4)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Licenses I Received */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-1">LICENSES I RECEIVED</div>
            <h3 className="font-display text-xl text-[#f2ede6]">
              {loadingReceived ? '...' : receivedLicenses.length} TOKEN{receivedLicenses.length === 1 ? '' : 'S'}
            </h3>
          </div>
          <p className="font-mono text-[10px] text-[#3a3a3a] max-w-xs text-right">
            License tokens held by your wallet. Use these token IDs when calling recall from external clients.
          </p>
        </div>
        {!loadingReceived && receivedLicenses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {receivedLicenses.map((id) => (
              <span key={id} className="font-mono text-[10px] px-3 py-1.5 border border-[#00d9ff]/30 text-[#00d9ff]">
                #{id}
              </span>
            ))}
          </div>
        ) : !loadingReceived ? (
          <p className="font-mono text-[10px] text-[#5a5a5a]">
            No license tokens held. Ask an IP owner to grant you access to their agent&apos;s memory.
          </p>
        ) : null}
      </div>
    </div>
  )
}
