import { NextResponse, type NextRequest } from "next/server";
import { getPublicSiteSettings } from "@/features/site/api";
import { getPublicSellerStorefront } from "@/features/reseller/api";

export const dynamic = "force-dynamic";

export const DEFAULT_SVG_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>
  <!-- Background Container -->
  <rect width="64" height="64" rx="16" fill="url(#primaryGrad)" />
  <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" />
  
  <!-- Envelope Silhouette -->
  <g filter="url(#softGlow)">
    <rect x="13" y="19" width="38" height="26" rx="4" fill="#ffffff" fill-opacity="0.95" />
    <!-- Envelope Flap Lines -->
    <path d="M14 20L32 34L50 20" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <!-- Heart / Seal -->
    <circle cx="32" cy="32" r="5.5" fill="url(#goldAccent)" />
    <path d="M32 30.5C32.8 29.5 34.5 29.6 34.8 30.6C35.1 31.7 33.6 32.8 32 33.8C30.4 32.8 28.9 31.7 29.2 30.6C29.5 29.6 31.2 29.5 32 30.5Z" fill="#ffffff" />
  </g>
</svg>`;

function parseDataUrl(dataUrl: string): { contentType: string; buffer: Uint8Array } | null {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match || !match[1] || match[3] === undefined) return null;
  const contentType = match[1];
  const isBase64 = match[2] === ";base64";
  const rawData = match[3];
  try {
    const nodeBuf = isBase64
      ? Buffer.from(rawData, "base64")
      : Buffer.from(decodeURIComponent(rawData), "utf-8");
    return { contentType, buffer: new Uint8Array(nodeBuf) };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerSlug = searchParams.get("seller");

    let logoCandidate: string | null = null;

    // 1. If seller storefront requested, check seller branding logo first
    if (sellerSlug) {
      const seller = await getPublicSellerStorefront(sellerSlug).catch(() => null);
      if (seller?.profile.logoUrl) {
        logoCandidate = seller.profile.logoUrl.trim();
      }
    }

    // 2. Fall back to global appLogo from site settings
    if (!logoCandidate) {
      const settings = await getPublicSiteSettings().catch(() => null);
      if (settings?.appLogo) {
        logoCandidate = settings.appLogo.trim();
      }
    }

    // 3. Serve logo candidate if present
    if (logoCandidate) {
      // 3A. Data URL (uploaded via FileReader in AppSettingsForm)
      if (logoCandidate.startsWith("data:")) {
        const parsed = parseDataUrl(logoCandidate);
        if (parsed) {
          return new NextResponse(parsed.buffer as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": parsed.contentType,
              "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
            },
          });
        }
      }

      // 3B. External or Absolute HTTP/HTTPS URL
      if (logoCandidate.startsWith("http://") || logoCandidate.startsWith("https://")) {
        return NextResponse.redirect(logoCandidate, { status: 307 });
      }

      // 3C. Relative URL path (e.g. /api/assets/..., /uploads/...)
      if (logoCandidate.startsWith("/")) {
        return NextResponse.redirect(new URL(logoCandidate, request.url), { status: 307 });
      }
    }

    // 4. Fallback to clean, responsive SVG favicon
    return new NextResponse(DEFAULT_SVG_FAVICON, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[app-favicon] error resolving dynamic favicon:", error);
    return new NextResponse(DEFAULT_SVG_FAVICON, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
