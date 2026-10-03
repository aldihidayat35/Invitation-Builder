/**
 * PRD refs: P-07, §9.3, AC-12. Guards the canonical layout constants so they
 * cannot drift silently from the PRD baseline.
 */
import {
  CANONICAL_BASE_WIDTH,
  DEFAULT_SECTION_HEIGHT,
  REGRESSION_VIEWPORTS,
  TARGET_VIEWPORT_MAX,
  TARGET_VIEWPORT_MIN,
} from "@/lib/schema";

describe("canonical layout constants (P-07)", () => {
  it("uses 390 px canonical artboard width", () => {
    expect(CANONICAL_BASE_WIDTH).toBe(390);
  });

  it("targets 320–430 px viewports and contains the base width", () => {
    expect(TARGET_VIEWPORT_MIN).toBe(320);
    expect(TARGET_VIEWPORT_MAX).toBe(430);
    expect(CANONICAL_BASE_WIDTH).toBeGreaterThanOrEqual(TARGET_VIEWPORT_MIN);
    expect(CANONICAL_BASE_WIDTH).toBeLessThanOrEqual(TARGET_VIEWPORT_MAX);
  });

  it("uses 844 px default section height (§9.3)", () => {
    expect(DEFAULT_SECTION_HEIGHT).toBe(844);
  });

  it("lists the AC-12 regression viewports within target range", () => {
    expect([...REGRESSION_VIEWPORTS]).toEqual([320, 375, 390, 414, 430]);
    for (const vw of REGRESSION_VIEWPORTS) {
      expect(vw).toBeGreaterThanOrEqual(TARGET_VIEWPORT_MIN);
      expect(vw).toBeLessThanOrEqual(TARGET_VIEWPORT_MAX);
    }
  });
});
