"use client";

import { useEffect, useRef } from "react";

export default function DocsPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Swagger UI from CDN — keeps the bundle small and stays in sync
    // with the upstream spec viewer without us maintaining it.
    const linkId = "swagger-ui-css";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css";
      document.head.appendChild(link);
    }

    const scriptId = "swagger-ui-bundle";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const init = () => {
      const SwaggerUIBundle = (window as unknown as { SwaggerUIBundle?: (opts: Record<string, unknown>) => unknown }).SwaggerUIBundle;
      if (SwaggerUIBundle && ref.current) {
        SwaggerUIBundle({
          url: "/openapi.json",
          domNode: ref.current,
          deepLinking: true,
          presets: [
            (window as unknown as { SwaggerUIBundle: { presets: { SwaggerUIStandalonePreset: unknown } } }).SwaggerUIBundle.presets.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          defaultModelsExpandDepth: -1,
          docExpansion: "list",
          filter: true,
        });
      }
    };

    if ((window as unknown as { SwaggerUIBundle?: unknown }).SwaggerUIBundle) {
      init();
    } else {
      script.addEventListener("load", init, { once: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="border-b border-[#1e1e1e] bg-[#0a0a0a] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl tracking-widest text-[#f2ede6]">AGENTVAULT API DOCS</h1>
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mt-1">
            OPENAPI 3.0 · SPEC AT <a className="text-[#00d9ff] hover:underline" href="/openapi.json">/openapi.json</a>
          </p>
        </div>
        <a
          href="/openapi.json"
          download="openapi.json"
          className="font-mono text-[10px] tracking-widest text-[#00d9ff] border border-[#00d9ff]/30 px-3 py-2 hover:bg-[#00d9ff]/10"
        >
          DOWNLOAD SPEC
        </a>
      </div>
      <div ref={ref} className="swagger-ui-wrap" />
      <style jsx global>{`
        .swagger-ui-wrap { background: #050505; }
        .swagger-ui .info { color: #f2ede6; }
        .swagger-ui .info .title { color: #f2ede6; }
        .swagger-ui .scheme-container { background: #0a0a0a; }
        .swagger-ui .opblock-tag { color: #f2ede6; border-bottom-color: #1e1e1e; }
        .swagger-ui .opblock { background: #0a0a0a; border-color: #1e1e1e; }
        .swagger-ui .opblock .opblock-summary { background: #0a0a0a; }
        .swagger-ui .opblock-body pre { background: #050505; color: #f2ede6; }
        .swagger-ui .opblock-body pre span { color: inherit; }
        .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #5a5a5a; border-bottom-color: #1e1e1e; }
        .swagger-ui .parameter__name, .swagger-ui .parameter__type { color: #5a5a5a; }
        .swagger-ui .response-col_status { color: #f2ede6; }
        .swagger-ui .btn { background: #0a0a0a; color: #f2ede6; border-color: #1e1e1e; }
        .swagger-ui .btn:hover { background: #1e1e1e; }
        .swagger-ui input[type=text], .swagger-ui textarea { background: #050505; color: #f2ede6; border-color: #1e1e1e; }
        .swagger-ui .filter-container { background: #0a0a0a; }
        .swagger-ui .model { color: #f2ede6; }
        .swagger-ui .markdown p, .swagger-ui .markdown li, .swagger-ui .markdown code { color: #f2ede6; }
      `}</style>
    </div>
  );
}
