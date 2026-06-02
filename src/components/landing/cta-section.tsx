"use client";

import { useEffect, useRef, useState } from "react";

function DotWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let t = 0;
    const SPACING = 28;
    const DOT_R = 1.5;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const bx = col * SPACING;
          const by = row * SPACING;
          const wave = Math.sin((col * 0.35) + (row * 0.35) - t * 2.2);
          const dy = wave * 5;
          const alpha = 0.06 + Math.abs(wave) * 0.22;
          ctx.beginPath();
          ctx.arc(bx, by + dy, DOT_R, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,217,255,${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }
      t += 0.016;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export function CtaSection() {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section className="relative border-t border-[#1e1e1e]">
      <div ref={ref} className={`max-w-[1400px] mx-auto px-6 lg:px-12 transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="border border-[#1e1e1e] relative overflow-hidden my-12 lg:my-16">
          <DotWaveCanvas />
          <div className="absolute top-0 left-0 w-16 h-16 border-r border-b border-[#00d9ff]/30" />
          <div className="absolute top-0 right-0 w-16 h-16 border-l border-b border-[#00d9ff]/30" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-r border-t border-[#00d9ff]/30" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-l border-t border-[#00d9ff]/30" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(0,217,255,0.04) 0%, transparent 70%)" }} />
          <div className="relative z-10 px-8 lg:px-20 py-16 lg:py-24 text-center">
            <div className="flex items-center justify-center gap-3 mb-10"><span className="status-pulse w-2 h-2 rounded-full bg-[#22c55e] inline-block" /><span className="font-mono text-[11px] tracking-[0.2em] text-[#22c55e]">AGENTVAULT · READY</span></div>
            <h2 className="font-display text-[clamp(3.5rem,12vw,10rem)] leading-[0.88] tracking-tight text-[#f2ede6] uppercase mb-4">BUILD YOUR FIRST<br /><span className="text-[#00d9ff]">SECURE AGENT</span><br />TODAY.</h2>
            <p className="font-mono text-sm text-[#5a5a5a] mb-12 max-w-lg mx-auto leading-relaxed">Join 1,200+ agents protecting their memory. Free tier includes encrypted storage for 1K memories/month.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/app" className="group inline-flex items-center gap-4 bg-[#00d9ff] text-[#0a0e27] font-mono text-sm tracking-widest px-8 py-5 hover:bg-[#00e6ff] transition-colors font-semibold">GO TO DASHBOARD<span className="transition-transform group-hover:translate-x-1">→</span></a>
              <a href="/app/marketplace" className="group inline-flex items-center gap-4 border border-[#2e2e2e] text-[#5a5a5a] font-mono text-sm tracking-widest px-8 py-5 hover:border-[#00d9ff]/40 hover:text-[#00d9ff] transition-colors">VIEW MARKETPLACE<span className="transition-transform group-hover:translate-x-1">→</span></a>
            </div>
            <div className="flex items-center justify-center gap-8 mt-10 flex-wrap">
              {[{ v: "1.2K+", l: "agents secured" }, { v: "10B+", l: "memories stored" }, { v: "100%", l: "encrypted" }, { v: "E2E", l: "zero-knowledge" }].map(s => (<div key={s.l} className="text-center"><div className="font-display text-2xl text-[#00d9ff]">{s.v}</div><div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">{s.l}</div></div>))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
