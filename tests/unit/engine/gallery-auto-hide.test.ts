import { describe, it, expect } from "vitest";
import { resolveDocument } from "@/lib/engine/resolve-document";
import type { CanonicalDocument, Element } from "@/lib/schema";

const baseGalleryDoc: CanonicalDocument = {
  schemaVersion: 1,
  design: {
    baseWidth: 390,
    tokens: {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {},
      radii: {},
    },
  },
  variables: [],
  sections: [
    {
      id: "sec_hero",
      baseHeight: 600,
      visible: true,
      overflow: "hidden",
      background: { fit: "cover" },
      elements: [
        {
          id: "el_hero_text",
          type: "text",
          frame: { x: 0, y: 0, w: 200, h: 50, rotation: 0 },
          visible: true,
          locked: false,
          style: { fontSize: 20 },
          content: { segments: [{ text: "The Wedding" }] },
        },
      ],
    },
    {
      id: "sec_gallery",
      name: "Galeri Foto",
      baseHeight: 500,
      visible: true,
      overflow: "hidden",
      background: { fit: "cover" },
      elements: [
        {
          id: "el_gal_title",
          type: "text",
          frame: { x: 0, y: 0, w: 300, h: 40, rotation: 0 },
          visible: true,
          locked: false,
          style: { fontSize: 24 },
          content: { segments: [{ text: "Galeri Kenangan" }] },
        },
        {
          id: "wdg_gallery",
          type: "widget",
          widgetType: "gallery",
          widgetVersion: 1,
          frame: { x: 10, y: 50, w: 370, h: 400, rotation: 0 },
          visible: true,
          locked: false,
          style: {},
          props: {
            items: [
              { src: "/images/sample1.jpg", alt: "Sample 1" },
              { src: "/images/sample2.jpg", alt: "Sample 2" },
            ],
          },
        },
      ],
    },
  ],
};

describe("Gallery Auto-Hide Engine Behavior", () => {
  it("keeps gallery visible in template design mode with no client invitation data", () => {
    const resolved = resolveDocument(baseGalleryDoc, {});
    const gallerySection = resolved.sections.find((s) => s.id === "sec_gallery");
    expect(gallerySection).toBeDefined();
    expect(gallerySection!.hidden).toBe(false);

    const galleryWidget = gallerySection!.elements.find((e) => e.id === "wdg_gallery");
    expect(galleryWidget).toBeDefined();
    expect(galleryWidget!.hidden).toBe(false);
  });

  it("automatically hides gallery section when client invitation has empty gallery items", () => {
    const clientData = {
      "couple.groom.nickname": "Andi",
      "couple.bride.nickname": "Siti",
      "gallery.items": [],
      "gallery.enabled": true,
    };

    const resolved = resolveDocument(baseGalleryDoc, clientData);
    const gallerySection = resolved.sections.find((s) => s.id === "sec_gallery");
    expect(gallerySection!.hidden).toBe(true);

    const galleryWidget = gallerySection!.elements.find((e) => e.id === "wdg_gallery");
    expect(galleryWidget!.hidden).toBe(true);
  });

  it("automatically hides gallery section when client has not input any gallery items", () => {
    // Client data without gallery.items key
    const clientData = {
      "couple.groom.nickname": "Andi",
      "couple.bride.nickname": "Siti",
    };

    const resolved = resolveDocument(baseGalleryDoc, clientData);
    const gallerySection = resolved.sections.find((s) => s.id === "sec_gallery");
    expect(gallerySection!.hidden).toBe(true);

    const galleryWidget = gallerySection!.elements.find((e) => e.id === "wdg_gallery");
    expect(galleryWidget!.hidden).toBe(true);
  });

  it("automatically hides gallery section when gallery.enabled is explicitly false", () => {
    const clientData = {
      "couple.groom.nickname": "Andi",
      "couple.bride.nickname": "Siti",
      "gallery.enabled": false,
      "gallery.items": [{ src: "https://example.com/photo.jpg" }],
    };

    const resolved = resolveDocument(baseGalleryDoc, clientData);
    const gallerySection = resolved.sections.find((s) => s.id === "sec_gallery");
    expect(gallerySection!.hidden).toBe(true);

    const galleryWidget = gallerySection!.elements.find((e) => e.id === "wdg_gallery");
    expect(galleryWidget!.hidden).toBe(true);
  });

  it("shows gallery section and displays uploaded photos when client provides gallery items", () => {
    const clientData = {
      "couple.groom.nickname": "Andi",
      "couple.bride.nickname": "Siti",
      "gallery.enabled": true,
      "gallery.items": [
        { assetId: "12345678-1234-1234-1234-123456789abc", alt: "Prewed 1" },
        { src: "https://example.com/my-photo.jpg", alt: "Prewed 2" },
      ],
    };

    const resolved = resolveDocument(baseGalleryDoc, clientData);
    const gallerySection = resolved.sections.find((s) => s.id === "sec_gallery");
    expect(gallerySection!.hidden).toBe(false);

    const galleryWidget = gallerySection!.elements.find((e) => e.id === "wdg_gallery");
    expect(galleryWidget!.hidden).toBe(false);
    const props = (galleryWidget as unknown as { props: { items: unknown[] } }).props;
    expect(props.items).toHaveLength(2);
  });
});
