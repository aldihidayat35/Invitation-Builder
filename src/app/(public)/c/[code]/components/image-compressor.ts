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

/**
 * Specifically optimizes and formats an uploaded photo into a WhatsApp-standard
 * 1200 x 630 landscape Open Graph preview card.
 *
 * WhatsApp link crawlers strictly favor ~1.91:1 ratio images and often fail to render
 * large preview cards for tall/portrait photos (e.g. 9:16 or 3:4 from smartphones).
 *
 * This function:
 * 1. If photo is already landscape (~1.7 to 2.0 ratio): scales & crops smoothly into 1200x630.
 * 2. If photo is portrait/square (<1.6 ratio): generates an aesthetic soft-blurred backdrop
 *    from the photo itself, and places the crisp original photo centered in the foreground.
 * 3. Encodes as high-quality standard JPEG (~100-180KB, well below WhatsApp's 300KB limit).
 */
export async function compressImageForWhatsAppCard(file: File): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  const TARGET_W = 1200;
  const TARGET_H = 630;
  const TARGET_RATIO = TARGET_W / TARGET_H; // ~1.905

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);

      const imgRatio = img.width / img.height;

      // If photo is already landscape close to 1.91:1 (between 1.65 and 2.1)
      if (imgRatio >= 1.65 && imgRatio <= 2.1) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const scale = Math.max(TARGET_W / img.width, TARGET_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (TARGET_W - w) / 2;
        const y = (TARGET_H - h) / 2;

        ctx.drawImage(img, x, y, w, h);
      } else {
        // Portrait or square photo: create aesthetic blurred background + crisp centered foreground
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // 1. Draw blurred backdrop
        ctx.save();
        ctx.filter = "blur(28px) brightness(0.68) saturate(1.2)";
        const bgScale = Math.max(TARGET_W / img.width, TARGET_H / img.height);
        const bgW = img.width * bgScale * 1.1; // slight oversize to avoid blur edge artifacts
        const bgH = img.height * bgScale * 1.1;
        const bgX = (TARGET_W - bgW) / 2;
        const bgY = (TARGET_H - bgH) / 2;
        ctx.drawImage(img, bgX, bgY, bgW, bgH);
        ctx.restore();

        // 2. Subtle dark overlay gradient for readability & contrast
        const grad = ctx.createLinearGradient(0, 0, 0, TARGET_H);
        grad.addColorStop(0, "rgba(0, 0, 0, 0.15)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TARGET_W, TARGET_H);

        // 3. Draw foreground photo centered & scaled to fit nicely
        const maxFgH = TARGET_H * 0.92;
        const maxFgW = TARGET_W * 0.88;
        const fgScale = Math.min(maxFgW / img.width, maxFgH / img.height);
        const fgW = Math.round(img.width * fgScale);
        const fgH = Math.round(img.height * fgScale);
        const fgX = Math.round((TARGET_W - fgW) / 2);
        const fgY = Math.round((TARGET_H - fgH) / 2);

        // Soft elegant shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.drawImage(img, fgX, fgY, fgW, fgH);
        ctx.restore();
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const safeName = file.name.replace(/\.[^.]+$/, "") + "-wa-card.jpg";
          const finalFile = new File([blob], safeName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(finalFile);
        },
        "image/jpeg",
        0.88,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
