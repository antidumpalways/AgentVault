import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/validate";
import { csrfCheck } from "@/lib/csrf";
import { safeError } from "@/lib/apiError";
import { getLicensesOwnedBy } from "@/hooks/useGrantLicense";

export async function POST(request: NextRequest) {
  const csrf = csrfCheck(request);
  if (csrf) return csrf;

  try {
    const body = await request.json();
    const { walletAddress } = body as { walletAddress?: string };
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }
    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    }

    const tokenIds = await getLicensesOwnedBy(walletAddress as `0x${string}`);

    return NextResponse.json({
      success: true,
      tokenIds,
      count: tokenIds.length,
    });
  } catch (error) {
    return safeError("license/list-owned", error, 500);
  }
}
