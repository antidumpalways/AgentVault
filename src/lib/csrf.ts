import { NextRequest, NextResponse } from "next/server";

// CSRF protection: verify the request originates from our own origin.
// Browsers always send Origin (and Referer) on cross-origin requests, while
// direct API calls from CLI/server can include them explicitly.
//
// Allow requests with no Origin (server-to-server) and Origin matching
// our configured host or the Vercel preview URL.

const ALLOWED_HOSTS = new Set<string>([
  "localhost:3000",
  "127.0.0.1:3000",
  "agentvault.vercel.app",
]);

function getAllowedHost(): string | null {
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return null;
}

export function csrfCheck(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = getAllowedHost();

  // No origin/referer at all — likely server-to-server, allow.
  if (!origin && !referer) return null;

  const source = origin || referer || "";
  let sourceHost = "";
  try {
    sourceHost = new URL(source).host;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (ALLOWED_HOSTS.has(sourceHost)) return null;
  if (host && sourceHost === host) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
