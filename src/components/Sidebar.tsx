"use client";

import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";

const navItems = [
  { href: "/spawn", label: "Spawn" },
  { href: "/train", label: "Train" },
  { href: "/brain", label: "Brain" },
  { href: "/market", label: "Market" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-navy-950 border-r border-navy-800 flex flex-col z-40">
      <div className="h-16 flex items-center px-5 border-b border-navy-800">
        <div className="w-7 h-7 bg-cyan-500 rounded flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0E27" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        </div>
        <span className="ml-2 text-xs font-semibold text-white tracking-tight">AgentVault</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a key={item.href} href={item.href} className={`block px-3 py-1.5 rounded text-xs transition-instant ${isActive ? "bg-navy-800 text-cyan-400" : "text-[#8892B0] hover:bg-navy-900 hover:text-white"}`}>
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="p-3 border-t border-navy-800">
        {isConnected ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-navy-900 border border-navy-800">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></div>
              <span className="text-[10px] text-[#8892B0] truncate font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
            <button onClick={disconnect} className="w-full px-3 py-1 rounded text-[10px] text-navy-600 hover:text-[#8892B0] hover:bg-navy-900 transition-instant text-left">Disconnect</button>
          </div>
        ) : (
          <button onClick={connect} disabled={isConnecting} className="w-full flex items-center gap-2 px-3 py-1.5 rounded bg-navy-900 border border-navy-800 text-[#8892B0] hover:bg-navy-800 transition-instant text-[10px]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 010-4h14v4" /><path d="M3 5v14a2 2 0 002 2h16v-5" /><path d="M18 12a2 2 0 000 4h4v-4z" /></svg>
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        )}
        <div className="px-3 mt-2"><span className="text-[9px] text-navy-600">Aeneid Testnet</span></div>
      </div>
    </aside>
  );
}
