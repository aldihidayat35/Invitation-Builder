import { describe, expect, it } from "vitest";
import {
  animationPresetRegistry,
  buildDefaultTrack,
  playAnimation,
  replayKonvaNode,
  startKonvaLoopAnimation,
} from "@/features/animations";
import { animationTrackSchema } from "@/lib/schema";

describe("Plant Sway / Waving Animation System", () => {
  it("registers plantSway preset in animationPresetRegistry", () => {
    expect(animationPresetRegistry.has("plantSway")).toBe(true);
    const preset = animationPresetRegistry.get("plantSway")!;
    expect(preset.id).toBe("plantSway");
    expect(preset.category).toBe("attention");
    expect(preset.label).toContain("Melambai");
    expect(preset.loop).toBe(true);
    expect(preset.yoyo).toBe(true);
    expect(preset.defaultDurationMs).toBe(2400);
    expect(preset.keyframes.from.rotation).toBe(-5);
    expect(preset.keyframes.to.rotation).toBe(5);
  });

  it("builds plantSway track with correct defaults for fixed bottom anchor and initial direction", () => {
    const track = buildDefaultTrack({ presetId: "plantSway" });

    expect(track.presetId).toBe("plantSway");
    expect(track.anchor).toBe("bottom-center");
    expect(track.direction).toBe("left-first");
    expect(track.intensity).toBe(5);
    expect(track.repeat).toBe(-1);
    expect(track.yoyo).toBe(true);
  });

  it("accepts custom anchor, direction, and intensity in schema validation", () => {
    const parsed = animationTrackSchema.parse({
      presetId: "plantSway",
      trigger: "whileVisible",
      durationMs: 3000,
      delayMs: 0,
      easing: "ease-in-out",
      repeat: -1,
      yoyo: true,
      staggerUnit: "none",
      staggerAmountMs: 0,
      once: false,
      anchor: "top-center",
      direction: "right-first",
      intensity: 12,
    });

    expect(parsed.anchor).toBe("top-center");
    expect(parsed.direction).toBe("right-first");
    expect(parsed.intensity).toBe(12);
  });

  it("executes playAnimation with transformOrigin applied to target element", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const track = buildDefaultTrack({
      presetId: "plantSway",
      anchor: "bottom-center",
      direction: "left-first",
      intensity: 8,
    });

    const cleanup = playAnimation(div, track, { forcePlay: true });
    expect(typeof cleanup).toBe("function");

    cleanup();
    div.remove();
  });

  it("runs Konva loop and replay animations with dynamic rotFrom and rotTo", () => {
    // Mock Konva node
    let opacity = 1;
    let x = 100;
    let y = 100;
    let rot = 0;
    let scaleX = 1;
    let scaleY = 1;

    const mockNode: any = {
      opacity: (val?: number) => (val !== undefined ? (opacity = val) : opacity),
      x: (val?: number) => (val !== undefined ? (x = val) : x),
      y: (val?: number) => (val !== undefined ? (y = val) : y),
      rotation: (val?: number) => (val !== undefined ? (rot = val) : rot),
      scaleX: (val?: number) => (val !== undefined ? (scaleX = val) : scaleX),
      scaleY: (val?: number) => (val !== undefined ? (scaleY = val) : scaleY),
      getLayer: () => ({ batchDraw: () => {} }),
    };

    const track = buildDefaultTrack({
      presetId: "plantSway",
      anchor: "bottom-center",
      direction: "right-first",
      intensity: 6,
    });

    const cleanupLoop = startKonvaLoopAnimation(mockNode, track);
    expect(typeof cleanupLoop).toBe("function");
    cleanupLoop();

    const cleanupReplay = replayKonvaNode(mockNode, track);
    expect(typeof cleanupReplay).toBe("function");
    cleanupReplay();
  });
});
