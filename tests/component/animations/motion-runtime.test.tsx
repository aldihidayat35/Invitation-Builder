/**
 * Component test: GSAP Motion Path Runtime Engine (FR-ANM-Motion).
 */
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildDefaultMotionTrack, playMotionAnimation } from "@/features/animations";

describe("GSAP Motion Path Runtime", () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it("executes onLoad motion animation immediately and updates transform", () => {
    const onStart = vi.fn();
    const track = buildDefaultMotionTrack({
      preset: "leftToRight",
      trigger: "onLoad",
      durationMs: 50,
    });

    const cleanup = playMotionAnimation(element, track, { onStart });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(element.style.transform).toContain("translate3d");

    cleanup();
  });

  it("executes onClick motion animation upon click event", () => {
    const onStart = vi.fn();
    const track = buildDefaultMotionTrack({
      preset: "arcUp",
      trigger: "onClick",
      durationMs: 50,
    });

    const cleanup = playMotionAnimation(element, track, { onStart });
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(element);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(element.style.transform).toContain("translate3d");

    cleanup();
  });

  it("handles reduced motion preferences safely", () => {
    const onComplete = vi.fn();
    const origMatchMedia = window.matchMedia;

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

    const track = buildDefaultMotionTrack({
      preset: "waveHorizontal",
      trigger: "onLoad",
    });

    playMotionAnimation(element, track, { onComplete });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(element.style.transform).toContain("translate3d");

    window.matchMedia = origMatchMedia;
  });

  it("cleans up active motion tweens without errors", () => {
    const track = buildDefaultMotionTrack({
      preset: "circleOrbit",
      trigger: "onLoad",
      repeat: -1,
    });

    const cleanup = playMotionAnimation(element, track);
    expect(() => cleanup()).not.toThrow();
  });
});
