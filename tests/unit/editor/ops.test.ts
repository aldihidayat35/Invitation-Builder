/**
 * PRD refs: FR-EDT-002/003/006/009, AC-08, P-03 (documents stay schema-valid).
 */
import {
  addSection,
  collectIds,
  createElement,
  deleteElements,
  deleteSection,
  duplicateElements,
  duplicateSection,
  ELEMENT_KINDS,
  findElement,
  moveSection,
  nudgeElements,
  reorderElements,
  setFrames,
  setLocked,
  setVisible,
  shiftSection,
  updateElement,
  updateElementFrame,
  updateElementStyle,
  updateSection,
  type ElementKind,
} from "@/features/editor/core/ops";
import { canonicalDocumentSchema, createEmptyDocument, type CanonicalDocument } from "@/lib/schema";

const assertValid = (doc: CanonicalDocument) => {
  const parsed = canonicalDocumentSchema.safeParse(doc);
  expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error.issues)).toBe(true);
  const ids = [...doc.sections.flatMap((s) => [s.id, ...s.elements.map((e) => e.id)])];
  expect(new Set(ids).size).toBe(ids.length);
};

function docWithSections(n: number): CanonicalDocument {
  let doc = createEmptyDocument();
  for (let i = 0; i < n; i++) doc = addSection(doc).document;
  return doc;
}

function ids(doc: CanonicalDocument, sectionIndex = 0) {
  return doc.sections[sectionIndex]!.elements.map((e) => e.id);
}

describe("section operations (FR-EDT-009)", () => {
  it("adds sections with the default 844 height, in order, with unique ids", () => {
    const doc = docWithSections(3);
    expect(doc.sections.map((s) => s.id)).toEqual(["sec_1", "sec_2", "sec_3"]);
    expect(doc.sections.every((s) => s.baseHeight === 844)).toBe(true);
    assertValid(doc);
  });

  it("inserts after a given section", () => {
    const doc = docWithSections(2);
    const result = addSection(doc, { afterSectionId: "sec_1" });
    expect(result.document.sections.map((s) => s.id)).toEqual(["sec_1", result.sectionId, "sec_2"]);
  });

  it("reorders sections (scroll order) and clamps indexes", () => {
    const doc = docWithSections(3);
    expect(moveSection(doc, "sec_3", 0).sections.map((s) => s.id)).toEqual([
      "sec_3",
      "sec_1",
      "sec_2",
    ]);
    expect(shiftSection(doc, "sec_1", 1).sections.map((s) => s.id)).toEqual([
      "sec_2",
      "sec_1",
      "sec_3",
    ]);
    expect(shiftSection(doc, "sec_1", -1)).toBe(doc);
    expect(moveSection(doc, "sec_1", 99).sections.at(-1)!.id).toBe("sec_1");
    expect(moveSection(doc, "missing", 0)).toBe(doc);
  });

  it("duplicates a section with fresh, globally unique element ids", () => {
    let doc = docWithSections(1);
    doc = createElement(doc, "sec_1", "text").document;
    doc = createElement(doc, "sec_1", "circle").document;
    const result = duplicateSection(doc, "sec_1");
    expect(result.document.sections).toHaveLength(2);
    const copy = result.document.sections[1]!;
    expect(copy.id).not.toBe("sec_1");
    expect(copy.elements).toHaveLength(2);
    expect(copy.elements.map((e) => e.frame)).toEqual(
      doc.sections[0]!.elements.map((e) => e.frame),
    );
    assertValid(result.document);
  });

  it("deletes sections and updates height/background through the schema", () => {
    let doc = docWithSections(2);
    expect(deleteSection(doc, "sec_1").sections.map((s) => s.id)).toEqual(["sec_2"]);
    expect(deleteSection(doc, "nope")).toBe(doc);

    doc = updateSection(doc, "sec_1", { baseHeight: 1200, background: { color: "#112233" } });
    expect(doc.sections[0]).toMatchObject({ baseHeight: 1200, background: { color: "#112233" } });
    // Out-of-range height and invalid colors are rejected (document unchanged).
    expect(updateSection(doc, "sec_1", { baseHeight: 5 })).toBe(doc);
    expect(updateSection(doc, "sec_1", { background: { color: "red" as never } })).toBe(doc);
    assertValid(doc);
  });
});

