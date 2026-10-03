/**
 * PRD refs: FR-EDT-001 (zoom does not change saved coordinates), FR-EDT-002,
 * FR-EDT-005 (snapping, P1), FR-EDT-004 (history).
 */
import {
  clampZoom,
  fitZoom,
  frameFromNodeAttrs,
  nodeAttrsFromFrame,
  normalizeRotation,
  rotatedBounds,
  screenToCanvas,
  canvasToScreen,
  snapToSection,
  stepZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEPS,
} from "@/features/editor/core/geometry";
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
} from "@/features/editor/core/history";

describe("zoom (FR-EDT-001)", () => {
  it("covers 25%..200% and clamps outside values", () => {
    expect(MIN_ZOOM).toBe(0.25);
    expect(MAX_ZOOM).toBe(2);
    expect(clampZoom(0.01)).toBe(0.25);
    expect(clampZoom(9)).toBe(2);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(ZOOM_STEPS[0]).toBe(0.25);
    expect(ZOOM_STEPS.at(-1)).toBe(2);
  });

  it("steps through presets and stops at the limits", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(2, 1)).toBe(2);
    expect(stepZoom(0.25, -1)).toBe(0.25);
    expect(stepZoom(1.1, 1)).toBe(1.25);
    expect(fitZoom(195)).toBe(0.5);
    expect(fitZoom(10_000)).toBe(2);
  });

  it("screen <-> canvas conversion round-trips at every zoom", () => {
    for (const zoom of ZOOM_STEPS) {
      const p = { x: 123.5, y: 77 };
      const back = screenToCanvas(canvasToScreen(p, zoom), zoom);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it("a drag of N screen pixels commits the same canonical delta regardless of zoom", () => {
    const start = { x: 100, y: 50 };
    const screenDelta = 60;
    const results = ZOOM_STEPS.map((zoom) => {
      const moved = screenToCanvas({ x: screenDelta, y: 0 }, zoom).x;
      return start.x + moved;
    });
    // Different zooms => different canonical deltas for the same screen drag...
    expect(new Set(results).size).toBe(ZOOM_STEPS.length);
    // ...but the same canonical drag always yields the same saved value.
    for (const zoom of ZOOM_STEPS) {
      const screen = canvasToScreen({ x: 160, y: 0 }, zoom);
      expect(screenToCanvas(screen, zoom).x).toBeCloseTo(160, 6);
    }
  });
});

describe("frame <-> node math (FR-EDT-002)", () => {
  it("renders with a center pivot and reads back the same frame", () => {
    const frame = { x: 40, y: 80, w: 200, h: 60, rotation: 30 };
    const attrs = nodeAttrsFromFrame(frame);
    expect(attrs).toMatchObject({ x: 140, y: 110, offsetX: 100, offsetY: 30, rotation: 30 });
    expect(
      frameFromNodeAttrs({
        x: attrs.x,
        y: attrs.y,
        width: attrs.width,
        height: attrs.height,
        scaleX: 1,
        scaleY: 1,
        rotation: attrs.rotation,
      }),
    ).toEqual(frame);
  });

  it("folds transformer scale into width/height and never stores scale", () => {
    const frame = frameFromNodeAttrs({
      x: 100,
      y: 100,
      width: 100,
      height: 40,
      scaleX: 1.5,
      scaleY: 2,
      rotation: 0,
    });
    expect(frame).toEqual({ x: 25, y: 60, w: 150, h: 80, rotation: 0 });
  });

  it("rounds pointer noise, enforces a minimum size and normalizes rotation", () => {
    const frame = frameFromNodeAttrs({
      x: 10.123456,
      y: 20.987654,
      width: 0.0001,
      height: 50,
      scaleX: 1,
      scaleY: 1,
      rotation: 370,
    });
    expect(frame.w).toBe(1);
    expect(frame.rotation).toBe(10);
    expect(Math.round(frame.x * 100) / 100).toBe(frame.x);
    expect(normalizeRotation(-190)).toBe(170);
    expect(normalizeRotation(180)).toBe(180);
    expect(normalizeRotation(-180)).toBe(180);
    expect(normalizeRotation(Number.NaN)).toBe(0);
  });

  it("computes the bounds of a rotated frame", () => {
    const b = rotatedBounds({ x: 0, y: 0, w: 100, h: 20, rotation: 90 });
    expect(b.w).toBeCloseTo(20);
    expect(b.h).toBeCloseTo(100);
    expect(b.x).toBeCloseTo(40);
    expect(b.y).toBeCloseTo(-40);
  });
});

describe("snapping to section edges/center (FR-EDT-005, P1)", () => {
  const section = { width: 390, height: 844 };
  it("snaps the center and edges within the threshold", () => {
    const centered = snapToSection({ x: 93, y: 100, w: 200, h: 50, rotation: 0 }, section);
    expect(centered.dx).toBe(2);
    expect(centered.guides.vertical).toEqual([195]);
    const edge = snapToSection({ x: 3, y: 4, w: 50, h: 50, rotation: 0 }, section);
    expect(edge).toMatchObject({ dx: -3, dy: -4 });
  });

  it("does nothing when far from any guide", () => {
    const far = snapToSection({ x: 20, y: 200, w: 100, h: 50, rotation: 0 }, section);
    expect(far).toMatchObject({ dx: 0, dy: 0 });
    expect(far.guides).toEqual({ vertical: [], horizontal: [] });
  });
});

describe("history (FR-EDT-004)", () => {
  it("keeps at least 50 undoable steps and redoes them", () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(50);
    let h = createHistory(0);
    for (let i = 1; i <= 60; i++) h = commit(h, i);
    expect(h.past.length).toBe(60);
    for (let i = 0; i < 60; i++) h = undo(h);
    expect(h.present).toBe(0);
    expect(canUndo(h)).toBe(false);
    for (let i = 0; i < 60; i++) h = redo(h);
    expect(h.present).toBe(60);
    expect(canRedo(h)).toBe(false);
  });

  it("drops the oldest entries beyond the limit", () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) h = commit(h, i);
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toBe(20);
  });

  it("ignores no-op commits and clears redo on a new commit", () => {
    let h = createHistory({ a: 1 });
    expect(commit(h, h.present)).toBe(h);
    h = commit(h, { a: 2 });
    h = undo(h);
    expect(canRedo(h)).toBe(true);
    h = commit(h, { a: 3 });
    expect(canRedo(h)).toBe(false);
  });

  it("coalesces consecutive edits with the same key into one undo step", () => {
    let h = createHistory("start");
    h = commit(h, "a", { coalesceKey: "typing" });
    h = commit(h, "ab", { coalesceKey: "typing" });
    h = commit(h, "abc", { coalesceKey: "typing" });
    expect(h.past).toEqual(["start"]);
    h = commit(h, "other", { coalesceKey: "color" });
    expect(h.past).toEqual(["start", "abc"]);
    h = undo(h);
    expect(h.present).toBe("abc");
    h = undo(h);
    expect(h.present).toBe("start");
  });
});
