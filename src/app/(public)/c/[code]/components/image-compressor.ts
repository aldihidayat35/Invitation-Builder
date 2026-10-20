/**
 * Client-side image compression helper using HTML Canvas.
 * Safely scales down high-resolution photos (max dimension 1920px)
 * and compresses them to JPEG to reduce bandwidth and speed up uploads.
 * Preserves animated GIFs and vector SVGs.
 */
export async function compressImageClient(
  file: File,
  maxDimension = 1920,
  quality = 0.85,
): Promise<File> {
  if (
    typeof window === "undefined" ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml" ||
    file.size < 300 * 1024
  ) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width <= maxDimension && height <= maxDimension && file.size < 1024 * 1024) {
        return resolve(file);
      }

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            return resolve(file);
          }
          const newName = file.name.replace(/\.[^.]+$/, ".jpg");
          const compressed = new File([blob], newName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
