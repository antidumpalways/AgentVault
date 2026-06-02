'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWallet'

const AGENT_NAV = [
  { name: 'Spawn', href: '/app/spawn', icon: '⚡', desc: 'Create Agent' },
  { name: 'Train', href: '/app/train', icon: '🧠', desc: 'Train Agent' },
  { name: 'Brain', href: '/app/brain', icon: '💭', desc: 'Recall Memory' },
]

const VAULT_NAV = [
  { name: 'Vaults', href: '/app/vaults', icon: '🔐', desc: 'Manage Vaults' },
  { name: 'Memories', href: '/app/memories', icon: '📝', desc: 'All Memories' },
  { name: 'Marketplace', href: '/app/marketplace', icon: '🏪', desc: 'Knowledge Market' },
  { name: 'Analytics', href: '/app/analytics', icon: '📊', desc: 'Insights' },
]

const BOTTOM_NAV = [
  { name: 'Settings', href: '/app/settings', icon: '⚙️' },
  { name: 'GitHub', href: 'https://github.com/antidumpalways/AgentVault', icon: '📚', external: true },
  { name: 'Story Docs', href: 'https://docs.story.foundation/', icon: '🤝', external: true },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { address, disconnect } = useWallet()

  return (
    <div className="flex h-screen bg-[#050505]">
      <aside className={`border-r border-[#1e1e1e] bg-[#050505] transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#1e1e1e]">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 border border-[#00d9ff] flex items-center justify-center">
                <div className="w-2 h-2 bg-[#00d9ff]" />
              </div>
              {sidebarOpen && <span className="font-display text-sm tracking-widest text-[#f2ede6]">AGENTVAULT</span>}
            </Link>
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-[#1e1e1e] transition-colors text-[#5a5a5a]" aria-label="Toggle sidebar">
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          {/* Agent Actions */}
          <nav className="flex-1 overflow-y-auto">
            <div className="p-3">
              {sidebarOpen && <p className="px-3 mb-2 text-[9px] font-mono tracking-[0.2em] text-[#3a3a3a]">AGENT</p>}
              <div className="space-y-0.5">
                {AGENT_NAV.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-mono tracking-wider transition-colors ${
                        isActive
                          ? 'bg-[#1e1e1e] text-[#00d9ff] border-l-2 border-[#00d9ff]'
                          : 'text-[#5a5a5a] hover:text-[#f2ede6] hover:bg-[#0e0e0e]'
                      }`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {sidebarOpen && <span>{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Vault Management */}
            <div className="p-3">
              {sidebarOpen && <p className="px-3 mb-2 text-[9px] font-mono tracking-[0.2em] text-[#3a3a3a]">VAULT</p>}
              <div className="space-y-0.5">
                {VAULT_NAV.map((item) => {
                  const isActive = pathname?.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-mono tracking-wider transition-colors ${
                        isActive
                          ? 'bg-[#1e1e1e] text-[#00d9ff] border-l-2 border-[#00d9ff]'
                          : 'text-[#5a5a5a] hover:text-[#f2ede6] hover:bg-[#0e0e0e]'
                      }`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {sidebarOpen && <span>{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Bottom */}
          <div className="border-t border-[#1e1e1e] p-3 space-y-0.5">
            {BOTTOM_NAV.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 px-3 py-2 text-sm font-mono tracking-wider text-[#5a5a5a] hover:text-[#f2ede6] hover:bg-[#0e0e0e] transition-colors"
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {sidebarOpen && <span>{item.name}</span>}
              </a>
            ))}
            <div className="mt-2 px-3 py-2 border border-[#1e1e1e] rounded flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00d9ff]/20 border border-[#00d9ff] flex items-center justify-center text-[10px] text-[#00d9ff]">{address ? address.slice(2, 4).toUpperCase() : 'A'}</div>
              {sidebarOpen && (
                <span className="text-xs font-mono text-[#5a5a5a] truncate">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'NOT CONNECTED'}
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-16 border-b border-[#1e1e1e] bg-[#050505] px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">
            {address ? (
              <><span className="text-[#22c55e]">●</span> {address.slice(0, 6)}...{address.slice(-4)}</>
            ) : (
              <><span className="text-[#f87171]">●</span> NOT CONNECTED</>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-[#3a3a3a]">AENEID TESTNET</span>
            {address && (
              <button
                onClick={() => { disconnect(); router.push('/'); }}
                className="font-mono text-[11px] text-[#00d9ff] hover:text-[#00e6ff] transition-colors"
              >
                LOGOUT →
              </button>
            )}
          </div>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
