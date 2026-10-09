import "server-only";

import { getDb } from "@/lib/db/client";
import { getAppSettings } from "@/lib/db/repositories/settings";
import { listPublicTestimonials } from "@/lib/db/repositories/testimonials";

export async function getPublicSiteSettings() {
  return getAppSettings(await getDb());
}

export async function getPublicTestimonials() {
  return listPublicTestimonials(await getDb());
}
