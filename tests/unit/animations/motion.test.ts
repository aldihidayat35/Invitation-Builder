/**
 * Unit tests: Motion Path Animation Engine (FR-ANM-Motion).
 */
import { describe, expect, it } from "vitest";
import {
  buildDefaultMotionTrack,
  buildMotionSvgPath,
  getMotionPresetConfig,
  getPointOnMotionPath,
  MOTION_PRESET_CONFIGS,
  sampleMotionPathPoints,
} from "@/features/animations";

describe("Motion Path Engine (Math, Presets, and Interpolation)", () => {
  it("provides comprehensive preset configurations with valid defaults", () => {
    expect(MOTION_PRESET_CONFIGS.length).toBeGreaterThanOrEqual(9);

    const leftToRight = getMotionPresetConfig("leftToRight");
    expect(leftToRight.pathShape).toBe("linear");
    expect(leftToRight.points[0]!.x).toBeLessThan(0);
    expect(leftToRight.points[1]!.x).toBe(0);
    expect(leftToRight.points[1]!.y).toBe(0);

    for (const preset of MOTION_PRESET_CONFIGS) {
      const lastPt = preset.points[preset.points.length - 1]!;
      expect(lastPt).toEqual({ x: 0, y: 0 });
    }

    const arcUp = getMotionPresetConfig("arcUp");
    expect(arcUp.pathShape).toBe("arcUp");
    expect(arcUp.curviness).toBeGreaterThan(0);

    const wave = getMotionPresetConfig("waveHorizontal");
    expect(wave.pathShape).toBe("wave");
    expect(wave.points.length).toBeGreaterThanOrEqual(4);
  });

  it("builds and normalizes default motion tracks correctly", () => {
    const track = buildDefaultMotionTrack({ preset: "leftToRight" });
    expect(track.enabled).toBe(true);
    expect(track.preset).toBe("leftToRight");
    expect(track.durationMs).toBe(2000);
    expect(track.points).toHaveLength(2);

    // Clamps extreme duration
    const clamped = buildDefaultMotionTrack({ durationMs: 999_999 });
    expect(clamped.durationMs).toBe(10_000);
  });

  it("calculates exact start and end positions for linear paths", () => {
    const track = buildDefaultMotionTrack({
      preset: "leftToRight",
      pathShape: "linear",
      points: [
        { x: -100, y: 0 },
        { x: 0, y: 0 },
      ],
    });

    const start = getPointOnMotionPath(track, 0);
    expect(start.x).toBe(-100);
    expect(start.y).toBe(0);

    const mid = getPointOnMotionPath(track, 0.5);
    expect(mid.x).toBe(-50);
    expect(mid.y).toBe(0);

    const end = getPointOnMotionPath(track, 1);
    expect(end.x).toBe(0);
    expect(end.y).toBe(0);
  });

  it("calculates directional movements from top to bottom and bottom to top", () => {
    const topToBottom = buildDefaultMotionTrack({ preset: "topToBottom" });
    const pStart = getPointOnMotionPath(topToBottom, 0);
    const pEnd = getPointOnMotionPath(topToBottom, 1);
    expect(pStart.y).toBeLessThan(0);
    expect(pEnd.y).toBe(0);

    const bottomToTop = buildDefaultMotionTrack({ preset: "bottomToTop" });
    const bStart = getPointOnMotionPath(bottomToTop, 0);
    const bEnd = getPointOnMotionPath(bottomToTop, 1);
    expect(bStart.y).toBeGreaterThan(0);
    expect(bEnd.y).toBe(0);
  });

  it("applies curved arch (melengkung) with adjustable curvature", () => {
    const straightTrack = buildDefaultMotionTrack({
      preset: "custom",
      pathShape: "arcUp",
      points: [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      curviness: 0,
    });
    const straightMid = getPointOnMotionPath(straightTrack, 0.5);
    expect(straightMid.y).toBe(0);

    const curvedTrack = buildDefaultMotionTrack({
      preset: "arcUp",
      pathShape: "arcUp",
      points: [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      curviness: 1.5,
    });
    const curvedMid = getPointOnMotionPath(curvedTrack, 0.5);
    // arcUp should curve upward (negative y in standard screen coordinates)
    expect(curvedMid.y).toBeLessThan(0);
  });

  it("interpolates Catmull-Rom spline through multiple custom waypoints", () => {
    const track = buildDefaultMotionTrack({
      preset: "custom",
      pathShape: "curved",
      points: [
        { x: -100, y: 0 },
        { x: -50, y: -80 },
        { x: 0, y: 0 },
      ],
      curviness: 1.0,
    });

    const start = getPointOnMotionPath(track, 0);
    expect(start.x).toBe(-100);
    expect(start.y).toBe(0);

    const end = getPointOnMotionPath(track, 1);
    expect(end.x).toBe(0);
    expect(end.y).toBe(0);

    const samples = sampleMotionPathPoints(track, 10);
    expect(samples).toHaveLength(11);
  });

  it("computes tangent rotation angle when autoRotate is enabled", () => {
    const track = buildDefaultMotionTrack({
      preset: "diagonalDownRight",
      pathShape: "linear",
      points: [
        { x: -100, y: -100 },
        { x: 0, y: 0 },
      ],
      autoRotate: true,
    });

    const mid = getPointOnMotionPath(track, 0.5);
    // 45 degrees angle for (-100,-100) -> (0,0)
    expect(mid.rotation).toBeCloseTo(45, 0);
  });

  it("generates valid SVG path representations", () => {
    const track = buildDefaultMotionTrack({ preset: "waveHorizontal" });
    const svgPath = buildMotionSvgPath(track, 8);
    expect(svgPath).toMatch(/^M\s+-?[0-9.]+\s+-?[0-9.]+/);
    expect(svgPath).toContain("L");
  });
});
