"use client";

import { useEffect, useRef, useState } from "react";

const CERTS = ["STORY IP ASSET", "CDR · DKG-ENCRYPTED", "LICENSE-GATED RECALL", "NON-CUSTODIAL", "OPEN SOURCE"];
const FEATURES = [
  { id: "01", tag: "ENCRYPTION", title: "THRESHOLD-ENCRYPTED STORAGE", desc: "Memories encrypted via Story CDR's distributed key generation. Decryption requires network validator consensus, not a single keyholder." },
  { id: "02", tag: "OWNERSHIP", title: "ON-CHAIN IP PROOFS", desc: "Every agent is a Story Protocol IP Asset. Ownership and license grants are provable on-chain — verifiable in any block explorer." },
  { id: "03", tag: "AUDITABILITY", title: "ON-CHAIN CDR LOG", desc: "Every encrypt/recall transaction is recorded on Story Aeneid. The full memory lifecycle is auditable from your wallet." },
  { id: "04", tag: "ACCESS", title: "LICENSE-GATED RECALL", desc: "Memory recall requires a Story license token. You decide who decrypts your data — not a platform admin." },
];

export function SecuritySection() {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section id="security" ref={ref} className="relative border-t border-[#1e1e1e] bg-[#080808] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className={`border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 transition-all duration-500 ${vis ? "opacity-100" : "opacity-0"}`}>
          <div>
            <span className="sys-tag mb-3 block">SECURITY</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[0.88] tracking-tight text-[#f2ede6]">YOUR MEMORIES<br /><span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>YOUR KEYS</span></h2>
          </div>
          <div className="flex flex-wrap gap-2">{CERTS.map((c, i) => (<span key={c} className={`font-mono text-[9px] tracking-widest border border-[#2e2e2e] px-3 py-2 text-[#5a5a5a] hover:border-[#00d9ff]/40 hover:text-[#00d9ff] transition-all duration-200 cursor-default ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: `${i * 50 + 200}ms` }}>{c}</span>))}</div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 border-b border-[#1e1e1e]">
          {FEATURES.map((f, i) => (
            <div key={f.id} className={`border-r border-[#1e1e1e] last:border-r-0 p-6 row-hover transition-all duration-500 group ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-4"><span className="sys-tag text-[9px]">{f.tag}</span><span className="font-mono text-[9px] text-[#2e2e2e]">{f.id}</span></div>
              <h3 className="font-display text-2xl leading-[0.9] text-[#f2ede6] mb-3 group-hover:text-[#00d9ff] transition-colors">{f.title}</h3>
              <p className="text-sm text-[#5a5a5a] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="py-5 flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#3a3a3a]">THRESHOLD-ENCRYPTED · ON-CHAIN IP · LICENSE-GATED READS</span>
          <a href="/docs" className="font-mono text-[10px] text-[#00d9ff] hover:underline tracking-wider">API REFERENCE →</a>
        </div>
      </div>
    </section>
  );
}
