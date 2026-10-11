import { describe, expect, it, beforeEach } from "vitest";
import { snapToGuides, snapToSection } from "@/features/editor/core/geometry";
import {
  createEditorStore,
  CANVAS_GRID_STORAGE_KEY,
  getStoredCanvasGrid,
} from "@/features/editor/core/store";
import { createEmptyDocument } from "@/lib/schema";
import { addSection } from "@/features/editor/core/ops";

describe("Snap Guides Colors & Categorization", () => {
  const section = { width: 390, height: 844 };

  it("marks section center snap with kind 'section-center'", () => {
    // Canvas center is width / 2 = 195.
    // Object with width 200 placed at x: 93 -> object center is 193 (near 195).
    const res = snapToSection({ x: 93, y: 100, w: 200, h: 50, rotation: 0 }, section);
    expect(res.dx).toBe(2);
    expect(res.guides.vertical).toContain(195);
    expect(res.guides.detailedVertical).toEqual([
      { pos: 195, kind: "section-center" },
    ]);
  });

  it("marks section edge snap with kind 'section-edge'", () => {
    // Left edge snap: object at x: 3 -> snaps to 0 with dx: -3
    const res = snapToSection({ x: 3, y: 100, w: 50, h: 50, rotation: 0 }, section);
    expect(res.dx).toBe(-3);
    expect(res.guides.vertical).toContain(0);
    expect(res.guides.detailedVertical).toEqual([
      { pos: 0, kind: "section-edge" },
    ]);
  });

  it("marks neighbour element snap with kind 'object'", () => {
    const neighbour = { x: 50, y: 100, w: 100, h: 60, rotation: 0 };
    // Object near neighbour left edge 50: at x: 52 -> snaps dx: -2
    const res = snapToGuides(
      { x: 52, y: 250, w: 80, h: 40, rotation: 0 },
      section,
      [neighbour],
    );
    expect(res.dx).toBe(-2);
    expect(res.guides.vertical).toContain(50);
    expect(res.guides.detailedVertical).toEqual([
      { pos: 50, kind: "object" },
    ]);
  });

  it("distinguishes section center (green) from neighbour elements (cyan) and section edge (pink)", () => {
    const neighbour = { x: 250, y: 300, w: 80, h: 50, rotation: 0 };
    // Object snapped to section center on X (195) and neighbour on Y (300)
    const res = snapToGuides(
      { x: 93, y: 298, w: 200, h: 40, rotation: 0 },
      section,
      [neighbour],
    );
    expect(res.dx).toBe(2); // snaps to 195
    expect(res.dy).toBe(2); // snaps to 300

    expect(res.guides.detailedVertical).toContainEqual({
      pos: 195,
      kind: "section-center",
    });
    expect(res.guides.detailedHorizontal).toContainEqual({
      pos: 300,
      kind: "object",
    });
  });
});

describe("Canvas Grid Store and Toggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("initializes with showCanvasGrid false by default", () => {
    const doc = addSection(createEmptyDocument()).document;
    const store = createEditorStore({ document: doc, revision: 1 });
    expect(store.getState().showCanvasGrid).toBe(false);
  });

  it("toggles and persists canvas grid state", () => {
    const doc = addSection(createEmptyDocument()).document;
    const store = createEditorStore({ document: doc, revision: 1 });

    store.getState().toggleCanvasGrid();
    expect(store.getState().showCanvasGrid).toBe(true);
    expect(window.localStorage.getItem(CANVAS_GRID_STORAGE_KEY)).toBe("true");

    store.getState().toggleCanvasGrid();
    expect(store.getState().showCanvasGrid).toBe(false);
    expect(window.localStorage.getItem(CANVAS_GRID_STORAGE_KEY)).toBe("false");
  });

  it("sets canvas grid explicitly and syncs from storage", () => {
    const doc = addSection(createEmptyDocument()).document;
    const store = createEditorStore({ document: doc, revision: 1 });

    store.getState().setCanvasGrid(true);
    expect(store.getState().showCanvasGrid).toBe(true);
    expect(getStoredCanvasGrid()).toBe(true);

    window.localStorage.setItem(CANVAS_GRID_STORAGE_KEY, "false");
    store.getState().syncCanvasGridFromStorage();
    expect(store.getState().showCanvasGrid).toBe(false);
  });

  it("prevents SSR hydration mismatch: initial store state is deterministic even if localStorage contains true", () => {
    window.localStorage.setItem(CANVAS_GRID_STORAGE_KEY, "true");
    const doc = addSection(createEmptyDocument()).document;
    const store = createEditorStore({ document: doc, revision: 1 });

    // Initial state MUST be false to match SSR HTML
    expect(store.getState().showCanvasGrid).toBe(false);

    // After hydration effect runs, it syncs to true safely
    store.getState().syncCanvasGridFromStorage();
    expect(store.getState().showCanvasGrid).toBe(true);
  });
});

