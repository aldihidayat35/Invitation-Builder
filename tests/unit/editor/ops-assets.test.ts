/**
 * PRD refs: FR-EDT-008 (image element), FR-VAR-001 (variable creation), P-03 (docs stay valid).
 */
import { describe, expect, it } from "vitest";
import {
  IMAGE_INSERT_MAX_WIDTH,
  addSection,
  addVariable,
  createImageElement,
  uniqueVariableKey,
} from "@/features/editor/core/ops";
import { canonicalDocumentSchema, createEmptyDocument } from "@/lib/schema";

const ASSET = "3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10";

function docWithSection() {
  const { document, sectionId } = addSection(createEmptyDocument(), {});
  return { doc: document, sectionId };
}

describe("createImageElement", () => {
  it("keeps the aspect ratio, caps the width and produces a schema-valid document", () => {
    const { doc, sectionId } = docWithSection();
    const { document, elementId } = createImageElement(doc, sectionId, {
      assetId: ASSET,
      width: 1200,
      height: 600,
      name: "cover.jpg",
    });
    const el = document.sections[0]!.elements.find((e) => e.id === elementId)!;
    expect(el.type).toBe("image");
    expect(el.frame.w).toBe(IMAGE_INSERT_MAX_WIDTH);
    expect(el.frame.h).toBe(150);
    expect(canonicalDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("does not enlarge small images", () => {
    const { doc, sectionId } = docWithSection();
    const { document, elementId } = createImageElement(doc, sectionId, {
      assetId: ASSET,
      width: 100,
      height: 100,
    });
    expect(document.sections[0]!.elements.find((e) => e.id === elementId)!.frame.w).toBe(100);
  });

  it("returns a null element id for an unknown section", () => {
    const { doc } = docWithSection();
    expect(
      createImageElement(doc, "nope", { assetId: ASSET, width: 10, height: 10 }).elementId,
    ).toBeNull();
  });
});

describe("addVariable / uniqueVariableKey", () => {
  it("adds a valid variable and ignores duplicates and invalid definitions", () => {
    const base = createEmptyDocument();
    const next = addVariable(base, { key: "media.cover", type: "image", label: "Cover" });
    expect(next.variables.map((v) => v.key)).toContain("media.cover");
    expect(addVariable(next, { key: "media.cover", type: "image", label: "Again" })).toBe(next);
    expect(addVariable(base, { key: "Bad Key!", type: "text", label: "x" })).toBe(base);
    expect(canonicalDocumentSchema.safeParse(next).success).toBe(true);
  });

  it("generates the first free key", () => {
    let doc = createEmptyDocument();
    expect(uniqueVariableKey(doc, "photo")).toBe("photo");
    doc = addVariable(doc, { key: "photo", type: "image", label: "A" });
    expect(uniqueVariableKey(doc, "photo")).toBe("photo2");
    doc = addVariable(doc, { key: "photo2", type: "image", label: "B" });
    expect(uniqueVariableKey(doc, "photo")).toBe("photo3");
  });
});
