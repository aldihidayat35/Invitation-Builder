export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageOptions {
  /** Rect to crop from the source image (in natural image pixel coordinates). */
  crop: CropRect;
  /** Rotation angle in degrees: 0, 90, 180, or 270. Default: 0 */
  rotation?: number;
  /** Flip horizontally. Default: false */
  flipH?: boolean;
  /** Flip vertically. Default: false */
  flipV?: boolean;
  /** Output MIME type. Default: "image/png" */
  mimeType?: string;
  /** Image quality between 0 and 1 (for jpeg/webp). */
  quality?: number;
}

/**
 * Validates and clamps a crop rectangle to image boundaries.
 */
export function clampCropRect(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
  minSize = 10,
): CropRect {
  const width = Math.max(minSize, Math.min(crop.width, imageWidth));
  const height = Math.max(minSize, Math.min(crop.height, imageHeight));

  const x = Math.max(0, Math.min(crop.x, imageWidth - width));
  const y = Math.max(0, Math.min(crop.y, imageHeight - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Computes constrained crop rectangle when locked to an aspect ratio (e.g. 1:1, 16:9).
 */
export function constrainCropToAspectRatio(
  baseWidth: number,
  baseHeight: number,
  aspectRatio: number | null, // width / height
): { width: number; height: number } {
  if (!aspectRatio || aspectRatio <= 0) {
    return { width: baseWidth, height: baseHeight };
  }

  let width = baseWidth;
  let height = Math.round(width / aspectRatio);

  if (height > baseHeight) {
    height = baseHeight;
    width = Math.round(height * aspectRatio);
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

/**
 * Executes canvas-based pixel cropping and transformation and returns a Blob.
 */
export async function renderCroppedImageToBlob(
  image: HTMLImageElement,
  options: CropImageOptions,
): Promise<Blob> {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  const validCrop = clampCropRect(options.crop, naturalWidth, naturalHeight);
  const rot = (((options.rotation || 0) % 360) + 360) % 360;
  const isSwapped = rot === 90 || rot === 270;

  const outWidth = isSwapped ? validCrop.height : validCrop.width;
  const outHeight = isSwapped ? validCrop.width : validCrop.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, outWidth);
  canvas.height = Math.max(1, outHeight);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Gagal menginisialisasi canvas context.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Center coordinate translation for rotation and flip
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  if (rot !== 0) {
    ctx.rotate((rot * Math.PI) / 180);
  }

  const scaleX = options.flipH ? -1 : 1;
  const scaleY = options.flipV ? -1 : 1;
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.scale(scaleX, scaleY);
  }

  // Draw the cropped portion centered
  const drawW = validCrop.width;
  const drawH = validCrop.height;
  ctx.drawImage(
    image,
    validCrop.x,
    validCrop.y,
    validCrop.width,
    validCrop.height,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH,
  );
  ctx.restore();

  const mime = options.mimeType || "image/png";
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal menghasilkan blob gambar terpotong."));
      },
      mime,
      options.quality,
    );
  });
}
