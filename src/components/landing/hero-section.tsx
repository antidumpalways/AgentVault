"use client";

import { useEffect, useRef, useState } from "react";

const VERBS = ["REMEMBER", "REASON", "SECURE", "EVOLVE", "OWN"];

function AgentParticleCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let t = 0;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,217,255,${p.alpha})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,217,255,${0.05 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        });
      });

      t += 0.016;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}

export function HeroSection() {
  const [verbIdx, setVerbIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(true); }, []);
  useEffect(() => {
    const id = setInterval(() => setVerbIdx(v => (v + 1) % VERBS.length), 640);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden grid-bg pt-[88px]">
      <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] pointer-events-none z-0">
        <AgentParticleCanvas className="w-full h-full" />
      </div>
      <div className="absolute inset-0 pointer-events-none z-0" style={{ background: "radial-gradient(ellipse 50% 60% at 80% 50%, rgba(0,217,255,0.06) 0%, transparent 70%)" }} />
      <div className="relative z-20 max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28 w-full">
        <div className="grid lg:grid-cols-[1fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className={`transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <div className="overflow-hidden">
                <p className="font-mono text-[11px] tracking-[0.2em] text-[#00d9ff] mb-4">— AGENTVAULT · ENCRYPTED AI MEMORY</p>
              </div>
              <h1 className="font-display text-[clamp(4rem,14vw,12rem)] leading-[0.88] tracking-tight text-[#f2ede6] uppercase">AI AGENTS THAT</h1>
              <div className="relative overflow-hidden h-[clamp(4rem,14vw,12rem)] leading-[0.88]">
                <h1 key={verbIdx} className="font-display text-[clamp(4rem,14vw,12rem)] leading-[0.88] tracking-tight text-[#00d9ff] uppercase absolute inset-0" style={{ animation: "fade-up 0.1s ease forwards" }}>{VERBS[verbIdx]}</h1>
              </div>
              <h1 className="font-display text-[clamp(4rem,14vw,12rem)] leading-[0.88] tracking-tight uppercase text-[#f2ede6]">WITH ENCRYPTED MEMORY</h1>
            </div>
            <div className={`mt-14 transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <p className="text-base text-[#5a5a5a] leading-relaxed max-w-xl">AgentVault is the encrypted memory layer for AI agents. Store memories on Story Protocol, recall them across sessions, and grant access via license tokens — your IP, your rules.</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-8 w-fit">
                <a href="/app" className="group inline-flex items-center gap-8 bg-[#00d9ff] text-[#0a0e27] font-mono text-sm tracking-widest px-6 py-4 hover:bg-[#00e6ff] transition-colors font-semibold whitespace-nowrap">LAUNCH DASHBOARD<span className="transition-transform group-hover:translate-x-1">→</span></a>
                <a href="/docs" className="group inline-flex items-center gap-8 border border-[#1e1e1e] text-[#f2ede6] font-mono text-sm tracking-widest px-6 py-4 hover:border-[#00d9ff]/40 hover:text-[#00d9ff] transition-colors whitespace-nowrap">EXPLORE DOCS<span className="transition-transform group-hover:translate-x-1">→</span></a>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <div className="flex -space-x-2">{["#00d9ff","#a78bfa","#10b981","#a78bfa"].map((c) => (<div key={c} className="w-6 h-6 rounded-full border border-[#050505]" style={{ background: c }} />))}</div>
                <span className="font-mono text-[10px] text-[#3a3a3a]">Built for Story Protocol Aeneid testnet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 border-t border-[#1e1e1e] py-5 transition-all duration-700 delay-700 ${visible ? "opacity-100" : "opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="marquee-fast whitespace-nowrap flex gap-16">
            {[...Array(2)].map((_, rep) => (
              <span key={rep} className="inline-flex items-center gap-16">
                {["CDR · DKG-ENCRYPTED","PERSISTENT MEMORY LAYER","ON-CHAIN IP ASSETS","LICENSE-GATED READS","STORY PROTOCOL AENEID","NON-CUSTODIAL","OPEN SOURCE"].map(item => (
                  <span key={item} className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-[#3a3a3a]"><span className="w-1 h-1 bg-[#00d9ff] inline-block shrink-0" />{item}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
