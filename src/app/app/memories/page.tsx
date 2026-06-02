'use client'

import { useState } from 'react'
import { useAppStore } from '@/hooks/useAppStore'

export default function MemoriesPage() {
  const { memories, loaded } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'user' | 'agent'>('all')
  const [search, setSearch] = useState('')

  const filtered = memories.filter((m) => {
    if (filter !== 'all' && m.role !== filter) return false
    if (search && !m.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">MEMORIES</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">
            {memories.length === 0 ? 'NO MEMORIES STORED YET' : `${memories.length} MEMORIES STORED`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'user', 'agent'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-[10px] tracking-widest px-4 py-2 border transition-colors ${
                filter === f
                  ? 'bg-[#00d9ff] text-[#0a0e27] border-[#00d9ff]'
                  : 'border-[#1e1e1e] text-[#f2ede6] hover:border-[#00d9ff]/50'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="flex-1 max-w-xs bg-[#050505] border border-[#1e1e1e] px-4 py-2 font-mono text-[11px] text-[#f2ede6] placeholder:text-[#3a3a3a] focus:border-[#00d9ff] focus:outline-none transition-colors"
        />
      </div>

      {/* Memories Table */}
      {!loaded ? (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-12 text-center">
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">LOADING...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-12 text-center">
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">
            {memories.length === 0 ? 'NO MEMORIES YET' : 'NO MATCHING MEMORIES'}
          </p>
          <p className="font-mono text-[10px] text-[#5a5a5a]">
            {memories.length === 0 ? 'Train an agent to start storing encrypted memories' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e]">
          {/* Table Header */}
          <div className="border-b border-[#1e1e1e] px-6 py-4 flex items-center gap-4 bg-[#050505]">
            <div className="flex-1 grid grid-cols-6 gap-4">
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest col-span-2">CONTENT</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">AGENT</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">ROLE</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">UUID</div>
              <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">TIME</div>
            </div>
          </div>

          {/* Table Body */}
          {filtered.map((memory) => (
            <div
              key={memory.id}
              className="border-b border-[#1e1e1e] px-6 py-4 hover:bg-[#141414] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                  <div className="font-mono text-sm text-[#f2ede6] truncate col-span-2">
                    {memory.content.slice(0, 60)}{memory.content.length > 60 ? '...' : ''}
                  </div>
                  <div className="font-mono text-sm text-[#5a5a5a] truncate">{memory.agentName}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${memory.role === 'user' ? 'bg-[#a78bfa]' : 'bg-[#00d9ff]'}`} />
                    <span className="font-mono text-[10px] text-[#5a5a5a] tracking-widest">{memory.role.toUpperCase()}</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#3a3a3a]">{memory.uuid}</div>
                  <div className="font-mono text-[10px] text-[#3a3a3a]">
                    {new Date(memory.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
