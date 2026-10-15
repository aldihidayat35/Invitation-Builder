import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { getPublicCatalog, getTemplateCategories } from "@/features/templates/api";
import { getPublicSiteSettings, getPublicTestimonials } from "@/features/site/api";
import { LandingView } from "./landing-view";
import { buildPublicMetadata, getBaseUrl } from "@/lib/seo/config";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings().catch(() => null);
  const appName = settings?.appName || "Undangan.id";
  const tagline = settings?.appTagline || "Template Undangan Digital";
  const desc =
    settings?.metaDescription ||
    settings?.footerDescription ||
    "Temukan template undangan digital yang elegan dan mudah disesuaikan untuk momen spesialmu. Ribuan template siap digunakan.";

  return buildPublicMetadata({
    title: `${appName} — ${tagline}`,
    description: desc,
    canonicalPath: "/",
    keywords: [
      "undangan digital",
      "undangan online",
      "template undangan pernikahan",
      "buat undangan digital",
      "rsvp online",
      "amplop digital",
    ],
    settings,
  });
}

export default async function HomePage() {
  const [currentUser, appSettings, catalog, categories, reviews] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicSiteSettings().catch(() => null),
    getPublicCatalog().catch(() => null),
    getTemplateCategories().catch(() => []),
    getPublicTestimonials().catch(() => []),
  ]);

  const siteUrl = getBaseUrl(appSettings);
  const siteName = appSettings?.appName || "Undangan.id";

  return (
    <>
      <WebSiteJsonLd
        siteUrl={siteUrl}
        siteName={siteName}
        searchUrl={`${siteUrl}/#template?q=`}
      />
      <OrganizationJsonLd
        name={appSettings?.companyName || siteName}
        url={siteUrl}
        logo={appSettings?.appLogo ? `${siteUrl}${appSettings.appLogo}` : undefined}
        contactPhone={appSettings?.contactPhone}
        contactWhatsapp={appSettings?.contactWhatsapp}
        address={appSettings?.address}
      />
      <LandingView
        currentUser={currentUser}
        appSettings={appSettings}
        catalogTemplates={catalog?.items}
        categories={categories}
        reviews={reviews}
      />
    </>
  );
}
