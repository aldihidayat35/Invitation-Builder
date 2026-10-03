export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface RemoveBgOptions {
  /** Tolerance threshold in percent (0 - 100), default 25 */
  tolerance?: number;
  /** Feather / edge smoothing radius in color-distance units (0 - 15), default 3 */
  feather?: number;
  /**
   * If true, only removes background connected to the borders of the image (BFS).
   * This protects internal clothes/skin of similar color from becoming transparent.
   * Default: true.
   */
  contiguousOnly?: boolean;
  /**
   * Specific color to remove. If null, automatically detected from border/corners.
   */
  customKeyColor?: RGBColor | null;
  /**
   * Softens edge halos matching the background color. Default: true.
   */
  despill?: boolean;
}

/**
 * Calculates normalized Euclidean distance between two RGB colors (0 to 100).
 */
export function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Max possible distance is sqrt(255^2 * 3) ~= 441.67295593
  return Math.sqrt(dr * dr + dg * dg + db * db) / 4.41673;
}

/**
 * Samples perimeter pixels and corners to detect the dominant background color.
 */
export function sampleBackgroundCorners(imageData: ImageData): RGBColor {
  const { width, height, data } = imageData;
  if (width === 0 || height === 0) return { r: 255, g: 255, b: 255 };

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let sampleCount = 0;

  function samplePixel(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    totalR += data[idx] ?? 0;
    totalG += data[idx + 1] ?? 0;
    totalB += data[idx + 2] ?? 0;
    sampleCount++;
  }

  // Sample corners with 3x3 box
  const cornerBoxes = [
    { startX: 0, startY: 0 },
    { startX: Math.max(0, width - 3), startY: 0 },
    { startX: 0, startY: Math.max(0, height - 3) },
    { startX: Math.max(0, width - 3), startY: Math.max(0, height - 3) },
  ];

  for (const box of cornerBoxes) {
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        samplePixel(box.startX + dx, box.startY + dy);
      }
    }
  }

  // Sample along edges at regular intervals
  const stepX = Math.max(1, Math.floor(width / 16));
  const stepY = Math.max(1, Math.floor(height / 16));

  for (let x = 0; x < width; x += stepX) {
    samplePixel(x, 0);
    samplePixel(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    samplePixel(0, y);
    samplePixel(width - 1, y);
  }

  if (sampleCount === 0) return { r: 255, g: 255, b: 255 };

  return {
    r: Math.round(totalR / sampleCount),
    g: Math.round(totalG / sampleCount),
    b: Math.round(totalB / sampleCount),
  };
}

/**
 * Modifies ImageData in-place by removing the background according to options.
 */
