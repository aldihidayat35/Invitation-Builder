/**
 * Client-side image optimization (resizing and WebP conversion).
 *
 * Rules:
 * 1. Resizes images if width or height exceeds MAX_DIMENSION (1920px), preserving aspect ratio.
 * 2. Converts JPEG, PNG, AVIF to modern WebP (quality 0.82) while preserving alpha transparency.
 * 3. Animated GIFs (image/gif) and non-images (videos) are excluded and preserved as-is.
 * 4. Fails gracefully to the original file if canvas or image decoding is not available.
 */

export const MAX_IMAGE_DIMENSION = 1920;
export const WEBP_QUALITY = 0.82;

/** Checks whether a MIME type is eligible for WebP optimization. */
export function isOptimizableImage(mimeType: string): boolean {
  if (!mimeType.startsWith("image/")) return false;
  // Exclude animated GIFs so frame animations are not flattened into 1 static frame
  if (mimeType === "image/gif") return false;
  // Exclude vector SVGs
  if (mimeType === "image/svg+xml") return false;
  return true;
}

/** Computes scaled dimensions fitting within maxDimension while maintaining aspect ratio. */
export function calculateFitDimensions(
  width: number,
  height: number,
  maxDimension = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Optimizes an image File before uploading:
 * - Scales down to max 1920px
 * - Converts to image/webp with 82% quality
 * - Full alpha transparency support
 */
export async function optimizeImageBeforeUpload(file: File): Promise<File> {
  // Only process eligible image files in browser environment
  if (!isOptimizableImage(file.type) || typeof window === "undefined") {
    return file;
  }

  return new Promise<File>((resolve) => {
    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          const { width: origWidth, height: origHeight } = img;
          if (origWidth < 1 || origHeight < 1) {
            cleanup();
            return resolve(file);
          }

          const { width, height } = calculateFitDimensions(origWidth, origHeight);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            cleanup();
            return resolve(file);
          }

          // Clear canvas (ensures transparent background is preserved)
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              cleanup();
              if (!blob) {
                return resolve(file);
              }

              // Replace extension with .webp
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const newFilename = `${baseName}.webp`;

              const optimizedFile = new File([blob], newFilename, {
                type: "image/webp",
                lastModified: Date.now(),
              });

              resolve(optimizedFile);
            },
            "image/webp",
            WEBP_QUALITY,
          );
        } catch {
          cleanup();
          resolve(file);
        }
      };

      img.onerror = () => {
        cleanup();
        resolve(file);
      };

      img.src = objectUrl;
    } catch {
      cleanup();
      resolve(file);
    }
  });
}
