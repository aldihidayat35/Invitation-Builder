import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/repositories/settings";
import { getPublicCatalog } from "@/features/templates/api";
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
  const [currentUser, appSettings, catalog] = await Promise.all([
    getCurrentUser().catch(() => null),
    getAppSettings().catch(() => null),
    getPublicCatalog().catch(() => null),
  ]);

  return (
    <LandingView
      currentUser={currentUser}
      appSettings={appSettings}
      catalogTemplates={catalog?.items}
    />
  );
}
