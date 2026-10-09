import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { getPublicCatalog, getTemplateCategories } from "@/features/templates/api";
import { getPublicSiteSettings, getPublicTestimonials } from "@/features/site/api";
import { LandingView } from "./landing-view";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings().catch(() => null);
  const appName = settings?.appName || "Undangan.id";
  const tagline = settings?.appTagline || "Template Undangan Digital";
  return {
    title: `${appName} — ${tagline}`,
    description:
      settings?.footerDescription ||
      "Temukan template undangan digital yang elegan dan mudah disesuaikan untuk momen spesialmu. Ribuan template siap digunakan.",
  };
}

export default async function HomePage() {
  const [currentUser, appSettings, catalog, categories, reviews] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicSiteSettings().catch(() => null),
    getPublicCatalog().catch(() => null),
    getTemplateCategories().catch(() => []),
    getPublicTestimonials().catch(() => []),
  ]);

  return (
    <LandingView
      currentUser={currentUser}
      appSettings={appSettings}
      catalogTemplates={catalog?.items}
      categories={categories}
      reviews={reviews}
    />
  );
}
