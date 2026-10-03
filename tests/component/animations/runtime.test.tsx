/**
 * Component test: GSAP Animation Runtime (FR-ANM-001..006, AC-07, AC-13).
 */
import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { playAnimation } from "@/features/animations";
import type { AnimationTrack } from "@/lib/schema";

describe("GSAP Animation Runtime (FR-ANM-001..006)", () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it("executes onLoad animation immediately", () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const track: AnimationTrack = {
      presetId: "fadeIn",
      trigger: "onLoad",
      durationMs: 50,
      delayMs: 0,
      easing: "power2.out",
      repeat: 0,
      yoyo: false,
      staggerUnit: "none",
      staggerAmountMs: 0,
      once: true,
    };

    const cleanup = playAnimation(element, track, { onStart, onComplete });
    expect(onStart).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("executes onClick animation upon click event", () => {
    const onStart = vi.fn();
    const track: AnimationTrack = {
      presetId: "slideUp",
      trigger: "onClick",
      durationMs: 50,
      delayMs: 0,
      easing: "power2.out",
      repeat: 0,
      yoyo: false,
      staggerUnit: "none",
      staggerAmountMs: 0,
      once: true,
    };

    const cleanup = playAnimation(element, track, { onStart });
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(element);
    expect(onStart).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("handles reduced motion by instantly revealing without transition", () => {
    const onComplete = vi.fn();
    const originalMatchMedia = window.matchMedia;

    // Mock reduced motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const track: AnimationTrack = {
      presetId: "zoomIn",
      trigger: "onLoad",
      durationMs: 1000,
      delayMs: 500,
      easing: "power2.out",
      repeat: 0,
      yoyo: false,
      staggerUnit: "none",
      staggerAmountMs: 0,
      once: true,
    };

    playAnimation(element, track, { onComplete });
    // In reduced motion, execution calls onComplete synchronously
    expect(onComplete).toHaveBeenCalledTimes(1);

    window.matchMedia = originalMatchMedia;
  });

  it("cleans up active animations and listeners without errors", () => {
    const track: AnimationTrack = {
      presetId: "fadeIn",
      trigger: "onClick",
      durationMs: 500,
      delayMs: 0,
      easing: "linear",
      repeat: 0,
      yoyo: false,
      staggerUnit: "none",
      staggerAmountMs: 0,
      once: true,
    };

    const cleanup = playAnimation(element, track);
    expect(() => cleanup()).not.toThrow();
  });
});
