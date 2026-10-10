/**
 * Built-in Demo Invitation catalog for template previews and live demos.
 * Ensures URLs like `/i/demo-royal-elegant`, `/i/demo-classic-floral`,
 * and `/i/demo-modern-minimal` always resolve to rich, interactive,
 * mobile-responsive public wedding invitations rather than 404s.
 */
import {
  type CanonicalDocument,
  parseDocumentOrThrow,
  migrateDocument,
} from "@/lib/schema";
import { resolveDocument, createVariableRegistry, applyDefaults } from "@/lib/engine";
import type { PublicInvitationModel } from "./types";
import {
  createRoyalElegantDemoDocument,
  createClassicFloralDemoDocument,
  createModernMinimalDemoDocument,
} from "./demo-presets";

export {
  createRoyalElegantDemoDocument,
  createClassicFloralDemoDocument,
  createModernMinimalDemoDocument,
};

function formatGuestName(rawTokenOrName?: string): string | undefined {
  if (!rawTokenOrName || typeof rawTokenOrName !== "string") return undefined;
  const decoded = decodeURIComponent(rawTokenOrName).replace(/[-_+]/g, " ").trim();
  if (!decoded) return undefined;
  // Convert to Title Case
  return decoded
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolves a demo invitation for template previews and live demo links.
 * Checks known template identifiers or resolves via database template slug.
 */
export async function getDemoInvitation(
  slug: string,
  rawGuestTokenOrName?: string,
): Promise<PublicInvitationModel | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean || clean.length > 120) return null;

  const guestName = formatGuestName(rawGuestTokenOrName);
  const guestData = guestName ? { name: guestName } : {};

  let doc: CanonicalDocument | null = null;
  let title = "Undangan Pernikahan Digital";
  let revisionNo = 1;

  // 1. Prioritas utama: Cek apakah template ada di database
  // Jika ada, muat versi yang dipublikasikan (v2, v3, dst) atau draft terakhir.
  try {
    const { getDb } = await import("@/lib/db/client");
    const { findTemplateForDemo, findTemplateVersion } = await import(
      "@/lib/db/repositories/templates"
    );
    const db = await getDb();
    const tpl = await findTemplateForDemo(db, clean);

    if (tpl) {
      title = tpl.name;

      // Prioritas 1.A: Muat TemplateVersion yang telah dipublikasikan (publishedVersionNo)
      if (tpl.publishedVersionNo !== null && tpl.publishedVersionNo > 0) {
        const publishedVer = await findTemplateVersion(db, tpl.id, tpl.publishedVersionNo);
        if (publishedVer && publishedVer.document) {
          doc = parseDocumentOrThrow(migrateDocument(publishedVer.document));
          revisionNo = tpl.publishedVersionNo;
        }
      }

      // Prioritas 1.B: Fallback ke draftDocument jika template belum dipublikasikan
      if (!doc && tpl.draftDocument && (tpl.draftDocument as CanonicalDocument).sections?.length > 0) {
        doc = parseDocumentOrThrow(migrateDocument(tpl.draftDocument));
        revisionNo = 0;
      }
    }
  } catch {
    // Abaikan error koneksi database (misal saat vitest offline / fallback)
  }

  // 2. Jika template tidak ditemukan di database, gunakan preset fallback bawaan
  if (!doc) {
    if (
      clean === "demo-royal-elegant" ||
      clean === "royal-elegant-jawa" ||
      clean === "royal-elegant" ||
      clean.includes("royal") ||
      clean.includes("jawa")
    ) {
      doc = createRoyalElegantDemoDocument();
      title = "Danang & Sekar — Royal Elegant";
    } else if (
      clean === "demo-classic-floral" ||
      clean === "classic-floral-botanical" ||
      clean === "classic-floral" ||
      clean.includes("floral") ||
      clean.includes("botanical") ||
      clean.includes("garden")
    ) {
      doc = createClassicFloralDemoDocument();
      title = "Raka & Salsabila — Classic Floral";
    } else if (
      clean === "demo-modern-minimal" ||
      clean === "modern-minimal-boho" ||
      clean === "modern-minimal" ||
      clean.includes("modern") ||
      clean.includes("minimal") ||
      clean.includes("boho")
    ) {
      doc = createModernMinimalDemoDocument();
      title = "Aditya & Clarissa — Modern Minimal";
    } else if (clean.startsWith("demo-")) {
      // Any other demo-* slug defaults to luxury Royal Elegant demo
      doc = createRoyalElegantDemoDocument();
      title = `Demo Undangan — ${clean.replace(/^demo-/, "").replace(/-/g, " ").toUpperCase()}`;
    }
  }

  if (!doc) return null;

  // Isi default variable values dari template jika tersedia
  const initialData = doc ? applyDefaults(createVariableRegistry(doc.variables), {}) : {};
  const resolved = resolveDocument(doc, initialData, guestData);

  return {
    title,
    slug: clean,
    revisionNo,
    resolved,
    ...(guestName && { guestName }),
    hasGuest: Boolean(guestName),
  };
}
