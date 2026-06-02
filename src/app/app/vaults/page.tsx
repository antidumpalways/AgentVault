'use client'

import { useAppStore } from '@/hooks/useAppStore'
import { useWallet } from '@/hooks/useWallet'
import { getUserAgentsOnChain, checkAccessOnChain } from '@/hooks/useCDRClient'
import { useGrantLicense, getLicensesOwnedBy } from '@/hooks/useGrantLicense'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validate'

export default function VaultsPage() {
  const { agents, memories, grantedLicenses, loaded, totalSizeKB, addGrantedLicense, removeGrantedLicense } = useAppStore()
  const { address } = useWallet()
  const { grantLicense, isGranting, error: grantError } = useGrantLicense()
  const [onChainIds, setOnChainIds] = useState<number[]>([])
  const [accessMap, setAccessMap] = useState<Record<number, boolean>>({})
  const [grantingAgent, setGrantingAgent] = useState<string | null>(null)
  const [granteeInput, setGranteeInput] = useState('')
  const [grantedTx, setGrantedTx] = useState<{ tokenId: string; txHash: string; grantee: string } | null>(null)
  const [receivedLicenses, setReceivedLicenses] = useState<string[]>([])
  const [loadingReceived, setLoadingReceived] = useState(false)

  useEffect(() => {
    if (!address) return
    getUserAgentsOnChain(address).then(async (ids) => {
      setOnChainIds(ids)
      const access: Record<number, boolean> = {}
      for (const id of ids) {
        access[id] = await checkAccessOnChain(id, address)
      }
      setAccessMap(access)
    }).catch(() => {})
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
        <Link
          href="/app/spawn"
          className="font-mono text-[11px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-5 h-9 flex items-center hover:bg-[#00e6ff] transition-colors font-semibold"
        >
          + CREATE VAULT
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'LOCAL VAULTS', value: agents.length.toString() },
          { label: 'ON-CHAIN AGENTS', value: onChainIds.length.toString() },
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
            <div className="flex-1 grid grid-cols-6 gap-4">
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">VAULT NAME</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">UUID</div>
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
                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div className="font-mono text-sm text-[#f2ede6] group-hover:text-[#00d9ff] transition-colors">
                      {agent.name}
                    </div>
                    <div className="font-mono text-sm text-[#5a5a5a]">{agent.uuid}</div>
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
                      <button
                        type="button"
                        onClick={() => openGrant(agent.id)}
                        className="font-mono text-[10px] tracking-widest text-[#00d9ff] border border-[#00d9ff]/30 px-2 py-1 hover:bg-[#00d9ff]/10 transition-colors"
                      >
                        + LICENSE
                      </button>
                    )}
                    <a
                      href={`https://aeneid.storyscan.io/tx/${agent.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff] flex items-center"
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

      {/* On-Chain Agent IDs */}
      {onChainIds.length > 0 && (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-4">ON-CHAIN AGENTS (AGENTVAULT CONTRACT)</div>
          <div className="flex flex-wrap gap-2">
            {onChainIds.map((id) => (
              <div key={id} className="font-mono text-[10px] px-3 py-1.5 border border-[#1e1e1e] text-[#5a5a5a]">
                Agent #{id} {accessMap[id] ? <span className="text-[#22c55e]">● ACCESS</span> : <span className="text-[#f87171]">● NO ACCESS</span>}
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
