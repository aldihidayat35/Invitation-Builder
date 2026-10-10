import { describe, expect, it } from "vitest";
import { addSection, createImageElement } from "@/features/editor/core/ops";
import { createEmptyDocument } from "@/lib/schema";
import { createEditorStore } from "@/features/editor/core/store";
import {
  dataUrlToBlob,
  extractFilenameFromUrl,
  extractImageFilesFromDataTransfer,
  hasImageFiles,
  isImageUrlString,
} from "@/features/editor/utils/external-image-handler";

function createTestDocWithSection() {
  const empty = createEmptyDocument();
  return addSection(empty).document;
}

describe("External Image Paste & Drop", () => {
  describe("createImageElement with targetPosition", () => {
    it("places image at custom target position when provided", () => {
      const doc = createTestDocWithSection();
      const secId = doc.sections[0]!.id;
      const { document: nextDoc, elementId } = createImageElement(
        doc,
        secId,
        {
          assetId: "3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10",
          width: 800,
          height: 600,
          name: "Foto Pernikahan",
        },
        { x: 120, y: 250 },
      );

      expect(elementId).toBeTruthy();
      const el = nextDoc.sections[0]!.elements.find((e) => e.id === elementId);
      expect(el).toBeDefined();
      expect(el?.type).toBe("image");
      expect(el?.frame.x).toBe(120);
      expect(el?.frame.y).toBe(250);
      // Maintains max width 300 & aspect ratio (600/800 = 0.75 -> 225)
      expect(el?.frame.w).toBe(300);
      expect(el?.frame.h).toBe(225);
    });

    it("falls back to default placement when targetPosition is omitted", () => {
      const doc = createTestDocWithSection();
      const secId = doc.sections[0]!.id;
      const { document: nextDoc, elementId } = createImageElement(doc, secId, {
        assetId: "3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10",
        width: 100,
        height: 100,
      });

      const el = nextDoc.sections[0]!.elements.find((e) => e.id === elementId);
      expect(el).toBeDefined();
      // Default placement centers it horizontally: (CANONICAL_BASE_WIDTH 390 - 100) / 2 = 145
      expect(el?.frame.x).toBe(145);
      expect(el?.frame.w).toBe(100);
      expect(el?.frame.h).toBe(100);
    });
  });

  describe("store.addImage with options", () => {
    it("adds image to specified section and target position", () => {
      const initial = createTestDocWithSection();
      const store = createEditorStore({ document: initial, revision: 1 });
      // Add a second section
      store.getState().addSection();
      const sec2Id = store.getState().history.present.sections[1]!.id;

      store.getState().addImage(
        {
          assetId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          url: "https://storage.example.com/asset.png",
          width: 600,
          height: 600,
          name: "Bunga Hiasan",
        },
        {
          position: { x: 45, y: 80 },
          sectionId: sec2Id,
        },
      );

      const sec2 = store.getState().history.present.sections[1]!;
      const inserted = sec2.elements.find((e) => e.name === "Bunga Hiasan");
      expect(inserted).toBeDefined();
      expect(inserted?.frame.x).toBe(45);
      expect(inserted?.frame.y).toBe(80);
      expect(store.getState().activeSectionId).toBe(sec2Id);
      expect(store.getState().selectedIds).toContain(inserted?.id);
    });
  });

  describe("isImageUrlString utility", () => {
    it("recognizes direct image extensions", () => {
      expect(isImageUrlString("https://example.com/banner.jpg")).toBe(true);
      expect(isImageUrlString("https://example.com/banner.jpeg")).toBe(true);
      expect(isImageUrlString("https://example.com/icon.png")).toBe(true);
      expect(isImageUrlString("https://example.com/anim.webp")).toBe(true);
      expect(isImageUrlString("https://example.com/anim.gif")).toBe(true);
      expect(isImageUrlString("https://example.com/vector.svg")).toBe(true);
      expect(isImageUrlString("https://example.com/banner.png?v=2&size=large")).toBe(true);
    });

    it("recognizes data URIs", () => {
      expect(isImageUrlString("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")).toBe(true);
      expect(isImageUrlString("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...")).toBe(true);
    });

    it("recognizes popular photo service URLs", () => {
      expect(isImageUrlString("https://images.unsplash.com/photo-1519741497674-611481863552")).toBe(true);
      expect(isImageUrlString("https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg")).toBe(true);
      expect(isImageUrlString("https://i.imgur.com/ABC1234.png")).toBe(true);
    });

    it("recognizes query parameters specifying image format", () => {
      expect(isImageUrlString("https://example.com/get-media?id=123&format=jpg")).toBe(true);
      expect(isImageUrlString("https://example.com/get-media?id=123&type=png")).toBe(true);
    });

    it("rejects non-image URLs and normal text", () => {
      expect(isImageUrlString("Halo apa kabar?")).toBe(false);
      expect(isImageUrlString("https://example.com/index.html")).toBe(false);
      expect(isImageUrlString("https://google.com/search?q=undangan")).toBe(false);
      expect(isImageUrlString("")).toBe(false);
      expect(isImageUrlString("   ")).toBe(false);
      expect(isImageUrlString("not a url at all")).toBe(false);
    });
  });

  describe("extractFilenameFromUrl utility", () => {
    it("extracts clean filename from URL pathname", () => {
      expect(extractFilenameFromUrl("https://example.com/images/floral-frame.png")).toBe("floral-frame.png");
      expect(extractFilenameFromUrl("https://example.com/assets/wedding%20photo.jpg?w=800")).toBe("wedding photo.jpg");
    });

    it("returns default filename if pathname has no file extension", () => {
      const res = extractFilenameFromUrl("https://images.unsplash.com/photo-12345");
      expect(res).toMatch(/^image-\d+\.png$/);
    });
  });

  describe("dataUrlToBlob utility", () => {
    it("converts simple data URL to Blob", () => {
      // 1x1 transparent png base64
      const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const blob = dataUrlToBlob(pngBase64);
      expect(blob).not.toBeNull();
      expect(blob?.type).toBe("image/png");
      expect(blob?.size).toBeGreaterThan(0);
    });

    it("returns null for malformed data URL", () => {
      expect(dataUrlToBlob("invalid-data-url")).toBeNull();
    });
  });

  describe("DataTransfer helpers", () => {
    it("extracts files with image mime type", () => {
      const dummyFile = new File(["dummy content"], "photo.png", { type: "image/png" });
      const dt = {
        files: [dummyFile] as unknown as FileList,
        items: [] as unknown as DataTransferItemList,
        types: ["Files"],
      } as unknown as DataTransfer;

      const extracted = extractImageFilesFromDataTransfer(dt);
      expect(extracted).toHaveLength(1);
      expect(extracted[0]?.name).toBe("photo.png");
    });

    it("detects presence of image files", () => {
      const dt = {
        files: [] as unknown as FileList,
        items: [{ kind: "file", type: "image/jpeg" }] as unknown as DataTransferItemList,
        types: ["Files"],
      } as unknown as DataTransfer;

      expect(hasImageFiles(dt)).toBe(true);
    });
  });
});
