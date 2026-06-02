"use client";

import { useState, useEffect } from "react";

interface Toast {
  id: number;
  message: string;
  txHash?: string;
  type: "success" | "error" | "info";
}

let toastId = 0;

export function showToast(message: string, txHash?: string, type: "success" | "error" | "info" = "success") {
  const event = new CustomEvent("toast", {
    detail: { id: ++toastId, message, txHash, type },
  });
  window.dispatchEvent(event);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: CustomEvent<Toast>) => {
      setToasts((prev) => [...prev, e.detail]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== e.detail.id));
      }, 4000);
    };

    window.addEventListener("toast", handler as EventListener);
    return () => window.removeEventListener("toast", handler as EventListener);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-[#0e0e0e] border border-[#1e1e1e] px-4 py-3 flex items-center gap-3 min-w-[320px]"
        >
          <div
            className={`w-2 h-2 ${
              toast.type === "success"
                ? "bg-[#22c55e]"
                : toast.type === "error"
                ? "bg-[#f87171]"
                : "bg-[#5a5a5a]"
            }`}
          />
          <div className="flex-1">
            <p className="font-mono text-sm text-[#f2ede6]">{toast.message}</p>
            {toast.txHash && (
              <a
                href={`https://aeneid.storyscan.io/tx/${toast.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#3a3a3a] hover:text-[#00d9ff] transition-colors"
              >
                {toast.txHash.slice(0, 10)}... →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