export function applyBackgroundRemovalToImageData(
  imageData: ImageData,
  options: RemoveBgOptions = {},
): { keyColor: RGBColor; removedPixels: number } {
  const {
    tolerance = 25,
    feather = 3,
    contiguousOnly = true,
    customKeyColor = null,
    despill = true,
  } = options;

  const { width, height, data } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return { keyColor: { r: 255, g: 255, b: 255 }, removedPixels: 0 };
  }

  const keyColor = customKeyColor ?? sampleBackgroundCorners(imageData);
  const { r: kr, g: kg, b: kb } = keyColor;

  let removedPixels = 0;
  const maxThreshold = tolerance + feather;

  if (contiguousOnly) {
    // 0 = unvisited, 1 = background, 2 = edge/feathered, 3 = foreground/kept
    const visited = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let queueHead = 0;
    let queueTail = 0;

    // Seed BFS queue with perimeter pixels matching background color
    function tryEnqueue(x: number, y: number) {
      const idx = y * width + x;
      if ((visited[idx] ?? 0) !== 0) return;

      const pIdx = idx * 4;
      const r = data[pIdx] ?? 0;
      const g = data[pIdx + 1] ?? 0;
      const b = data[pIdx + 2] ?? 0;
      const dist = colorDistance(r, g, b, kr, kg, kb);

      if (dist <= tolerance) {
        visited[idx] = 1; // full background
        queue[queueTail++] = idx;
      } else if (dist <= maxThreshold) {
        visited[idx] = 2; // feather edge
      } else {
        visited[idx] = 3; // foreground
      }
    }

    // Top and bottom edges
    for (let x = 0; x < width; x++) {
      tryEnqueue(x, 0);
      tryEnqueue(x, height - 1);
    }
    // Left and right edges
    for (let y = 0; y < height; y++) {
      tryEnqueue(0, y);
      tryEnqueue(width - 1, y);
    }

    // Process BFS queue
    while (queueHead < queueTail) {
      const currIdx = queue[queueHead++];
      if (currIdx === undefined) break;
      const cx = currIdx % width;
      const cy = Math.floor(currIdx / width);

      // 4-neighborhood
      const neighbors: number[] = [
        cx > 0 ? currIdx - 1 : -1,
        cx < width - 1 ? currIdx + 1 : -1,
        cy > 0 ? currIdx - width : -1,
        cy < height - 1 ? currIdx + width : -1,
      ];

      for (let n = 0; n < 4; n++) {
        const nIdx = neighbors[n];
        if (nIdx === undefined || nIdx < 0 || (visited[nIdx] ?? 0) !== 0) continue;

        const pIdx = nIdx * 4;
        const r = data[pIdx] ?? 0;
        const g = data[pIdx + 1] ?? 0;
        const b = data[pIdx + 2] ?? 0;
        const dist = colorDistance(r, g, b, kr, kg, kb);

        if (dist <= tolerance) {
          visited[nIdx] = 1;
          queue[queueTail++] = nIdx;
        } else if (dist <= maxThreshold) {
          visited[nIdx] = 2; // edge feathering stop boundary
        } else {
          visited[nIdx] = 3;
        }
      }
    }

    // Apply alpha changes based on visited map
    for (let idx = 0; idx < totalPixels; idx++) {
      const status = visited[idx] ?? 0;
      const pIdx = idx * 4;

      if (status === 1) {
        // Complete background removal
        data[pIdx + 3] = 0;
        removedPixels++;
      } else if (status === 2) {
        // Feather edge
        const r = data[pIdx] ?? 0;
        const g = data[pIdx + 1] ?? 0;
        const b = data[pIdx + 2] ?? 0;
        const currentAlpha = data[pIdx + 3] ?? 255;
        const dist = colorDistance(r, g, b, kr, kg, kb);

        const delta = dist - tolerance;
        const alphaFrac = Math.max(0, Math.min(1, delta / Math.max(0.001, feather)));
        const newAlpha = Math.round(currentAlpha * alphaFrac);
        data[pIdx + 3] = newAlpha;

        if (despill && newAlpha < 240) {
          // De-halo: soften color away from key color
          const blend = alphaFrac;
          data[pIdx] = Math.round(r * blend + (1 - blend) * Math.max(0, r - (kr - r)));
          data[pIdx + 1] = Math.round(g * blend + (1 - blend) * Math.max(0, g - (kg - g)));
          data[pIdx + 2] = Math.round(b * blend + (1 - blend) * Math.max(0, b - (kb - b)));
        }
      }
    }
  } else {
    // Global color threshold across entire image
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const currentAlpha = data[i + 3] ?? 255;
      const dist = colorDistance(r, g, b, kr, kg, kb);

      if (dist <= tolerance) {
        data[i + 3] = 0;
        removedPixels++;
      } else if (dist <= maxThreshold) {
        const delta = dist - tolerance;
        const alphaFrac = Math.max(0, Math.min(1, delta / Math.max(0.001, feather)));
        data[i + 3] = Math.round(currentAlpha * alphaFrac);
      }
    }
  }

  return { keyColor, removedPixels };
}

/**
 * Performs client-side background removal on an image element and returns a PNG Blob.
 */
export async function removeImageBackground(
  image: HTMLImageElement,
  options: RemoveBgOptions = {},
): Promise<Blob> {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (width === 0 || height === 0) {
    throw new Error("Gambar tidak memiliki dimensi yang valid.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Gagal menginisialisasi canvas context.");
  }

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  applyBackgroundRemovalToImageData(imageData, options);

  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gagal menghasilkan file PNG transparan."));
    }, "image/png");
  });
}
