import type { Metadata } from "next";
import "./globals.css";
import "./suppress-warnings";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "AgentVault",
  description: "Sovereign AI Agent Memory on Story Protocol",
};

const walletConflictGuard = `
(function() {
  try {
    var desc = Object.getOwnPropertyDescriptor(window, 'ethereum');
    if (desc && !desc.writable && !desc.set) {
      var current = desc.get && desc.get.call(window);
      Object.defineProperty(window, 'ethereum', {
        value: current,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {}
  window.addEventListener('error', function(ev) {
    var msg = (ev && ev.message) || '';
    if (msg.indexOf('Cannot set property ethereum') !== -1 ||
        msg.indexOf('which has only a getter') !== -1) {
      ev.preventDefault();
      ev.stopImmediatePropagation && ev.stopImmediatePropagation();
      return true;
    }
  }, true);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: walletConflictGuard }} />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
