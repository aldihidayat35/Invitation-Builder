import type { CanonicalDocument, Element } from "@/lib/schema";
import type { ResolvedDocument, ResolvedElement } from "@/lib/engine";
import { INVITATION_FONTS, isGoogleFont } from "./catalog";

/** Event listeners for when a font finishes downloading in the browser. */
type FontLoadListener = () => void;
const listeners = new Set<FontLoadListener>();

export function onFontLoaded(listener: FontLoadListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyFontLoaded() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  }
}

/** Builds a Google Fonts CSS2 URL for a list of font family names. */
export function buildGoogleFontsUrl(families: readonly string[]): string | null {
  const googleFamilies = Array.from(
    new Set(families.map((f) => f.trim()).filter((f) => f.length > 0 && isGoogleFont(f))),
  );
  if (googleFamilies.length === 0) return null;

  // Format: family=Font+Name:wght@400;700 (or simply family=Font+Name)
  const params = googleFamilies
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;600;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Pre-built Google Fonts URL containing all curated invitation Google Fonts. */
let cachedCuratedUrl: string | null = null;
export function getAllCuratedGoogleFontsUrl(): string {
  if (cachedCuratedUrl) return cachedCuratedUrl;
  const families = INVITATION_FONTS.filter((f) => f.isGoogleFont).map((f) => f.family);
  // Break into safe query string
  const params = families
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}`)
    .join("&");
  cachedCuratedUrl = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  return cachedCuratedUrl;
}

/** Collects all unique font family names used in a document (sections + tokens). */
export function collectDocumentFonts(doc: CanonicalDocument | ResolvedDocument): string[] {
  const result = new Set<string>();

  // From design tokens
  const fonts = "tokens" in doc ? doc.tokens?.fonts : doc.design?.tokens?.fonts;
  if (fonts) {
    for (const val of Object.values(fonts)) {
      if (typeof val === "string" && val.trim()) result.add(val.trim());
    }
  }

  // From elements
  const sections = doc.sections ?? [];
  for (const section of sections) {
    for (const el of section.elements as readonly (Element | ResolvedElement)[]) {
      if (el.type === "text" && el.style?.fontFamily) {
        const ff = el.style.fontFamily;
        if (typeof ff === "string" && ff.trim()) {
          result.add(ff.trim());
        }
      }
    }
  }

  return Array.from(result);
}

const loadedFontFamilies = new Set<string>();

/**
 * Client-side: ensures a font family is loaded and available for canvas and DOM rendering.
 * Injects Google Fonts stylesheet if necessary and awaits `document.fonts.load(...)`.
 */
export async function ensureFontLoaded(family: string | undefined): Promise<boolean> {
  if (!family || typeof window === "undefined" || typeof document === "undefined") {
    return true;
  }

  const cleanName = family.trim();
  if (loadedFontFamilies.has(cleanName)) return true;

  // System fonts don't need web loading
  if (!isGoogleFont(cleanName)) {
    loadedFontFamilies.add(cleanName);
    return true;
  }

  // Ensure stylesheet is in head
  const linkId = `dib-gf-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!link) {
    // Also ensure preconnects exist
    if (!document.getElementById("dib-gf-preconnect")) {
      const pc1 = document.createElement("link");
      pc1.id = "dib-gf-preconnect";
      pc1.rel = "preconnect";
      pc1.href = "https://fonts.googleapis.com";
      document.head.appendChild(pc1);

      const pc2 = document.createElement("link");
      pc2.rel = "preconnect";
      pc2.href = "https://fonts.gstatic.com";
      pc2.crossOrigin = "anonymous";
      document.head.appendChild(pc2);
    }

    link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanName).replace(/%20/g, "+")}&display=swap`;
    document.head.appendChild(link);
  }

  try {
    if ("fonts" in document) {
      await document.fonts.load(`16px "${cleanName}"`);
      await document.fonts.load(`bold 16px "${cleanName}"`);
    }
    loadedFontFamilies.add(cleanName);
    notifyFontLoaded();
    return true;
  } catch {
    // Still notify so canvas does not hang waiting
    loadedFontFamilies.add(cleanName);
    notifyFontLoaded();
    return false;
  }
}

/** Preloads the entire curated Google Fonts collection into the editor head. */
export function preloadEditorFonts(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const linkId = "dib-editor-fonts";
  if (document.getElementById(linkId)) return;

  // Add preconnects
  if (!document.getElementById("dib-gf-preconnect")) {
    const pc1 = document.createElement("link");
    pc1.id = "dib-gf-preconnect";
    pc1.rel = "preconnect";
    pc1.href = "https://fonts.googleapis.com";
    document.head.appendChild(pc1);

    const pc2 = document.createElement("link");
    pc2.rel = "preconnect";
    pc2.href = "https://fonts.gstatic.com";
    pc2.crossOrigin = "anonymous";
    document.head.appendChild(pc2);
  }

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = getAllCuratedGoogleFontsUrl();
  link.onload = () => {
    notifyFontLoaded();
  };
  document.head.appendChild(link);
}
