"use client";

import { useEffect, useState } from "react";

const LINKS = {
  PRODUCT: [{ name: "Features", href: "#features" }, { name: "How It Works", href: "#how-it-works" }, { name: "Security", href: "#security" }],
  DEVELOPERS: [{ name: "Documentation", href: "#" }, { name: "API Reference", href: "#" }, { name: "SDKs", href: "#" }],
  COMPANY: [{ name: "About", href: "#" }, { name: "Blog", href: "#" }, { name: "Contact", href: "#" }],
  LEGAL: [{ name: "Privacy", href: "#" }, { name: "Terms", href: "#" }],
};

export function FooterSection() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <footer className="relative border-t border-[#1e1e1e]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="border-b border-[#1e1e1e] py-12 grid lg:grid-cols-[1fr_2fr] gap-10">
          <div>
            <a href="/" className="inline-flex items-center gap-3 mb-5 group">
              <div className="w-8 h-8 border border-[#00d9ff] flex items-center justify-center relative"><div className="w-2.5 h-2.5 bg-[#00d9ff]" /><div className="absolute inset-0 bg-[#00d9ff]/10 group-hover:bg-[#00d9ff]/20 transition-colors" /></div>
              <span className="font-display text-2xl tracking-[0.12em] text-[#f2ede6]">AGENTVAULT</span>
            </a>
            <p className="text-sm text-[#3a3a3a] leading-relaxed max-w-xs font-mono">Encrypted, on-chain memory for AI agents. Your IP. Your license. Your agent.</p>
            <div className="flex gap-5 mt-6">{["TWITTER", "GITHUB", "DISCORD"].map(s => (<a key={s} href="#" className="font-mono text-[10px] tracking-widest text-[#3a3a3a] hover:text-[#2196f3] transition-colors">{s} ↗</a>))}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(LINKS).map(([section, links]) => (
              <div key={section}>
                <h3 className="font-mono text-[9px] tracking-[0.2em] text-[#2196f3] mb-5">{section}</h3>
                <ul className="space-y-3">{links.map(l => (<li key={l.name}><a href={l.href} className="font-mono text-[11px] text-[#3a3a3a] hover:text-[#f2ede6] transition-colors">{l.name}</a></li>))}</ul>
              </div>
            ))}
          </div>
        </div>
        <div className="py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] text-[#3a3a3a]">© 2026 AGENTVAULT. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <span className="font-mono text-[10px] text-[#3a3a3a] tabular-nums">{time} UTC</span>
            <div className="flex items-center gap-2"><span className="status-pulse w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" /><span className="font-mono text-[10px] text-[#22c55e] tracking-widest">ALL_SYSTEMS_OPERATIONAL</span></div>
          </div>
        </div>
      </div>
    </footer>
  );
}
