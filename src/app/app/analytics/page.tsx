'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/hooks/useAppStore'

const MS_PER_DAY = 86_400_000;

export default function AnalyticsPage() {
  const { agents, memories, loaded } = useAppStore()
  const [timeRange, setTimeRange] = useState('30d')

  // All metrics derive from filteredMemories so the time range is respected everywhere.
  const filteredMemories = useMemo(() => {
    if (timeRange === 'all') return memories;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * MS_PER_DAY;
    return memories.filter((m) => new Date(m.createdAt).getTime() >= cutoff);
  }, [memories, timeRange]);

  const sortedDays = useMemo(() => Object.entries(
    filteredMemories.reduce((acc, m) => {
      const day = m.createdAt.slice(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([a], [b]) => a.localeCompare(b)), [filteredMemories]);

  const maxCount = Math.max(...sortedDays.map(([, c]) => c), 1)

  // Per-time-range stats
  const stats = useMemo(() => {
    const userCount = filteredMemories.filter((m) => m.role === 'user').length;
    const agentCount = filteredMemories.filter((m) => m.role === 'agent').length;
    // Approximate size: avg 200 bytes per memory (CDR ciphertext)
    const sizeKB = (filteredMemories.length * 200) / 1024;
    return { userCount, agentCount, sizeKB };
  }, [filteredMemories]);

  // Per-agent breakdown (always show all agents, count memories in range)
  const perAgentStats = useMemo(() => {
    return agents.map((a) => {
      const mems = filteredMemories.filter((m) => m.agentName === a.name);
      return {
        id: a.id,
        name: a.name,
        uuid: a.uuid,
        totalMemories: memories.filter((m) => m.agentName === a.name).length,
        rangeMemories: mems.length,
        userMsgs: mems.filter((m) => m.role === 'user').length,
        agentMsgs: mems.filter((m) => m.role === 'agent').length,
        lastActivity: mems.length > 0 ? Math.max(...mems.map((m) => new Date(m.createdAt).getTime())) : null,
        ipId: a.ipId,
      };
    }).sort((a, b) => b.rangeMemories - a.rangeMemories);
  }, [agents, memories, filteredMemories]);

  const recentMemories = [...filteredMemories].reverse().slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">ANALYTICS</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">VAULT PERFORMANCE & INSIGHTS · {timeRange.toUpperCase()}</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((range) => (
            <button
              key={range}
              type="button"
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

      {/* Key Metrics — all respect the time range */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'AGENTS', value: agents.length.toString(), sub: 'all-time' },
          { label: 'MEMORIES', value: filteredMemories.length.toString(), sub: timeRange === 'all' ? 'all-time' : `in ${timeRange}` },
          { label: 'STORAGE (KB)', value: stats.sizeKB.toFixed(2), sub: 'approx ciphertext' },
          { label: 'USER INPUTS', value: stats.userCount.toString(), sub: timeRange === 'all' ? 'all-time' : `in ${timeRange}` },
        ].map((metric) => (
          <div
            key={metric.label}
            className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff]/30 transition-colors"
          >
            <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">{metric.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-3xl text-[#f2ede6]">{metric.value}</div>
            </div>
            <div className="font-mono text-[9px] text-[#3a3a3a] mt-1">{metric.sub}</div>
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
              <p className="font-mono text-[10px] text-[#3a3a3a]">NO DATA IN {timeRange.toUpperCase()}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-56 flex items-end justify-between gap-1">
                {sortedDays.map(([day, count], i) => (
                  <div key={day} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-gradient-to-t from-[#00d9ff] to-[#00d9ff]/60 hover:from-[#00e6ff] hover:to-[#00e6ff]/70 transition-colors"
                      style={{ height: `${(count / maxCount) * 100}%`, minHeight: '2px' }}
                      title={`${day}: ${count} memory${count === 1 ? '' : 'ies'}`}
                    />
                    {i % Math.max(1, Math.floor(sortedDays.length / 6)) === 0 && (
                      <span className="font-mono text-[8px] text-[#3a3a3a] mt-2 whitespace-nowrap">{day.slice(5)}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between font-mono text-[9px] text-[#3a3a3a]">
                <span>0</span>
                <span>peak: {maxCount}/day</span>
                <span>{sortedDays.length} day{sortedDays.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Memory Type Distribution — respects range */}
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <h3 className="font-display text-lg text-[#f2ede6] mb-4">MEMORY BREAKDOWN</h3>
          <div className="space-y-4">
            {[
              { label: 'User Inputs', value: stats.userCount, color: 'bg-[#a78bfa]' },
              { label: 'Agent Responses', value: stats.agentCount, color: 'bg-[#00d9ff]' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-[#f2ede6]">{item.label}</span>
                  <span className="font-mono text-[10px] text-[#3a3a3a]">
                    {item.value} · {filteredMemories.length > 0 ? ((item.value / filteredMemories.length) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#050505] border border-[#1e1e1e]">
                  <div className={`h-full ${item.color}`} style={{ width: `${filteredMemories.length > 0 ? (item.value / filteredMemories.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] text-[#3a3a3a] text-center mt-4">
            {filteredMemories.length} TOTAL IN {timeRange.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Per-Agent Breakdown */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e]">
        <div className="border-b border-[#1e1e1e] px-6 py-4 bg-[#050505] flex items-center justify-between">
          <h3 className="font-display text-lg text-[#f2ede6]">PER-AGENT BREAKDOWN</h3>
          <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">{perAgentStats.length} AGENT(S)</span>
        </div>
        {!loaded ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[10px] text-[#3a3a3a]">LOADING...</p>
          </div>
        ) : perAgentStats.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[10px] text-[#3a3a3a]">NO AGENTS YET — SPAWN ONE FIRST</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="text-left font-mono text-[10px] text-[#3a3a3a] tracking-widest px-6 py-3">AGENT</th>
                <th className="text-right font-mono text-[10px] text-[#3a3a3a] tracking-widest px-6 py-3">RANGE</th>
                <th className="text-right font-mono text-[10px] text-[#3a3a3a] tracking-widest px-6 py-3">TOTAL</th>
                <th className="text-right font-mono text-[10px] text-[#3a3a3a] tracking-widest px-6 py-3">USER / AGENT</th>
                <th className="text-right font-mono text-[10px] text-[#3a3a3a] tracking-widest px-6 py-3">LAST ACTIVITY</th>
                <th className="text-right font-mono text-[10px] text-[#3a3a3a] tracking-widest px-6 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {perAgentStats.map((s) => (
                <tr key={s.id} className="border-b border-[#1e1e1e] hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/app/memories`} className="font-mono text-sm text-[#f2ede6] hover:text-[#00d9ff] transition-colors">
                      {s.name}
                    </Link>
                    <div className="font-mono text-[9px] text-[#3a3a3a]">UUID {s.uuid}</div>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm text-[#f2ede6]">{s.rangeMemories}</td>
                  <td className="px-6 py-3 text-right font-mono text-sm text-[#5a5a5a]">{s.totalMemories}</td>
                  <td className="px-6 py-3 text-right font-mono text-[10px]">
                    <span className="text-[#a78bfa]">{s.userMsgs}</span>
                    <span className="text-[#3a3a3a]"> / </span>
                    <span className="text-[#00d9ff]">{s.agentMsgs}</span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-[10px] text-[#5a5a5a]">
                    {s.lastActivity ? new Date(s.lastActivity).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {s.ipId ? (
                      <span className="font-mono text-[9px] text-[#22c55e]">● ON-CHAIN</span>
                    ) : (
                      <span className="font-mono text-[9px] text-[#3a3a3a]">○ LOCAL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Activity */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e]">
        <div className="border-b border-[#1e1e1e] px-6 py-4 bg-[#050505] flex items-center justify-between">
          <h3 className="font-display text-lg text-[#f2ede6]">RECENT ACTIVITY</h3>
          <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">LAST 5 IN {timeRange.toUpperCase()}</span>
        </div>
        {!loaded ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[10px] text-[#3a3a3a]">LOADING...</p>
          </div>
        ) : recentMemories.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[10px] text-[#3a3a3a]">NO ACTIVITY IN {timeRange.toUpperCase()}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e1e]">
            {recentMemories.map((memory) => (
              <div key={memory.id} className="px-6 py-4 hover:bg-[#141414] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-[#f2ede6] mb-1">
                      {memory.role === 'user' ? 'USER INPUT' : memory.role === 'agent' ? 'AGENT RESPONSE' : 'SYSTEM'}
                    </p>
                    <p className="font-mono text-[10px] text-[#5a5a5a] truncate">
                      {memory.content.slice(0, 80)}{memory.content.length > 80 ? '...' : ''}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-mono text-[10px] text-[#3a3a3a] mb-1">
                      {new Date(memory.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
