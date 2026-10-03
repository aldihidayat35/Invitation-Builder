import { describe, expect, it } from "vitest";
import {
  applyBackgroundRemovalToImageData,
  colorDistance,
  sampleBackgroundCorners,
} from "@/features/editor/utils/remove-background";

function makeImageData(width: number, height: number, fillR = 255, fillG = 255, fillB = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = 255;
  }
  return { width, height, data } as ImageData;
}

describe("colorDistance", () => {
  it("returns 0 for identical colors", () => {
    expect(colorDistance(255, 255, 255, 255, 255, 255)).toBe(0);
    expect(colorDistance(0, 0, 0, 0, 0, 0)).toBe(0);
  });

  it("returns near 100 for white vs black", () => {
    const dist = colorDistance(255, 255, 255, 0, 0, 0);
    expect(dist).toBeGreaterThan(99.9);
    expect(dist).toBeLessThanOrEqual(100.1);
  });
});

describe("sampleBackgroundCorners", () => {
  it("samples dominant corner color correctly", () => {
    const img = makeImageData(20, 20, 240, 240, 240);
    const color = sampleBackgroundCorners(img);
    expect(color).toEqual({ r: 240, g: 240, b: 240 });
  });
});

describe("applyBackgroundRemovalToImageData", () => {
  it("removes uniform background in connected mode", () => {
    const img = makeImageData(10, 10, 255, 255, 255);
    const result = applyBackgroundRemovalToImageData(img, {
      tolerance: 10,
      contiguousOnly: true,
    });
    expect(result.removedPixels).toBe(100);
    expect(img.data[3]).toBe(0);
    expect(img.data[img.data.length - 1]).toBe(0);
  });

  it("preserves interior island matching background color when shielded by border in contiguous mode", () => {
    // 5x5 image:
    // Outer border is white (255)
    // Middle ring is black (0)
    // Center pixel (2,2) is white (255)
    const img = makeImageData(5, 5, 255, 255, 255);

    // Draw dark ring at layer 1
    for (let x = 1; x <= 3; x++) {
      for (let y = 1; y <= 3; y++) {
        const idx = (y * 5 + x) * 4;
        img.data[idx] = 0;
        img.data[idx + 1] = 0;
        img.data[idx + 2] = 0;
      }
    }
    // Put white center at (2,2)
    const centerIdx = (2 * 5 + 2) * 4;
    img.data[centerIdx] = 255;
    img.data[centerIdx + 1] = 255;
    img.data[centerIdx + 2] = 255;

    // Run contiguous background removal (white background)
    applyBackgroundRemovalToImageData(img, {
      tolerance: 10,
      feather: 0,
      contiguousOnly: true,
      customKeyColor: { r: 255, g: 255, b: 255 },
    });

    // Outer corner (0,0) must be transparent
    expect(img.data[3]).toBe(0);

    // Ring at (1,1) must be opaque
    const ringIdx = (1 * 5 + 1) * 4;
    expect(img.data[ringIdx + 3]).toBe(255);

    // Center pixel at (2,2) was protected by the ring, so it must STILL be opaque!
    expect(img.data[centerIdx + 3]).toBe(255);
  });

  it("removes all matching pixels in global mode (contiguousOnly = false)", () => {
    const img = makeImageData(5, 5, 255, 255, 255);
    // Draw dark ring
    for (let x = 1; x <= 3; x++) {
      for (let y = 1; y <= 3; y++) {
        const idx = (y * 5 + x) * 4;
        img.data[idx] = 0;
        img.data[idx + 1] = 0;
        img.data[idx + 2] = 0;
      }
    }
    // Put white center at (2,2)
    const centerIdx = (2 * 5 + 2) * 4;
    img.data[centerIdx] = 255;
    img.data[centerIdx + 1] = 255;
    img.data[centerIdx + 2] = 255;

    applyBackgroundRemovalToImageData(img, {
      tolerance: 10,
      feather: 0,
      contiguousOnly: false,
      customKeyColor: { r: 255, g: 255, b: 255 },
    });

    // In global mode, the center white pixel is also removed!
    expect(img.data[centerIdx + 3]).toBe(0);
    // While the dark ring remains opaque!
    const ringIdx = (1 * 5 + 1) * 4;
    expect(img.data[ringIdx + 3]).toBe(255);
  });
});
