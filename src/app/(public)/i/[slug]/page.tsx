import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublic } from "@/features/invitations/api";
import { getDemoInvitation } from "@/features/invitations/demo-catalog";
import { getBaseUrl, absoluteUrl } from "@/lib/seo/config";
import { DocumentRenderer } from "@/features/renderer";
import { PublicContextProvider } from "@/features/widgets/runtime";
import { ExpiredInvitationView } from "./ExpiredInvitationView";

/** Live data: always read the active snapshot at request time (FR-PUB-001). */
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(
  props: PageProps<"/i/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const query = props.searchParams ? await props.searchParams : {};
  const rawTo = first(query.to);
  const rawGuest = first(query.guest);
  const guestToken = rawGuest && rawGuest.length <= 160 ? rawGuest : undefined;
  const guestName = rawTo && rawTo.length <= 160 ? rawTo : undefined;

  const invitation =
    (await getPublic(slug, guestToken, { guestName }).catch(() => null)) ||
    (await getPublic(slug, guestToken, { guestName, allowDraft: true }).catch(() => null)) ||
    (await getDemoInvitation(slug, guestName || guestToken));

  if (!invitation) {
    return {
      title: "Undangan",
      robots: { index: false, follow: false },
    };
  }

  // 0. Resolusi dinamis Host & Base URL dari HTTP Request Masuk
  // Ini krusial agar scraper WhatsApp/Facebook mendapatkan URL absolut berdomain aktif
  // (misal https://samawadigital.com) bukan fallback localhost:3000.
  let dynamicBaseUrl: string | undefined = undefined;
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    if (host) {
      const proto =
        headerList.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      dynamicBaseUrl = `${proto}://${host}`;
    }
  } catch {
    // Abaikan jika dipanggil di luar konteks request HTTP (misal unit test)
  }

  // Load app settings if available for site branding and canonical domain
  let settings = null;
  try {
    const { getAppSettings } = await import("@/lib/db/repositories/settings");
    settings = await getAppSettings();
  } catch {
    // Fallback if DB unavailable or during build
  }

  const baseUrl = dynamicBaseUrl || getBaseUrl(settings);
  const siteName = settings?.appName || "Undangan Digital";

  // 1. OG Title: Pintar & Otomatis sesuai tipe acara (FR-OG-TITLE)
  // - Acara Pernikahan -> "The Wedding of [Nama Mempelai]"
  // - Acara Non-Pernikahan (Aqiqah/Khitan/dsb) -> Gunakan Judul Asli Acara (misal "Tasyakuran Aqiqah - Arash Shaquille Attaqi")
  const groomBride = invitation.groomBrideNames?.trim();
  const isWeddingEvent =
    Boolean(groomBride) ||
    /wedding|nikah|pernikahan|mempelai/i.test(invitation.title);

  let ogTitle: string;
  if (groomBride) {
    ogTitle = groomBride.toLowerCase().startsWith("the wedding of")
      ? groomBride
      : `The Wedding of ${groomBride}`;
  } else if (isWeddingEvent) {
    ogTitle = invitation.title.toLowerCase().startsWith("the wedding of")
      ? invitation.title
      : `The Wedding of ${invitation.title}`;
  } else {
    // Non-pernikahan (Aqiqah, Khitan, Ulang Tahun, Tasyakuran, Seminar, dsb)
    ogTitle = invitation.title.trim();
  }

  if (invitation.isClosed) {
    ogTitle = `Undangan Telah Selesai — ${ogTitle}`;
  }

  // 2. OG Description: Tanggal acara terformat ("Kamis, 30 Juli 2026") atau deskripsi kategori acara
  let defaultDescription = "Undangan Digital";
  if (isWeddingEvent) {
    defaultDescription = "Undangan Pernikahan Digital";
  } else if (/aqiqah/i.test(invitation.title)) {
    defaultDescription = "Undangan Tasyakuran Aqiqah Digital";
  } else if (/khitan/i.test(invitation.title)) {
    defaultDescription = "Undangan Walimatul Khitan Digital";
  }

  const ogDescription =
    invitation.eventDateFormatted?.trim() ||
    defaultDescription;

  // 3. OG Image (Hybrid priority: Client Cover/Photo > Template Thumbnail > Dynamic OG Banner)
  let rawImage = invitation.coverPhotoUrl || invitation.templateThumbnailUrl;
  if (!rawImage) {
    const encodedTitle = encodeURIComponent(ogTitle);
    const encodedDesc = encodeURIComponent(ogDescription);
    const badgeText = isWeddingEvent ? "THE WEDDING OF" : "UNDANGAN RESMI";
    rawImage = `/api/og?title=${encodedTitle}&desc=${encodedDesc}&badge=${encodeURIComponent(badgeText)}`;
  }

  const ogImageUrl =
    rawImage.startsWith("http://") || rawImage.startsWith("https://")
      ? rawImage
      : absoluteUrl(rawImage, baseUrl);

  const canonicalPath = rawTo
    ? `/i/${slug}?to=${encodeURIComponent(rawTo)}`
    : `/i/${slug}`;
  const canonicalUrl = absoluteUrl(canonicalPath, baseUrl);

  const pageTitle = invitation.isClosed
    ? `${invitation.groomBrideNames || invitation.title} — Undangan Telah Selesai`
    : `${invitation.title}${invitation.isDraft ? " (Pratinjau)" : ""} — Undangan Digital`;

  const mimeType = ogImageUrl.includes(".png")
    ? "image/png"
    : ogImageUrl.includes(".webp")
    ? "image/webp"
    : "image/jpeg";

  return {
    metadataBase: new URL(baseUrl),
    title: pageTitle,
    description: ogDescription,
    robots: { index: false, follow: false },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: canonicalUrl,
      siteName,
      title: ogTitle,
      description: ogDescription,
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl.startsWith("https://") ? ogImageUrl : undefined,
          width: 1200,
          height: 630,
          alt: ogTitle,
          type: mimeType,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImageUrl],
    },
  };
}

