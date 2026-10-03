/**
 * Unit tests: Animation Config Normalization (FR-ANM-005, §12.1).
 */
import {
  buildDefaultTrack,
  hasActiveAnimations,
  normalizeAnimationTrack,
} from "@/features/animations";
import { ANIMATION_LIMITS } from "@/lib/schema";

describe("Animation Config Normalization (FR-ANM-005)", () => {
  it("builds a default track populated from preset defaults", () => {
    const track = buildDefaultTrack({ presetId: "charRise" });

    expect(track.presetId).toBe("charRise");
    expect(track.staggerUnit).toBe("char");
    expect(track.staggerAmountMs).toBe(45);
    expect(track.durationMs).toBe(600);
    expect(track.easing).toBe("back.out");
    expect(track.trigger).toBe("onEnterViewport");
  });

  it("clamps oversized values to canonical schema limits", () => {
    const track = buildDefaultTrack({
      presetId: "fadeIn",
      durationMs: 99_999,
      delayMs: 88_888,
      staggerAmountMs: 5_000,
      repeat: 200,
    });

    expect(track.durationMs).toBe(ANIMATION_LIMITS.maxDurationMs);
    expect(track.delayMs).toBe(ANIMATION_LIMITS.maxDelayMs);
    expect(track.staggerAmountMs).toBe(ANIMATION_LIMITS.maxStaggerMs);
    expect(track.repeat).toBe(ANIMATION_LIMITS.maxRepeat);
  });

  it("normalizes unknown objects safely into fallback tracks", () => {
    const normalized = normalizeAnimationTrack({
      presetId: "nonExistentPreset",
      somethingInvalid: 123,
    });

    expect(normalized.presetId).toBe("nonExistentPreset");
    expect(normalized.durationMs).toBe(600);
  });

  it("detects whether an element has active animations", () => {
    expect(hasActiveAnimations(undefined)).toBe(false);
    expect(hasActiveAnimations({})).toBe(false);
    expect(
      hasActiveAnimations({
        enter: buildDefaultTrack({ presetId: "fadeIn" }),
      }),
    ).toBe(true);
  });
});
