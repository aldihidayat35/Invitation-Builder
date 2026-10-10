import { describe, it, expect } from "vitest";
import {
  addSection,
  createElement,
  createImageElement,
  findElement,
  findGroupElements,
  groupElements,
  mirrorGroupElements,
} from "@/features/editor/core/ops";
import { createEditorStore, type EditorStore } from "@/features/editor/core/store";
import {
  canonicalDocumentSchema,
  createEmptyDocument,
  type CanonicalDocument,
  type TextElement,
  type ImageElement,
  type ShapeElement,
} from "@/lib/schema";

const ASSET_ID = "3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10";

const assertValid = (doc: CanonicalDocument) => {
  const parsed = canonicalDocumentSchema.safeParse(doc);
  expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error?.issues)).toBe(true);
};

describe("Editor Group Mirror / Symmetrical Flip Operations", () => {
  function createGroupSetup(): {
    doc: CanonicalDocument;
    sectionId: string;
    groupId: string;
    textId: string;
    imgId: string;
    shapeId: string;
  } {
    let doc = createEmptyDocument();
    const secRes = addSection(doc);
    doc = secRes.document;
    const secId = secRes.sectionId;

    const t = createElement(doc, secId, "text");
    doc = t.document;
    const s = createElement(doc, secId, "rectangle");
    doc = s.document;
    const img = createImageElement(doc, secId, {
      assetId: ASSET_ID,
      width: 40,
      height: 40,
    });
    doc = img.document;

    const textId = t.elementId!;
    const shapeId = s.elementId!;
    const imgId = img.elementId!;

    // Set frames for a floral corner cluster on the left (x between 20 and 110)
    doc = {
      ...doc,
      sections: doc.sections.map((sec) => ({
        ...sec,
        elements: sec.elements.map((el) => {
          if (el.id === textId) {
            return {
              ...el,
              frame: { x: 20, y: 30, w: 50, h: 25, rotation: 10 },
              style: { ...(el as TextElement).style, textAlign: "left" },
            } as TextElement;
          }
          if (el.id === shapeId) {
            return {
              ...el,
              frame: { x: 40, y: 60, w: 30, h: 30, rotation: 0 },
            } as ShapeElement;
          }
          if (el.id === imgId) {
            return {
              ...el,
              frame: { x: 70, y: 40, w: 40, h: 40, rotation: -15 },
              style: { ...(el as ImageElement).style, flipH: false },
            } as ImageElement;
          }
          return el;
        }),
      })),
    };

    const grpRes = groupElements(doc, [textId, shapeId, imgId], "Ornamen Kiri");
    doc = grpRes.document;
    assertValid(doc);

    return {
      doc,
      sectionId: secId,
      groupId: grpRes.groupId!,
      textId,
      imgId,
      shapeId,
    };
  }

  it("mirrors a group horizontally in-place around its bounding box", () => {
    const { doc, groupId, textId, imgId, shapeId } = createGroupSetup();

    // Group bounding box: minX=20, maxX=110 (70+40), center=65
    const res = mirrorGroupElements(doc, groupId, "horizontal");
    assertValid(res.document);

    const members = findGroupElements(res.document, groupId);
    expect(members).toHaveLength(3);

    const text = members.find((e) => e.id === textId) as TextElement;
    const img = members.find((e) => e.id === imgId) as ImageElement;
    const shape = members.find((e) => e.id === shapeId) as ShapeElement;

    // Original text was x=20, w=50. Inverted x = 2*65 - (20+50) = 130 - 70 = 60
    expect(text.frame.x).toBe(60);
    // Original text rotation was 10. Inverted rotation = normalizeRotation(-10) = -10
    expect(text.frame.rotation).toBe(-10);
    // Text typography stays upright, but alignment inverts from left to right
    expect(text.style.textAlign).toBe("right");

    // Original shape was x=40, w=30. Inverted x = 2*65 - (40+30) = 130 - 70 = 60
    expect(shape.frame.x).toBe(60);

    // Original image was x=70, w=40. Inverted x = 2*65 - (70+40) = 130 - 110 = 20
    expect(img.frame.x).toBe(20);
    expect(img.frame.rotation).toBe(15);
    // Image flipH toggles to true
    expect(img.style.flipH).toBe(true);
  });

  it("mirrors a group vertically in-place around its bounding box", () => {
    const { doc, groupId, imgId } = createGroupSetup();

    const res = mirrorGroupElements(doc, groupId, "vertical");
    assertValid(res.document);

    const members = findGroupElements(res.document, groupId);
    const img = members.find((e) => e.id === imgId) as ImageElement;
    expect(img.style.flipV).toBe(true);
  });

  it("duplicates and mirrors a group horizontally across artboard center (symmetrical counterpart)", () => {
    const { doc, groupId, textId } = createGroupSetup();

    // Group is on the left half (maxX=110 <= 210).
    // Symmetrical reflection across canvas center (195, base width 390):
    const res = mirrorGroupElements(doc, groupId, "horizontal", { duplicate: true });
    assertValid(res.document);

    expect(res.newGroupId).toBeDefined();
    expect(res.newGroupId).not.toBe(groupId);
    expect(res.ids).toHaveLength(3);

    // Original group is untouched
    const originalMembers = findGroupElements(res.document, groupId);
    expect(originalMembers).toHaveLength(3);
    const origText = originalMembers.find((e) => e.id === textId)!;
    expect(origText.frame.x).toBe(20);

    // Duplicated mirrored group is created on the opposite side
    const newMembers = findGroupElements(res.document, res.newGroupId!);
    expect(newMembers).toHaveLength(3);

    const newText = newMembers.find((e) => e.type === "text") as TextElement;
    const newImg = newMembers.find((e) => e.type === "image") as ImageElement;

    // Reflection across 195: x' = 390 - (20 + 50) = 320
    expect(newText.frame.x).toBe(320);
    expect(newText.style.textAlign).toBe("right");
    expect(newText.groupId).toBe(res.newGroupId);
    expect(newText.groupName).toContain("Cermin");

    // Reflection across 195: image was at 70, w=40 -> x' = 390 - 110 = 280
    expect(newImg.frame.x).toBe(280);
    expect(newImg.style.flipH).toBe(true);
  });

  it("handles mirrorSelectedGroup via EditorStore seamlessly", () => {
    const { doc, textId } = createGroupSetup();
    const store: EditorStore = createEditorStore({ document: doc, revision: 1 });

    // Select member in group
    store.getState().selectElements([textId]);

    // Mirror horizontal in place
    store.getState().mirrorSelectedGroup("horizontal");
    const docAfterInPlace = store.getState().history.present;
    assertValid(docAfterInPlace);

    const updatedText = findElement(docAfterInPlace, textId)!.element as TextElement;
    expect(updatedText.frame.x).toBe(60);

    // Duplicate & mirror
    store.getState().mirrorSelectedGroup("horizontal", { duplicate: true });
    const docAfterDupe = store.getState().history.present;
    assertValid(docAfterDupe);

    // Total elements in section increased by 3
    expect(docAfterDupe.sections[0]!.elements).toHaveLength(6);
    // Newly created mirrored elements are selected
    expect(store.getState().selectedIds).toHaveLength(3);
  });
});
