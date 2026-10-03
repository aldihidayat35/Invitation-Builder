import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDTHS,
  PANEL_LIMITS,
  clampWidth,
  parseWidths,
} from "@/features/editor/core/panel-layout";

describe("editor panel widths", () => {
  it("clamps to the per-side limits", () => {
    expect(clampWidth("left", 10)).toBe(PANEL_LIMITS.left.min);
    expect(clampWidth("left", 9999)).toBe(PANEL_LIMITS.left.max);
    expect(clampWidth("right", 333.6)).toBe(334);
    expect(clampWidth("right", Number.NaN)).toBe(PANEL_LIMITS.right.def);
  });

  it("parses persisted values defensively", () => {
    expect(parseWidths(null)).toEqual(DEFAULT_WIDTHS);
    expect(parseWidths("not json")).toEqual(DEFAULT_WIDTHS);
    expect(parseWidths('{"left":"wide"}')).toEqual(DEFAULT_WIDTHS);
    expect(parseWidths('{"left":350,"right":5000}')).toEqual({
      left: 350,
      right: PANEL_LIMITS.right.max,
    });
  });
});
