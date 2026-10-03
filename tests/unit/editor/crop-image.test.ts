import { describe, expect, it } from "vitest";
import {
  clampCropRect,
  constrainCropToAspectRatio,
} from "@/features/editor/utils/crop-image";

describe("clampCropRect", () => {
  it("keeps valid crop unchanged within boundaries", () => {
    const crop = { x: 50, y: 50, width: 200, height: 200 };
    const clamped = clampCropRect(crop, 500, 500);
    expect(clamped).toEqual({ x: 50, y: 50, width: 200, height: 200 });
  });

  it("clamps negative coordinates to zero", () => {
    const crop = { x: -20, y: -30, width: 100, height: 100 };
    const clamped = clampCropRect(crop, 500, 500);
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });

  it("clamps width and height that exceed image boundaries", () => {
    const crop = { x: 450, y: 450, width: 200, height: 200 };
    const clamped = clampCropRect(crop, 500, 500);
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(500);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(500);
  });
});

describe("constrainCropToAspectRatio", () => {
  it("calculates 1:1 square correctly", () => {
    const res = constrainCropToAspectRatio(400, 300, 1);
    expect(res).toEqual({ width: 300, height: 300 });
  });

  it("calculates 16:9 ratio correctly", () => {
    const res = constrainCropToAspectRatio(1600, 1000, 16 / 9);
    expect(res.width).toBe(1600);
    expect(res.height).toBe(900);
  });

  it("returns base dimensions when ratio is null", () => {
    const res = constrainCropToAspectRatio(500, 300, null);
    expect(res).toEqual({ width: 500, height: 300 });
  });
});
