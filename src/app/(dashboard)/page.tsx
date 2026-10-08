import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/repositories/settings";
import { getPublicCatalog, getTemplateCategories } from "@/features/templates/api";
import { getDb } from "@/lib/db/client";
import { listPublicTestimonials } from "@/lib/db/repositories/testimonials";
import { LandingView } from "./landing-view";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings().catch(() => null);
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
  const dbPromise = getDb().catch(() => null);

  const [currentUser, appSettings, catalog, categories, reviews] = await Promise.all([
    getCurrentUser().catch(() => null),
    getAppSettings().catch(() => null),
    getPublicCatalog().catch(() => null),
    getTemplateCategories().catch(() => []),
    dbPromise.then((db) => (db ? listPublicTestimonials(db) : [])).catch(() => []),
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

