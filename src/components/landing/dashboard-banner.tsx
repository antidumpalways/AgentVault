"use client";

import { useState, useEffect, useRef } from "react";

export function DashboardBanner() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section ref={ref} className="relative border-t border-b border-[#1e1e1e] bg-[#050505]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#00d9ff] mb-3 uppercase">Ready to build?</p>
              <h3 className="font-display text-4xl lg:text-5xl leading-[1.1] tracking-tight text-[#f2ede6] mb-3">Access Your Dashboard</h3>
              <p className="text-sm lg:text-base text-[#5a5a5a] max-w-md">Spawn agents as IP Assets, train with prior memories, and grant license tokens to specific addresses — all from one dashboard.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <a href="/app" className="group inline-flex items-center justify-center gap-3 bg-[#00d9ff] text-[#0a0e27] font-mono text-sm tracking-widest px-6 py-4 hover:bg-[#00e6ff] transition-colors font-semibold whitespace-nowrap">LAUNCH APP<span className="transition-transform group-hover:translate-x-1">→</span></a>
              <a href="/app/vaults" className="group inline-flex items-center justify-center gap-3 border border-[#1e1e1e] text-[#f2ede6] font-mono text-sm tracking-widest px-6 py-4 hover:border-[#00d9ff]/40 hover:text-[#00d9ff] transition-colors whitespace-nowrap">VAULTS<span className="transition-transform group-hover:translate-x-1">→</span></a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-[#1e1e1e]">
            {[{ number: "CDR", label: "threshold-encrypted" }, { number: "IP", label: "on-chain ownership" }, { number: "MIT", label: "open source" }].map((stat) => (
              <div key={stat.label} className="text-center"><div className="font-display text-2xl lg:text-3xl text-[#00d9ff] mb-1">{stat.number}</div><div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest uppercase">{stat.label}</div></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
