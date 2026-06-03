"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { WalletProvider } from "@/hooks/useWallet";
import { StoreProvider } from "@/hooks/useAppStore";
import { ToastContainer } from "@/components/Toast";

const shortcuts: Record<string, string> = {
  "s": "/app/spawn",
  "t": "/app/train",
  "b": "/app/brain",
  "a": "/app/analytics",
  "m": "/app/marketplace",
};

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isDashboard = pathname.startsWith("/app");

  useEffect(() => {
    let gPressed = false;
    const handler = (e: KeyboardEvent) => {
      // Skip shortcuts while user is typing in an input/textarea/contenteditable.
      // Without this, typing "go" or "ga" in a form field triggers navigation.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
        if (target.closest("input, textarea, [contenteditable='true']")) return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "g" || e.key === "G") {
        gPressed = true;
        setTimeout(() => (gPressed = false), 500);
        return;
      }
      if (gPressed && shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        router.push(shortcuts[e.key.toLowerCase()]);
        gPressed = false;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return (
    <WalletProvider>
      <StoreProvider>
        {isLanding && children}
        {!isLanding && !isDashboard && (
          <main className="min-h-screen">{children}</main>
        )}
        {isDashboard && children}
        <ToastContainer />
      </StoreProvider>
    </WalletProvider>
  );
}
