import type { MetadataRoute } from "next";
import { getPublicSiteSettings } from "@/features/site/api";
import { getBaseUrl } from "@/lib/seo/config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSiteSettings().catch(() => null);
  const baseUrl = getBaseUrl(settings);

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/templates",
          "/templates/*",
          "/seller/*",
          "/register-reseller",
          "/api/og*",
          "/api/app-favicon",
          "/images/*",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/editor",
          "/editor/*",
          "/api/*",
          "/i/*",
          "/c/*",
          "/smoke/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
