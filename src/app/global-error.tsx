"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AgentVault] Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#050505",
          color: "#f2ede6",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#00d9ff",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            SYS // ERROR
          </div>
          <h1 style={{ fontSize: 24, margin: "0 0 12px", fontWeight: 600 }}>
            Something broke
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: 14,
              lineHeight: 1.5,
              margin: "0 0 24px",
            }}
          >
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#00d9ff",
              color: "#050505",
              border: "none",
              padding: "10px 20px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
