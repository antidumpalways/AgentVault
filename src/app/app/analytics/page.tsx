'use client'

import { useState } from 'react'
import { useAppStore } from '@/hooks/useAppStore'

export default function AnalyticsPage() {
  const { agents, memories, totalSizeKB, memoriesByType, memoriesByDay, loaded } = useAppStore()
  const [timeRange, setTimeRange] = useState('30d')

  const filteredMemories = timeRange === 'all'
    ? memories
    : memories.filter((m) => {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const cutoff = new Date(Date.now() - days * 86400000);
        return new Date(m.createdAt) >= cutoff;
      });

  const sortedDays = Object.entries(
    filteredMemories.reduce((acc, m) => {
      const day = m.createdAt.slice(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([a], [b]) => a.localeCompare(b));

  const maxCount = Math.max(...sortedDays.map(([, c]) => c), 1)

  const recentMemories = [...filteredMemories].reverse().slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">ANALYTICS</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">VAULT PERFORMANCE & INSIGHTS</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`font-mono text-[10px] tracking-widest px-4 py-2 border transition-colors ${
                timeRange === range
                  ? 'bg-[#00d9ff] text-[#0a0e27] border-[#00d9ff]'
                  : 'border-[#1e1e1e] text-[#f2ede6] hover:border-[#00d9ff]/50'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'AGENTS CREATED', value: agents.length.toString() },
          { label: 'MEMORIES STORED', value: memories.length.toString() },
          { label: 'STORAGE USED', value: `${totalSizeKB.toFixed(1)} KB` },
          { label: 'USER INPUTS', value: memoriesByType.user.toString() },
        ].map((metric) => (
          <div
            key={metric.label}
            className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff]/30 transition-colors"
          >
            <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">{metric.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-3xl text-[#f2ede6]">{metric.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Memory Growth */}
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <h3 className="font-display text-lg text-[#f2ede6] mb-4">MEMORY GROWTH</h3>
          {!loaded ? (
            <div className="h-64 flex items-center justify-center">
              <p className="font-mono text-[10px] text-[#3a3a3a]">LOADING...</p>
            </div>
          ) : sortedDays.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="font-mono text-[10px] text-[#3a3a3a]">NO DATA YET</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-around">
              {sortedDays.map(([day, count], i) => (
                <div key={day} className="flex flex-col items-center">
                  <div
                    className="w-4 bg-gradient-to-t from-[#00d9ff] to-[#00d9ff]/60 rounded-sm"
                    style={{ height: `${(count / maxCount) * 256}px` }}
                  />
                  {i % Math.max(1, Math.floor(sortedDays.length / 6)) === 0 && (
                    <span className="font-mono text-[8px] text-[#3a3a3a] mt-2">{day.slice(5)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="font-mono text-[9px] text-[#3a3a3a] text-center mt-4">MEMORIES PER DAY</p>
        </div>

        {/* Memory Type Distribution */}
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <h3 className="font-display text-lg text-[#f2ede6] mb-4">MEMORY BREAKDOWN</h3>
          <div className="space-y-4">
            {[
              { label: 'User Inputs', value: memoriesByType.user, color: 'bg-[#a78bfa]', total: memories.length || 1 },
              { label: 'Agent Responses', value: memoriesByType.agent, color: 'bg-[#00d9ff]', total: memories.length || 1 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-[#f2ede6]">{item.label}</span>
                  <span className="font-mono text-[10px] text-[#3a3a3a]">{item.value}</span>
                </div>
                <div className="w-full h-2 bg-[#050505] border border-[#1e1e1e]">
                  <div className={`h-full ${item.color}`} style={{ width: `${(item.value / item.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e]">
        <div className="border-b border-[#1e1e1e] px-6 py-4 bg-[#050505]">
          <h3 className="font-display text-lg text-[#f2ede6]">RECENT ACTIVITY</h3>
        </div>
        {!loaded ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[10px] text-[#3a3a3a]">LOADING...</p>
          </div>
        ) : recentMemories.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[10px] text-[#3a3a3a]">NO ACTIVITY YET</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e1e]">
            {recentMemories.map((memory) => (
              <div key={memory.id} className="px-6 py-4 hover:bg-[#141414] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-[#f2ede6] mb-1">
                      {memory.role === 'user' ? 'USER INPUT' : 'AGENT RESPONSE'}
                    </p>
                    <p className="font-mono text-[10px] text-[#5a5a5a] truncate">
                      {memory.content.slice(0, 80)}{memory.content.length > 80 ? '...' : ''}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-mono text-[10px] text-[#3a3a3a] mb-1">
                      {new Date(memory.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="font-mono text-[9px] text-[#00d9ff]">{memory.agentName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
