import { describe, it, expect } from "vitest";
import {
  addSection,
  createElement,
  centerElementsHorizontally,
  findElement,
  CANONICAL_BASE_WIDTH,
} from "@/features/editor/core/ops";
import { createEditorStore } from "@/features/editor/core/store";
import {
  canonicalDocumentSchema,
  createEmptyDocument,
  type CanonicalDocument,
} from "@/lib/schema";

const assertValid = (doc: CanonicalDocument) => {
  const parsed = canonicalDocumentSchema.safeParse(doc);
  expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error?.issues)).toBe(true);
};

describe("Editor Center Horizontally Operation", () => {
  it("centers single element horizontally relative to CANONICAL_BASE_WIDTH (390px)", () => {
    let doc = createEmptyDocument();
    const secRes = addSection(doc);
    doc = secRes.document;
    const secId = secRes.sectionId;

    const elRes = createElement(doc, secId, "rectangle");
    doc = elRes.document;
    const elId = elRes.elementId!;

    // Set element width = 200, x = 10
    doc = {
      ...doc,
      sections: doc.sections.map((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === elId
            ? { ...el, frame: { ...el.frame, x: 10, y: 50, w: 200, h: 100 } }
            : el,
        ),
      })),
    };

    const centeredDoc = centerElementsHorizontally(doc, [elId]);
    assertValid(centeredDoc);

    const loc = findElement(centeredDoc, elId);
    expect(loc).toBeDefined();
    // expected x = (390 - 200) / 2 = 95
    expect(loc?.element.frame.x).toBe((CANONICAL_BASE_WIDTH - 200) / 2);
    expect(loc?.element.frame.x).toBe(95);
    expect(loc?.element.frame.y).toBe(50); // y unchanged
    expect(loc?.element.frame.w).toBe(200); // width unchanged
  });

  it("centers full-width element (w=390) exactly to x=0", () => {
    let doc = createEmptyDocument();
    const secRes = addSection(doc);
    doc = secRes.document;
    const secId = secRes.sectionId;

    const elRes = createElement(doc, secId, "rectangle");
    doc = elRes.document;
    const elId = elRes.elementId!;

    // Set frame x = 20, w = 390
    doc = {
      ...doc,
      sections: doc.sections.map((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === elId
            ? { ...el, frame: { ...el.frame, x: 20, y: 100, w: 390, h: 250 } }
            : el,
        ),
      })),
    };

    const centeredDoc = centerElementsHorizontally(doc, [elId]);
    const loc = findElement(centeredDoc, elId);
    expect(loc?.element.frame.x).toBe(0);
    assertValid(centeredDoc);
  });

  it("does not move locked elements", () => {
    let doc = createEmptyDocument();
    const secRes = addSection(doc);
    doc = secRes.document;
    const secId = secRes.sectionId;

    const elRes = createElement(doc, secId, "text");
    doc = elRes.document;
    const elId = elRes.elementId!;

    doc = {
      ...doc,
      sections: doc.sections.map((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === elId
            ? { ...el, locked: true, frame: { ...el.frame, x: 15, y: 40, w: 100, h: 40 } }
            : el,
        ),
      })),
    };

    const centeredDoc = centerElementsHorizontally(doc, [elId]);
    const loc = findElement(centeredDoc, elId);
    expect(loc?.element.frame.x).toBe(15);
  });

  it("integrates with store.centerSelectedHorizontally() and supports undo/redo", () => {
    let initialDoc = createEmptyDocument();
    const secRes = addSection(initialDoc);
    initialDoc = secRes.document;
    const secId = secRes.sectionId;

    const elRes = createElement(initialDoc, secId, "text");
    initialDoc = elRes.document;
    const elId = elRes.elementId!;

    initialDoc = {
      ...initialDoc,
      sections: initialDoc.sections.map((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === elId
            ? { ...el, frame: { ...el.frame, x: 30, y: 20, w: 150, h: 40 } }
            : el,
        ),
      })),
    };

    const store = createEditorStore({ document: initialDoc, revision: 1 });
    store.getState().selectElements([elId]);

    // Initial x is 30
    let curr = findElement(store.getState().history.present, elId);
    expect(curr?.element.frame.x).toBe(30);

    // Center horizontally: (390 - 150) / 2 = 120
    store.getState().centerSelectedHorizontally();
    curr = findElement(store.getState().history.present, elId);
    expect(curr?.element.frame.x).toBe(120);

    // Undo should restore x = 30
    store.getState().undo();
    curr = findElement(store.getState().history.present, elId);
    expect(curr?.element.frame.x).toBe(30);

    // Redo should center again x = 120
    store.getState().redo();
    curr = findElement(store.getState().history.present, elId);
    expect(curr?.element.frame.x).toBe(120);
  });
});