/**
 * Public invitation page. Renders the active PublishedSnapshot through
 * the DocumentRenderer. If not published yet, renders the draft preview
 * so clients can review their invitation seamlessly (P-04, FR-PRV-001).
 * If not found in the DB (e.g. template catalog live previews
 * like /i/demo-royal-elegant), resolves the interactive demo invitation model.
 */
export default async function PublicInvitationPage({
  params,
  searchParams,
}: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const rawTo = first(query.to);
  const rawGuest = first(query.guest);
  const guestToken = rawGuest && rawGuest.length <= 160 ? rawGuest : undefined;
  const guestName = rawTo && rawTo.length <= 160 ? rawTo : undefined;

  // 1. Try published snapshot first
  let invitation = await getPublic(slug, guestToken, { guestName }).catch(() => null);

  // 2. If not published, render draft preview for client review / inspection
  if (!invitation) {
    invitation = await getPublic(slug, guestToken, { guestName, allowDraft: true }).catch(
      () => null,
    );
  }

  // 3. Fallback to interactive demo catalog invitation
  if (!invitation) {
    invitation = await getDemoInvitation(slug, guestName || guestToken);
  }

  if (!invitation) notFound();

  // If invitation is closed or expired, render the closed notice view
  if (invitation.isClosed) {
    return (
      <ExpiredInvitationView
        title={invitation.title}
        groomBrideNames={invitation.groomBrideNames}
        closedReason={invitation.closedReason}
        publishedAt={invitation.publishedAt}
        expiresAt={invitation.expiresAt}
      />
    );
  }

  return (
    <main data-testid="public-invitation" lang="id">
      <h1 className="dib-visually-hidden">{invitation.title}</h1>
      {invitation.isDraft && (
        <aside
          role="status"
          aria-label="Mode Pratinjau Review"
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: "rgba(24, 21, 19, 0.92)",
            color: "#D4AF37",
            padding: "6px 14px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
            pointerEvents: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>👁️</span>
          <span>MODE PRATINJAU / REVIEW KLIEN</span>
        </aside>
      )}
      <PublicContextProvider
        value={{
          slug: invitation.slug,
          ...(invitation.guestToken && { guestToken: invitation.guestToken }),
          ...(invitation.guestName !== undefined && { guestName: invitation.guestName }),
        }}
      >
        <DocumentRenderer document={invitation.resolved} runtimeMode="public" />
      </PublicContextProvider>
    </main>
  );
}
