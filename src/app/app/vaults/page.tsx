'use client'

import { useAppStore } from '@/hooks/useAppStore'
import Link from 'next/link'

export default function VaultsPage() {
  const { agents, memories, loaded, totalSizeKB } = useAppStore()

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
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'TOTAL VAULTS', value: agents.length.toString() },
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
            <div className="flex-1 grid grid-cols-5 gap-4">
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">VAULT NAME</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">UUID</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">MEMORIES</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">CREATED</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">STATUS</div>
            </div>
            <div className="w-12" />
          </div>

          {/* Table Body */}
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border-b border-[#1e1e1e] px-6 py-4 flex items-center gap-4 hover:bg-[#141414] transition-colors group"
            >
              <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                <div className="font-mono text-sm text-[#f2ede6] group-hover:text-[#00d9ff] transition-colors">
                  {agent.name}
                </div>
                <div className="font-mono text-sm text-[#5a5a5a]">{agent.uuid}</div>
                <div className="font-mono text-sm text-[#5a5a5a]">{agent.memoryCount}</div>
                <div className="font-mono text-sm text-[#5a5a5a]">
                  {agent.createdAt.slice(0, 10)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="font-mono text-[10px] text-[#22c55e] tracking-widest">ACTIVE</span>
                </div>
              </div>
              <div className="w-12 flex justify-center">
                <a
                  href={`https://aeneid.storyscan.io/tx/${agent.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff]"
                >
                  TX →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
