import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidAddress } from "@/lib/validate";
import { safeError } from "@/lib/apiError";
import { csrfCheck } from "@/lib/csrf";

const RPC_URL = process.env.RPC_URL || "https://aeneid.storyrpc.io";
const LICENSING_MODULE = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f";
const PIL_TEMPLATE = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316";
const LICENSE_TERMS_ID = 2054;

// POST /api/marketplace/purchase
// Body: { ipId: string, granteeAddress: string }
// Returns: pre-encoded mintLicenseTokens calldata for the user to sign.
//
// This is the on-chain trade flow:
//   1. UI shows a listing (from /app/vaults → "LIST FOR SALE", or from the
//      marketplace page → "PURCHASE").
//   2. User clicks PURCHASE, confirms the price + license terms.
//   3. Client calls this endpoint to get the encoded calldata.
//   4. User signs mintLicenseTokens in their wallet → a license token (ERC-721)
//      is minted to their wallet, scoped to the IP they "bought".
//   5. The license token authorizes them to call /api/cdr/recall for any
//      vault of that IP.
//
// IMPORTANT: this mints a LICENSE (access token) to the buyer, not a transfer
// of the underlying IP. The IP owner keeps ownership. License tokens are
// non-transferable — the buyer can recall memories but cannot resell the
// license. (To re-grant access, the original IP owner must mint a new
// license to a new wallet.)
export async function POST(request: NextRequest) {
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  try {
    const { ipId, granteeAddress, priceWei } = await request.json();
    if (!isValidAddress(ipId)) {
      return NextResponse.json({ error: "Invalid ipId" }, { status: 400 });
    }
    if (!isValidAddress(granteeAddress)) {
      return NextResponse.json({ error: "Invalid granteeAddress" }, { status: 400 });
    }

    const rl = rateLimit(`marketplace-purchase:${getClientIp(request)}`, 30, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetMs: rl.resetMs },
        { status: 429 }
      );
    }

    const { encodeFunctionData } = await import("viem");

    // mintLicenseTokens args:
    //   licensorIpId (address)
    //   licenseTemplate (address)
    //   licenseTermsId (uint256)
    //   amount (uint256) — 1 license per purchase
    //   receiver (address) — buyer's wallet
    //   royaltyContext (bytes) — "0x"
    //   maxMintingFee (uint256) — buyer is willing to pay up to this; we set to
    //     the price the UI quoted (or 0 for free demo flow)
    //   maxRevenueShare (uint32) — buyer accepts this % of derivative revenue
    //     going back to the IP owner. 0 = pure access-only.
    //
    // NOTE on payment: the licensing module's mintLicenseTokens does NOT pull
    // payment itself. Payment happens off-chain (the UI handles it before
    // calling this endpoint, or it's a free demo). The on-chain tx just
    // mints the license.
    const data = encodeFunctionData({
      abi: [{
        name: "mintLicenseTokens", type: "function", stateMutability: "nonpayable",
        inputs: [
          { name: "licensorIpId", type: "address" },
          { name: "licenseTemplate", type: "address" },
          { name: "licenseTermsId", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "receiver", type: "address" },
          { name: "royaltyContext", type: "bytes" },
          { name: "maxMintingFee", type: "uint256" },
          { name: "maxRevenueShare", type: "uint32" },
        ],
        outputs: [{ name: "startLicenseTokenId", type: "uint256" }],
      }],
      functionName: "mintLicenseTokens",
      args: [
        ipId as `0x${string}`,
        PIL_TEMPLATE as `0x${string}`,
        BigInt(LICENSE_TERMS_ID),
        BigInt(1),
        granteeAddress as `0x${string}`,
        "0x" as `0x${string}`,
        priceWei ? BigInt(priceWei) : BigInt(0),
        0,
      ],
    });

    return NextResponse.json({
      success: true,
      chainId: 1315,
      to: LICENSING_MODULE,
      data,
      licenseTermsId: LICENSE_TERMS_ID.toString(),
      pilTemplate: PIL_TEMPLATE,
      ipId,
      receiver: granteeAddress,
    });
  } catch (error) {
    return safeError("Marketplace purchase", error);
  }
}
