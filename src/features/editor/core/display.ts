/**
 * Display helpers shared by editor panels and the canvas: token-aware color
 * resolution and human-readable element labels. Pure.
 */
import type { CanonicalDocument, Element, ThemeTokens, VariableDefinition } from "@/lib/schema";
import { getFontFallback } from "@/lib/fonts";

type ColorInput = string | { readonly token: string } | undefined;

export const FALLBACK_COLOR = "#000000";

/** Resolves a hex literal or theme token reference to a hex string (editor display only). */
export function resolveColor(
  value: ColorInput,
  tokens: Pick<ThemeTokens, "colors">,
  fallback: string = FALLBACK_COLOR,
): string {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  return Object.hasOwn(tokens.colors, value.token)
    ? (tokens.colors[value.token] ?? fallback)
    : fallback;
}

export function resolveFontFamily(
  value: string | { readonly token: string } | undefined,
  tokens: Pick<ThemeTokens, "fonts">,
): string {
  const generic = "system-ui, sans-serif";
  if (value === undefined) return generic;
  const name =
    typeof value === "string"
      ? value
      : Object.hasOwn(tokens.fonts, value.token)
        ? tokens.fonts[value.token]
        : undefined;
  if (!name) return generic;
  const fallback = getFontFallback(name);
  return `${name}, ${fallback}`;
}

export const GUEST_PREVIEW_STORAGE_KEY = "dib:editor:guest-preview-name";
export const GUEST_PREVIEW_CHANGED_EVENT = "dib:guest-preview-changed";

/** Reads transient guest preview simulation name from localStorage (browser-only). */
export function getGuestPreviewName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GUEST_PREVIEW_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Updates transient guest preview simulation name and emits a sync event. */
export function setGuestPreviewName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      window.localStorage.removeItem(GUEST_PREVIEW_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_PREVIEW_STORAGE_KEY, trimmed);
    }
    window.dispatchEvent(new CustomEvent(GUEST_PREVIEW_CHANGED_EVENT, { detail: trimmed }));
  } catch {
    // Ignore storage errors in private browsing / SSR
  }
}

/** Plain text preview of a text element; bindings appear as dynamic value, fallback, or `{key}`. */
export function textPreview(
  element: Extract<Element, { type: "text" }>,
  variables?: readonly VariableDefinition[],
  guestPreviewName?: string,
): string {
  return element.content.segments
    .map((s) => {
      if (!("bind" in s)) return s.text;
      if (variables) {
        const found = variables.find((v) => v.key === s.bind);
        if (
          found &&
          "default" in found &&
          typeof found.default === "string" &&
          found.default.length > 0
        ) {
          return found.default;
        }
      }
      if (s.bind === "guest.name" || s.bind === "guest_name" || s.bind === "guestName") {
        const sim = (guestPreviewName ?? getGuestPreviewName()).trim();
        if (sim) return sim;
        if (typeof s.fallback === "string" && s.fallback.length > 0) {
          return s.fallback;
        }
        return "Bapak/Ibu/Saudara(i)";
      }
      if (typeof s.fallback === "string" && s.fallback.length > 0) {
        return s.fallback;
      }
      return `{${s.bind}}`;
    })
    .join("");
}

const TYPE_LABEL: Record<string, string> = {
  text: "Teks",
  image: "Gambar",
  widget: "Widget",
  rectangle: "Persegi",
  circle: "Lingkaran",
  line: "Garis",
};

export function elementTypeLabel(element: Element): string {
  return element.type === "shape"
    ? (TYPE_LABEL[element.shapeType] ?? "Bentuk")
    : (TYPE_LABEL[element.type] ?? element.type);
}

export function elementLabel(element: Element): string {
  if (element.name && element.name.trim() !== "") return element.name;
  if (element.type === "text") {
    const preview = textPreview(element).trim();
    if (preview) return preview.length > 28 ? `${preview.slice(0, 27)}...` : preview;
  }
  return elementTypeLabel(element);
}

export function sectionLabel(doc: CanonicalDocument, sectionId: string): string {
  const index = doc.sections.findIndex((s) => s.id === sectionId);
  const section = doc.sections[index];
  if (!section) return sectionId;
  if (section.isOpening) return section.name?.trim() ? section.name : "Cover Opening (Section 0)";
  const hasOpening = doc.sections.some((s) => s.isOpening);
  const num = hasOpening ? index : index + 1;
  return section.name?.trim() ? section.name : `Section ${num}`;
}
