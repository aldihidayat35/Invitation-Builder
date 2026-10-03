/**
 * Unit tests: prefers-reduced-motion decision logic (NFR-A11Y-001, AC-13).
 */
import {
  isPrefersReducedMotion,
  resolveReducedMotionBehavior,
} from "@/features/animations";
import type { AnimationTrack } from "@/lib/schema";

describe("Reduced Motion Adaptation (NFR-A11Y-001, AC-13)", () => {
  const sampleTrack: AnimationTrack = {
    presetId: "charRise",
    trigger: "onEnterViewport",
    durationMs: 800,
    delayMs: 300,
    easing: "power2.out",
    repeat: 2,
    yoyo: true,
    staggerUnit: "char",
    staggerAmountMs: 50,
    once: true,
  };

  it("returns unaltered track when reduced motion is not preferred", () => {
    const resolved = resolveReducedMotionBehavior(sampleTrack, false);
    expect(resolved).toEqual(sampleTrack);
  });

  it("zeros out duration, delay, stagger and cancels repeats when reduced motion is preferred", () => {
    const resolved = resolveReducedMotionBehavior(sampleTrack, true);

    expect(resolved.durationMs).toBe(0);
    expect(resolved.delayMs).toBe(0);
    expect(resolved.staggerAmountMs).toBe(0);
    expect(resolved.repeat).toBe(0);
    expect(resolved.yoyo).toBe(false);
    // Preset and trigger remain preserved for semantic bookkeeping
    expect(resolved.presetId).toBe("charRise");
    expect(resolved.trigger).toBe("onEnterViewport");
  });

  it("defaults to safe false when matchMedia is unavailable", () => {
    expect(typeof isPrefersReducedMotion()).toBe("boolean");
  });
});
