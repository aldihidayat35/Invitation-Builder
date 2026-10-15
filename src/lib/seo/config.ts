import type { Metadata } from "next";
import type { AppSettingRow } from "@/lib/db/schema";

/**
 * Returns the canonical base URL for the application.
 * Priority:
 * 1. Admin configured database siteUrl
 * 2. NEXT_PUBLIC_SITE_URL environment variable
 * 3. APP_HOST environment variable
 * 4. Fallback to localhost in development or window location if client-side
 */
export function getBaseUrl(settings?: Partial<AppSettingRow> | null): string {
  if (settings?.siteUrl && isValidHttpUrl(settings.siteUrl)) {
    return stripTrailingSlash(settings.siteUrl);
  }

  if (process.env.NEXT_PUBLIC_SITE_URL && isValidHttpUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (process.env.APP_HOST) {
    const host = process.env.APP_HOST.trim();
    const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function absoluteUrl(path: string, baseUrl?: string): string {
  const base = baseUrl ? stripTrailingSlash(baseUrl) : getBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export interface BuildPublicMetadataOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalPath?: string;
  ogImage?: string | null;
  ogType?: "website" | "article";
  robots?: {
    index?: boolean;
    follow?: boolean;
  };
  settings?: Partial<AppSettingRow> | null;
}

/**
 * Creates standardized rich metadata for public indexing pages.
 */
export function buildPublicMetadata(options: BuildPublicMetadataOptions): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonicalPath = "/",
    ogImage,
    ogType = "website",
    robots = { index: true, follow: true },
    settings,
  } = options;

  const baseUrl = getBaseUrl(settings);
  const appName = settings?.appName || "Undangan.id";
  const defaultTitle = settings?.metaTitle || `${appName} — Template Undangan Digital Elegan & Modern`;
  const defaultDesc =
    settings?.metaDescription ||
    settings?.footerDescription ||
    "Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.";

  const finalTitle = title ? `${title} · ${appName}` : defaultTitle;
  const finalDesc = description || defaultDesc;
  const canonicalUrl = absoluteUrl(canonicalPath, baseUrl);

  // Parse default keywords from settings if any
  const settingsKeywords = settings?.metaKeywords
    ? settings.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [
        "undangan digital",
        "template undangan pernikahan",
        "undangan online website",
        "rsvp online",
        "undangan digital elegan",
        "undangan nikah",
      ];
  const allKeywords = Array.from(new Set([...keywords, ...settingsKeywords]));

  // Default OG image: either custom ogImage passed, admin configured ogImage, or dynamic /api/og
  const resolvedOgImage =
    ogImage ||
    settings?.ogImage ||
    `${baseUrl}/api/og?title=${encodeURIComponent(title || appName)}&desc=${encodeURIComponent(finalDesc.slice(0, 120))}`;

  return {
    metadataBase: new URL(baseUrl),
    title: finalTitle,
    description: finalDesc,
    keywords: allKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: robots.index ?? true,
      follow: robots.follow ?? true,
      googleBot: {
        index: robots.index ?? true,
        follow: robots.follow ?? true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: finalTitle,
      description: finalDesc,
      url: canonicalUrl,
      siteName: appName,
      type: ogType,
      locale: "id_ID",
      images: [
        {
          url: resolvedOgImage,
          width: 1200,
          height: 630,
          alt: finalTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDesc,
      images: [resolvedOgImage],
    },
  };
}
