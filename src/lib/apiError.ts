import { NextResponse } from "next/server";

// Map internal errors to safe client-facing messages.
// Logs the full error server-side, returns only a generic string.

const SAFE_MESSAGES: Record<string, string> = {
  WalletMissing: "Server signer not configured",
  RateLimit: "Rate limit exceeded",
  InvalidAddress: "Invalid wallet address",
  MissingField: "Missing required field",
  NotConfigured: "Service not configured",
};

export function safeError(
  context: string,
  error: unknown,
  status: number = 500
): NextResponse {
  console.error(`[${context}]`, error);
  const message = error instanceof Error ? error.message : "Unknown error";

  // Match known safe messages
  for (const [key, safe] of Object.entries(SAFE_MESSAGES)) {
    if (message.includes(key)) {
      return NextResponse.json({ error: safe }, { status });
    }
  }

  return NextResponse.json({ error: "Internal server error" }, { status });
}
