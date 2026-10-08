import { describe, expect, it } from "vitest";
import {
  calculateFitDimensions,
  isOptimizableImage,
  MAX_IMAGE_DIMENSION,
  optimizeImageBeforeUpload,
  WEBP_QUALITY,
} from "@/features/assets/image-optimizer";

describe("Image Optimizer", () => {
  it("correctly identifies optimizable images vs excluded formats", () => {
    expect(isOptimizableImage("image/jpeg")).toBe(true);
    expect(isOptimizableImage("image/png")).toBe(true);
    expect(isOptimizableImage("image/webp")).toBe(true);
    expect(isOptimizableImage("image/avif")).toBe(true);

    // Excluded formats
    expect(isOptimizableImage("image/gif")).toBe(false); // Animated GIF preserved
    expect(isOptimizableImage("image/svg+xml")).toBe(false);
    expect(isOptimizableImage("video/mp4")).toBe(false);
    expect(isOptimizableImage("application/pdf")).toBe(false);
  });

  it("calculates proportional fit dimensions within 1920px limit", () => {
    // Smaller than limit: unchanged
    expect(calculateFitDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    expect(calculateFitDimensions(1920, 1080)).toEqual({ width: 1920, height: 1080 });

    // Larger width (landscape 4K 3840x2160 -> 1920x1080)
    const landscape = calculateFitDimensions(3840, 2160);
    expect(landscape.width).toBe(1920);
    expect(landscape.height).toBe(1080);

    // Larger height (portrait 2000x4000 -> 960x1920)
    const portrait = calculateFitDimensions(2000, 4000);
    expect(portrait.width).toBe(960);
    expect(portrait.height).toBe(1920);

    // Square 3000x3000 -> 1920x1920
    const square = calculateFitDimensions(3000, 3000);
    expect(square.width).toBe(1920);
    expect(square.height).toBe(1920);
  });

  it("uses standard 82% quality and 1920px max dimension constants", () => {
    expect(MAX_IMAGE_DIMENSION).toBe(1920);
    expect(WEBP_QUALITY).toBe(0.82);
  });

  it("preserves excluded GIF and video files untouched", async () => {
    const gifFile = new File(["fake-gif-bytes"], "animation.gif", { type: "image/gif" });
    const resultGif = await optimizeImageBeforeUpload(gifFile);
    expect(resultGif).toBe(gifFile);

    const videoFile = new File(["fake-video-bytes"], "intro.mp4", { type: "video/mp4" });
    const resultVideo = await optimizeImageBeforeUpload(videoFile);
    expect(resultVideo).toBe(videoFile);
  });
});
