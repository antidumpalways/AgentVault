'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/hooks/useAppStore'
import { useWallet } from '@/hooks/useWallet'
import { getUserAgentsOnChain } from '@/hooks/useCDRClient'

interface BalanceInfo {
  balanceIp: string;
  hasSufficientFunds: boolean;
}

export default function AppHome() {
  const { agents, memories, loaded } = useAppStore();
  const { address, isConnected, connect, isConnecting } = useWallet();
  const [onChainCount, setOnChainCount] = useState<number | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);

  // Load on-chain agent count + balance when wallet connects
  useEffect(() => {
    if (!isConnected || !address) {
      setOnChainCount(null);
      setBalance(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ids = await getUserAgentsOnChain(address);
        if (!cancelled) setOnChainCount(ids.length);
      } catch {
        if (!cancelled) setOnChainCount(0);
      }
      try {
        const res = await fetch('/api/wallet/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address }),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setBalance({ balanceIp: data.balanceIp, hasSufficientFunds: data.hasSufficientFunds });
        }
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [address, isConnected]);

  const [greeting, setGreeting] = useState<string>('WELCOME');
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 6) setGreeting('GOOD EVENING');
    else if (h < 12) setGreeting('GOOD MORNING');
    else if (h < 18) setGreeting('GOOD AFTERNOON');
    else setGreeting('GOOD EVENING');
  }, []);

  const recentMemories = [...memories].reverse().slice(0, 3);
  const totalMemories = memories.length;
  const sizeKB = (totalMemories * 200) / 1024;

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-8">
        <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">{greeting}</p>
        <h1 className="font-display text-5xl tracking-tight text-[#f2ede6] mb-3">
          {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'AGENTVAULT'}
        </h1>
        <p className="font-mono text-[11px] text-[#5a5a5a] max-w-2xl leading-relaxed">
          Sovereign AI agent memory on Story Protocol. Encrypted with CDR threshold decryption, owned by you, tradable on-chain.
        </p>

        {!isConnected && (
          <button
            type="button"
            onClick={connect}
            disabled={isConnecting}
            className="mt-6 bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest py-3 px-8 hover:bg-[#00e6ff] transition-colors font-semibold disabled:opacity-30"
          >
            {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET TO START'}
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'AGENTS', value: agents.length.toString(), href: '/app/vaults' },
          { label: 'MEMORIES', value: totalMemories.toString(), href: '/app/memories' },
          { label: 'ON-CHAIN', value: onChainCount === null ? '—' : onChainCount.toString(), href: '/app/brain' },
          { label: 'STORAGE', value: `${sizeKB.toFixed(1)} KB`, href: '/app/analytics' },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="border border-[#1e1e1e] bg-[#0e0e0e] p-5 hover:border-[#00d9ff]/40 transition-colors"
          >
            <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">{kpi.label}</div>
            <div className="font-display text-3xl text-[#f2ede6]">{kpi.value}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions + wallet status */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/app/spawn" className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff] transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#00d9ff] flex items-center justify-center text-[#0a0e27] font-bold text-lg">+</div>
            <h3 className="font-display text-lg text-[#f2ede6]">SPAWN AGENT</h3>
          </div>
          <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
            Create a new AI agent with encrypted on-chain memory. Mints NFT, registers IP, attaches license.
          </p>
          <p className="font-mono text-[10px] text-[#00d9ff] mt-3 group-hover:translate-x-1 transition-transform">→ START</p>
        </Link>

        <Link href="/app/train" className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff] transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 border border-[#00d9ff] flex items-center justify-center text-[#00d9ff] font-bold text-lg">~</div>
            <h3 className="font-display text-lg text-[#f2ede6]">TRAIN</h3>
          </div>
          <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
            Chat with your agent using Anthropic Sonnet. Every message is CDR-encrypted and stored on-chain.
          </p>
          <p className="font-mono text-[10px] text-[#00d9ff] mt-3 group-hover:translate-x-1 transition-transform">→ CONTINUE</p>
        </Link>

        <Link href="/app/brain" className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff] transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 border border-[#a78bfa] flex items-center justify-center text-[#a78bfa] font-bold text-lg">↺</div>
            <h3 className="font-display text-lg text-[#f2ede6]">RECALL</h3>
          </div>
          <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
            Decrypt memories from validators. Threshold decryption combines partial signatures on-chain.
          </p>
          <p className="font-mono text-[10px] text-[#00d9ff] mt-3 group-hover:translate-x-1 transition-transform">→ DECRYPT</p>
        </Link>
      </div>

      {/* Wallet status + recent activity */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wallet status */}
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <h3 className="font-display text-lg text-[#f2ede6] mb-4">WALLET</h3>
          {!isConnected ? (
            <p className="font-mono text-[10px] text-[#5a5a5a]">NOT CONNECTED</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">ADDRESS</span>
                <span className="font-mono text-[10px] text-[#f2ede6]">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">BALANCE</span>
                <span className="font-mono text-[10px] text-[#f2ede6]">
                  {balance ? `${parseFloat(balance.balanceIp).toFixed(4)} IP` : '...'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">NETWORK</span>
                <span className="font-mono text-[10px] text-[#00d9ff]">AENEID TESTNET</span>
              </div>
              {!balance?.hasSufficientFunds && (
                <div className="mt-3 p-3 border border-[#f87171]/30 bg-[#f87171]/5">
                  <p className="font-mono text-[10px] text-[#f87171]">
                    LOW BALANCE — visit /app/spawn to drip testnet IP
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-[#f2ede6]">RECENT MEMORIES</h3>
            <Link href="/app/memories" className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff]">VIEW ALL →</Link>
          </div>
          {!loaded ? (
            <p className="font-mono text-[10px] text-[#3a3a3a]">LOADING...</p>
          ) : recentMemories.length === 0 ? (
            <div className="py-4 text-center">
              <p className="font-mono text-[10px] text-[#3a3a3a] mb-3">NO MEMORIES YET</p>
              <Link href="/app/spawn" className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff]">→ SPAWN YOUR FIRST AGENT</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMemories.map((m) => (
                <div key={m.id} className="border-l-2 border-[#1e1e1e] pl-3 py-1.5 hover:border-[#00d9ff] transition-colors">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-[10px] text-[#00d9ff]">{m.agentName}</span>
                    <span className="font-mono text-[9px] text-[#3a3a3a]">
                      {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-[#5a5a5a] truncate">
                    {m.role === 'user' ? '> ' : '< '}{m.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
