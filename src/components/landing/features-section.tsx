"use client";

import { useEffect, useRef, useState } from "react";

const FEATURES = [
  { id: "01", tag: "ENCRYPTION", title: "ENCRYPTED\nMEMORY", desc: "All agent memories are encrypted end-to-end with cryptographic proofs of ownership. AgentVault uses zero-knowledge architecture so even we cannot access your agent's knowledge.", stat: { v: "E2E", l: "encrypted always" } },
  { id: "02", tag: "INTELLIGENCE", title: "PERSISTENT\nLEARNING", desc: "Agents retain context across conversations, sessions, and lifetimes. Learn from past interactions and maintain coherent long-term goals.", stat: { v: "∞", l: "memory retention" } },
  { id: "03", tag: "MONETIZATION", title: "VALUE\nCAPTURE", desc: "Agents own and monetize their memory. Trade insights, sell data, share knowledge—all with transparent pricing and cryptographic proof.", stat: { v: "100%", l: "agent ownership" } },
];

function FeatureRow({ f, index }: { f: typeof FEATURES[0]; index: number }) {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`group border-b border-[#1e1e1e] transition-all duration-500 row-hover ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${index * 80}ms` }}>
      <div className="grid grid-cols-[56px_1fr] lg:grid-cols-[56px_260px_1fr_160px] gap-0">
        <div className="border-r border-[#1e1e1e] p-5 flex items-start pt-6"><span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">{f.id}</span></div>
        <div className="border-r border-[#1e1e1e] p-6 flex flex-col gap-3">
          <span className="sys-tag text-[9px]">{f.tag}</span>
          <h3 className="font-display text-3xl lg:text-4xl leading-[0.9] text-[#f2ede6] group-hover:text-[#00d9ff] transition-colors duration-300 whitespace-pre-line">{f.title}</h3>
        </div>
        <div className="col-span-2 lg:col-span-1 border-r border-[#1e1e1e] p-6 flex items-center"><p className="text-sm text-[#5a5a5a] leading-relaxed max-w-lg">{f.desc}</p></div>
        <div className="hidden lg:flex flex-col items-end justify-center p-6"><div className="font-display text-4xl text-[#00d9ff]">{f.stat.v}</div><div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest mt-1 text-right">{f.stat.l}</div></div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section id="features" className="relative border-t border-[#1e1e1e] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div ref={ref} className={`grid grid-cols-[56px_1fr] lg:grid-cols-[56px_260px_1fr_160px] border-b border-[#1e1e1e] transition-all duration-500 ${vis ? "opacity-100" : "opacity-0"}`}>
          <div className="border-r border-[#1e1e1e] p-5" />
          <div className="col-span-2 lg:col-span-3 p-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <span className="sys-tag mb-4 block">FEATURES</span>
              <h2 className="font-display text-6xl lg:text-8xl text-[#f2ede6] leading-[0.88] tracking-tight">THE POWER OF<br /><span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>ENCRYPTED MEMORY</span></h2>
            </div>
            <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest max-w-[200px] text-right hidden lg:block">THREE PILLARS &nbsp;/ &nbsp;ZERO TRUST &nbsp;/ &nbsp;AGENT OWNED</p>
          </div>
        </div>
        {FEATURES.map((f, i) => (<FeatureRow key={f.id} f={f} index={i} />))}
        <div className="grid grid-cols-[56px_1fr] border-b border-[#1e1e1e]">
          <div className="border-r border-[#1e1e1e]" />
          <div className="p-6 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#3a3a3a]">DISCOVER MORE IN DOCS →</span>
            <a href="#" className="font-mono text-xs text-[#00d9ff] hover:underline tracking-wider">READ THE GUIDE</a>
          </div>
        </div>
      </div>
    </section>
  );
}
