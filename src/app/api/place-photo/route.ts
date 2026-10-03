/**
 * Legacy Google photo-reference endpoint.
 *
 * Google photo resource names can expire and may not be cached. The former
 * implementation accepted cached legacy references and could not guarantee
 * that required author/Google attribution was visible beside the image.
 * Canonical owned/licensed media is rendered directly by the Places UI;
 * provider media stays unavailable until a fresh-details + attributed UI flow
 * is implemented.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#e5e7eb"/></svg>`;

export async function GET(): Promise<Response> {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 410,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Place-Photo-Reason": "legacy-provider-reference-disabled",
    },
  });
}
