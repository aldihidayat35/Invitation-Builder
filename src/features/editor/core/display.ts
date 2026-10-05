/**
 * Display helpers shared by editor panels and the canvas: token-aware color
 * resolution and human-readable element labels. Pure.
 */
import type { CanonicalDocument, Element, ThemeTokens } from "@/lib/schema";
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

/** Plain text preview of a text element; bindings appear as `{key}`. */
export function textPreview(element: Extract<Element, { type: "text" }>): string {
  return element.content.segments.map((s) => ("bind" in s ? `{${s.bind}}` : s.text)).join("");
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
