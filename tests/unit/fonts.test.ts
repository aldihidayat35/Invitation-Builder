import { describe, expect, it, vi } from "vitest";
import {
  FONT_CATEGORIES,
  INVITATION_FONTS,
  buildGoogleFontsUrl,
  collectDocumentFonts,
  getFontFallback,
  isGoogleFont,
  onFontLoaded,
} from "@/lib/fonts";
import { fontNameSchema } from "@/lib/schema/primitives";
import type { CanonicalDocument } from "@/lib/schema";

describe("Font Catalog", () => {
  it("defines at least 80 curated fonts across all 6 categories", () => {
    expect(INVITATION_FONTS.length).toBeGreaterThanOrEqual(80);
    expect(FONT_CATEGORIES.length).toBe(6);

    for (const cat of FONT_CATEGORIES) {
      const fontsInCat = INVITATION_FONTS.filter((f) => f.category === cat.id);
      expect(fontsInCat.length).toBeGreaterThan(0);
    }
  });

  it("every font family name strictly passes fontNameSchema", () => {
    for (const font of INVITATION_FONTS) {
      const parsed = fontNameSchema.safeParse(font.family);
      expect(parsed.success, `Font family "${font.family}" failed fontNameSchema`).toBe(true);
    }
  });

  it("correctly identifies Google Fonts and system fonts", () => {
    expect(isGoogleFont("Great Vibes")).toBe(true);
    expect(isGoogleFont("Playfair Display")).toBe(true);
    expect(isGoogleFont("Plus Jakarta Sans")).toBe(true);
    expect(isGoogleFont("Pacifico")).toBe(true);
    expect(isGoogleFont("Arial")).toBe(false);
    expect(isGoogleFont("Georgia")).toBe(false);
    expect(isGoogleFont("Unknown Nonexistent")).toBe(false);
  });

  it("resolves appropriate category-aware fallbacks", () => {
    expect(getFontFallback("Great Vibes")).toBe("cursive, sans-serif");
    expect(getFontFallback("Pacifico")).toBe("cursive, sans-serif");
    expect(getFontFallback("Playfair Display")).toBe("serif");
    expect(getFontFallback("Georgia")).toBe("serif");
    expect(getFontFallback("Inter")).toBe("sans-serif");
    expect(getFontFallback("Cinzel Decorative")).toBe("serif");
    expect(getFontFallback("Custom Unknown")).toBe("sans-serif");
  });
});

describe("Font Loader & Document Collection", () => {
  it("buildGoogleFontsUrl produces valid url or null when empty", () => {
    expect(buildGoogleFontsUrl([])).toBeNull();
    expect(buildGoogleFontsUrl(["Arial", "Georgia"])).toBeNull();

    const url = buildGoogleFontsUrl(["Great Vibes", "Playfair Display"]);
    expect(url).not.toBeNull();
    expect(url).toContain("https://fonts.googleapis.com/css2?");
    expect(url).toContain("family=Great+Vibes");
    expect(url).toContain("family=Playfair+Display");
  });

  it("collectDocumentFonts gathers fonts from tokens and text elements", () => {
    const mockDoc: CanonicalDocument = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: {
          colors: {},
          fonts: {
            heading: "Cormorant Garamond",
            body: "Plus Jakarta Sans",
          },
          spacing: {},
        },
      },
      variables: [],
      sections: [
        {
          id: "s1",
          name: "Cover",
          visible: true,
          baseHeight: 800,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "visible",
          elements: [
            {
              id: "t1",
              type: "text",
              name: "Title",
              visible: true,
              locked: false,
              frame: { x: 0, y: 0, w: 200, h: 50, rotation: 0 },
              content: { segments: [{ text: "Hello" }] },
              style: {
                fontSize: 24,
                fontWeight: 400,
                lineHeight: 1.2,
                letterSpacing: 0,
                textAlign: "left",
                opacity: 1,
                color: "#000000",
                fontFamily: "Great Vibes",
              },
            },
            {
              id: "shp1",
              type: "shape",
              shapeType: "rectangle",
              name: "Box",
              visible: true,
              locked: false,
              frame: { x: 0, y: 0, w: 100, h: 100, rotation: 0 },
              style: { radius: 0, opacity: 1 },
            },
          ],
        },
      ],
    };

    const collected = collectDocumentFonts(mockDoc);
    expect(collected).toContain("Cormorant Garamond");
    expect(collected).toContain("Plus Jakarta Sans");
    expect(collected).toContain("Great Vibes");
    expect(collected.length).toBe(3);
  });

  it("onFontLoaded adds listener and returns cleanup function", () => {
    const listener = vi.fn();
    const unsubscribe = onFontLoaded(listener);
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});
