/**
 * Object-fit math shared by the Konva editor and (conceptually) the CSS runtime:
 * `cover` crops around a focal point, `contain` letterboxes and centers.
 * Pure; unit-tested. Focal coordinates are 0..1 within the source image.
 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FitInput {
  readonly boxWidth: number;
  readonly boxHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly fit: "cover" | "contain";
  readonly focal: { readonly x: number; readonly y: number };
}

export interface FitResult {
  /** Source rectangle (image pixels) to draw. */
  readonly crop: Rect;
  /** Destination rectangle inside the box (box pixels). */
  readonly dest: Rect;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function fitImage(input: FitInput): FitResult {
  const { boxWidth: bw, boxHeight: bh, imageWidth: iw, imageHeight: ih, fit, focal } = input;
  if (bw <= 0 || bh <= 0 || iw <= 0 || ih <= 0) {
    return {
      crop: { x: 0, y: 0, width: Math.max(iw, 1), height: Math.max(ih, 1) },
      dest: { x: 0, y: 0, width: Math.max(bw, 0), height: Math.max(bh, 0) },
    };
  }

  if (fit === "contain") {
    const scale = Math.min(bw / iw, bh / ih);
    const width = iw * scale;
    const height = ih * scale;
    return {
      crop: { x: 0, y: 0, width: iw, height: ih },
      dest: { x: (bw - width) / 2, y: (bh - height) / 2, width, height },
    };
  }

  // cover: choose the largest source window with the box's aspect ratio.
  const boxRatio = bw / bh;
  const imageRatio = iw / ih;
  let width = iw;
  let height = ih;
  if (imageRatio > boxRatio) width = ih * boxRatio;
  else height = iw / boxRatio;
  const x = clamp(focal.x * iw - width / 2, 0, iw - width);
  const y = clamp(focal.y * ih - height / 2, 0, ih - height);
  return {
    crop: { x, y, width, height },
    dest: { x: 0, y: 0, width: bw, height: bh },
  };
}

/** CSS `object-position` for the same focal point (used by the public runtime). */
export function focalToObjectPosition(focal: { readonly x: number; readonly y: number }): string {
  const pct = (v: number) => `${Math.round(clamp(v, 0, 1) * 1000) / 10}%`;
  return `${pct(focal.x)} ${pct(focal.y)}`;
}
