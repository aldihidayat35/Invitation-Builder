import type { MetadataRoute } from "next";
import { getPublicSiteSettings } from "@/features/site/api";
import { getPublicCatalog } from "@/features/templates/api";
import { getBaseUrl } from "@/lib/seo/config";
import { getDb } from "@/lib/db/client";
import { resellerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, catalog] = await Promise.all([
    getPublicSiteSettings().catch(() => null),
    getPublicCatalog().catch(() => null),
  ]);

  const baseUrl = getBaseUrl(settings);
  const now = new Date();

  // 1. Static high-value landing and onboarding pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/register-reseller`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // 2. Dynamic Template Detail Pages
  const templateRoutes: MetadataRoute.Sitemap = [];
  const presetSlugs = [
    "classic-floral",
    "royal-elegant-jawa",
    "modern-minimal",
    "garden-beauty",
    "serene-promise",
    "sweet-seventeen",
  ];

  const seenSlugs = new Set<string>();

  if (catalog?.items && catalog.items.length > 0) {
    for (const item of catalog.items) {
      if (item.slug && !seenSlugs.has(item.slug.toLowerCase())) {
        seenSlugs.add(item.slug.toLowerCase());
        templateRoutes.push({
          url: `${baseUrl}/templates/${encodeURIComponent(item.slug)}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  }

  // Include preset fallback templates if not already added
  for (const slug of presetSlugs) {
    if (!seenSlugs.has(slug.toLowerCase())) {
      seenSlugs.add(slug.toLowerCase());
      templateRoutes.push({
        url: `${baseUrl}/templates/${slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // 3. Dynamic Reseller Storefront Pages
  const sellerRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = await getDb();
    const activeResellers = await db
      .select({
        slug: resellerProfiles.slug,
        updatedAt: resellerProfiles.updatedAt,
      })
      .from(resellerProfiles)
      .where(eq(resellerProfiles.isActive, true));

    for (const reseller of activeResellers) {
      if (reseller.slug) {
        sellerRoutes.push({
          url: `${baseUrl}/seller/${encodeURIComponent(reseller.slug)}`,
          lastModified: reseller.updatedAt ?? now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.warn("[sitemap] Failed to fetch reseller profiles for sitemap:", error);
  }

  return [...staticRoutes, ...templateRoutes, ...sellerRoutes];
}