describe("element creation (FR-EDT-006)", () => {
  it.each(ELEMENT_KINDS)("creates a valid %s element inside the section", (kind: ElementKind) => {
    const base = docWithSections(1);
    const { document, elementId } = createElement(base, "sec_1", kind);
    expect(elementId).not.toBeNull();
    const el = findElement(document, elementId!)!.element;
    expect(el.frame.w).toBeGreaterThan(0);
    expect(el.frame.x).toBeGreaterThanOrEqual(0);
    expect(el.frame.x + el.frame.w).toBeLessThanOrEqual(390 + 16 * 6);
    expect(el.visible).toBe(true);
    expect(el.locked).toBe(false);
    assertValid(document);
  });

  it("creates the expected element types", () => {
    let doc = docWithSections(1);
    for (const kind of ELEMENT_KINDS) doc = createElement(doc, "sec_1", kind).document;
    const summary = doc.sections[0]!.elements.map((e) =>
      e.type === "shape" ? `shape:${e.shapeType}` : e.type,
    );
    expect(summary).toEqual([
      "text",
      "shape:rectangle",
      "shape:circle",
      "shape:line",
      "shape:circle",
    ]);
    expect(
      doc.sections[0]!.elements[3]!.type === "shape" && doc.sections[0]!.elements[3]!.style.stroke,
    ).toBeTruthy();
  });

  it("returns the same document for an unknown section", () => {
    const doc = docWithSections(1);
    expect(createElement(doc, "nope", "text")).toEqual({ document: doc, elementId: null });
  });
});

describe("transforms (FR-EDT-002) and lock/hide (FR-EDT-003)", () => {
  const make = () => {
    let doc = docWithSections(1);
    const a = createElement(doc, "sec_1", "rectangle");
    doc = a.document;
    const b = createElement(doc, "sec_1", "text");
    return { doc: b.document, a: a.elementId!, b: b.elementId! };
  };

  it("commits position, size and rotation and keeps them", () => {
    const { doc, a } = make();
    const next = setFrames(doc, { [a]: { x: 10.123, y: 20, w: 99.999, h: 30, rotation: 395 } });
    expect(findElement(next, a)!.element.frame).toEqual({
      x: 10.12,
      y: 20,
      w: 100,
      h: 30,
      rotation: 35,
    });
    assertValid(next);
  });

  it("returns the same reference for unchanged or invalid frames", () => {
    const { doc, a } = make();
    const same = findElement(doc, a)!.element.frame;
    expect(setFrames(doc, { [a]: same })).toBe(doc);
    expect(setFrames(doc, { [a]: { ...same, x: Number.NaN } })).toBe(doc);
    expect(setFrames(doc, { [a]: { ...same, x: 1e9 } })).toBe(doc);
  });

  it("clamps zero/negative sizes to the minimum", () => {
    const { doc, a } = make();
    const next = setFrames(doc, { [a]: { x: 0, y: 0, w: -5, h: 0, rotation: 0 } });
    expect(findElement(next, a)!.element.frame).toMatchObject({ w: 1, h: 1 });
  });

  it("locked elements cannot be moved, nudged, resized or deleted, but can be unlocked", () => {
    const { doc, a, b } = make();
    const locked = setLocked(doc, [a], true);
    const before = findElement(locked, a)!.element;
    expect(setFrames(locked, { [a]: { ...before.frame, x: 5 } })).toBe(locked);
    expect(nudgeElements(locked, [a], 10, 10)).toBe(locked);
    expect(deleteElements(locked, [a])).toBe(locked);
    expect(updateElementFrame(locked, a, { w: 10 })).toBe(locked);
    // Others in the same call still move.
    const mixed = nudgeElements(locked, [a, b], 10, 0);
    expect(findElement(mixed, a)!.element.frame.x).toBe(before.frame.x);
    expect(findElement(mixed, b)!.element.frame.x).toBe(
      findElement(locked, b)!.element.frame.x + 10,
    );

    const unlocked = setLocked(locked, [a], false);
    expect(findElement(unlocked, a)!.element.locked).toBe(false);
    assertValid(mixed);
  });

  it("hide/show is a single `visible` property that persists in the document", () => {
    const { doc, a } = make();
    const hidden = setVisible(doc, [a], false);
    expect(findElement(hidden, a)!.element.visible).toBe(false);
    expect(setVisible(hidden, [a], false)).toBe(hidden);
    expect(findElement(setVisible(hidden, [a], true), a)!.element.visible).toBe(true);
  });

  it("nudges by 1 and 10 px", () => {
    const { doc, a } = make();
    const x0 = findElement(doc, a)!.element.frame.x;
    expect(findElement(nudgeElements(doc, [a], 1, 0), a)!.element.frame.x).toBe(x0 + 1);
    expect(findElement(nudgeElements(doc, [a], 0, -10), a)!.element.frame.y).toBe(
      findElement(doc, a)!.element.frame.y - 10,
    );
  });
});

