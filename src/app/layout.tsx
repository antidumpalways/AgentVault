import type { Metadata } from "next";
import "./globals.css";
import "./suppress-warnings";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "AgentVault",
  description: "Sovereign AI Agent Memory on Story Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