describe("duplicate / delete / style", () => {
  it("duplicates with offset, new ids on top, unlocked copies", () => {
    let doc = docWithSections(1);
    const a = createElement(doc, "sec_1", "text");
    doc = setLocked(a.document, [a.elementId!], true);
    const result = duplicateElements(doc, [a.elementId!]);
    expect(result.ids).toHaveLength(1);
    const copy = findElement(result.document, result.ids[0]!)!;
    const original = findElement(result.document, a.elementId!)!;
    expect(copy.element.frame.x).toBe(original.element.frame.x + 16);
    expect(copy.element.locked).toBe(false);
    expect(copy.index).toBe(1);
    assertValid(result.document);
  });

  it("deletes the given elements only", () => {
    let doc = docWithSections(1);
    for (const k of ["text", "rectangle", "circle"] as const)
      doc = createElement(doc, "sec_1", k).document;
    const [a, b, c] = ids(doc);
    expect(ids(deleteElements(doc, [b!]))).toEqual([a, c]);
    expect(deleteElements(doc, ["nope"])).toBe(doc);
  });

  it("applies style patches through the schema and rejects invalid ones", () => {
    let doc = docWithSections(1);
    const t = createElement(doc, "sec_1", "text");
    doc = t.document;
    const next = updateElementStyle(doc, t.elementId!, {
      fontSize: 40,
      color: "#ff0000",
      opacity: 0.5,
    });
    const el = findElement(next, t.elementId!)!.element;
    expect(el.type === "text" && el.style).toMatchObject({
      fontSize: 40,
      color: "#ff0000",
      opacity: 0.5,
    });
    expect(updateElementStyle(doc, t.elementId!, { opacity: 5 })).toBe(doc);
    expect(updateElementStyle(doc, t.elementId!, { color: "javascript:alert(1)" })).toBe(doc);
    expect(updateElementStyle(doc, t.elementId!, { onClick: "x" })).toBe(doc);
    assertValid(next);
  });

  it("keeps the old element when updateElement would produce an invalid one", () => {
    let doc = docWithSections(1);
    const t = createElement(doc, "sec_1", "rectangle");
    doc = t.document;
    expect(updateElement(doc, t.elementId!, (e) => ({ ...e, id: "bad id!" }))).toBe(doc);
  });
});

describe("z-order / layers (FR-EDT-003, AC-08)", () => {
  const setup = () => {
    let doc = docWithSections(1);
    for (const k of ["text", "rectangle", "circle", "line"] as const) {
      doc = createElement(doc, "sec_1", k).document;
    }
    return { doc, order: ids(doc) };
  };

  it("brings forward / sends backward one step", () => {
    const { doc, order } = setup();
    const [a, b, c, d] = order as [string, string, string, string];
    expect(ids(reorderElements(doc, "sec_1", [a], "forward"))).toEqual([b, a, c, d]);
    expect(ids(reorderElements(doc, "sec_1", [d], "backward"))).toEqual([a, b, d, c]);
    expect(reorderElements(doc, "sec_1", [d], "forward")).toBe(doc);
    expect(reorderElements(doc, "sec_1", [a], "backward")).toBe(doc);
  });

  it("moves to front / back preserving relative order of a multi-selection", () => {
    const { doc, order } = setup();
    const [a, b, c, d] = order as [string, string, string, string];
    expect(ids(reorderElements(doc, "sec_1", [b, a], "front"))).toEqual([c, d, a, b]);
    expect(ids(reorderElements(doc, "sec_1", [d, c], "back"))).toEqual([c, d, a, b]);
  });

  it("moves a selected block forward past one neighbour", () => {
    const { doc, order } = setup();
    const [a, b, c, d] = order as [string, string, string, string];
    expect(ids(reorderElements(doc, "sec_1", [a, b], "forward"))).toEqual([c, a, b, d]);
  });
});

describe("document stays valid under many random operations", () => {
  it("survives 300 seeded random edits (schema valid + unique ids)", () => {
    let seed = 1234567;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;

    let doc = docWithSections(2);
    for (let i = 0; i < 300; i++) {
      const sections = doc.sections;
      const all = sections.flatMap((s) => s.elements.map((e) => e.id));
      const op = Math.floor(rand() * 11);
      if (op === 0 || sections.length === 0) doc = addSection(doc).document;
      else if (op === 1 && sections.length > 1) doc = deleteSection(doc, pick(sections).id);
      else if (op === 2) doc = duplicateSection(doc, pick(sections).id).document;
      else if (op === 3) doc = shiftSection(doc, pick(sections).id, rand() < 0.5 ? -1 : 1);
      else if (op <= 5) doc = createElement(doc, pick(sections).id, pick(ELEMENT_KINDS)).document;
      else if (all.length === 0) continue;
      else if (op === 6) doc = deleteElements(doc, [pick(all)]);
      else if (op === 7) doc = duplicateElements(doc, [pick(all)]).document;
      else if (op === 8) {
        doc = setFrames(doc, {
          [pick(all)]: {
            x: rand() * 400 - 20,
            y: rand() * 900,
            w: rand() * 300 + 1,
            h: rand() * 300 + 1,
            rotation: rand() * 720 - 360,
          },
        });
      } else if (op === 9) doc = setLocked(doc, [pick(all)], rand() < 0.5);
      else {
        const s = pick(sections);
        if (s.elements.length > 0)
          doc = reorderElements(
            doc,
            s.id,
            [pick(s.elements).id],
            pick(["forward", "backward", "front", "back"] as const),
          );
      }
      if (i % 25 === 0) assertValid(doc);
    }
    assertValid(doc);
    expect(collectIds(doc).size).toBeGreaterThan(2);
  });
});
