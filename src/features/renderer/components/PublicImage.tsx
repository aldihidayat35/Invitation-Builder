import type { CSSProperties } from "react";
import type { ImageFade } from "@/lib/schema";
import { assetUrl } from "@/features/assets/urls";
import { focalToObjectPosition } from "@/lib/image-fit";

export interface PublicImageProps {
  readonly assetId?: string;
  readonly src?: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly fit?: "cover" | "contain";
  readonly focal?: { readonly x: number; readonly y: number };
  readonly radius?: number;
  readonly opacity?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  readonly fade?: ImageFade | undefined;
  /** Above-the-fold image: eager load + high fetch priority. Otherwise lazy. */
  readonly priority?: boolean;
}

/**
 * Builds CSS mask-image gradient properties for transparent edge feathering and vignette.
 */
export function buildCssImageMask(fade?: ImageFade): CSSProperties {
  if (!fade) return {};

  if (fade.mode === "radial") {
    const rad = fade.radial ?? 0;
    if (rad <= 0) return {};
    const inner = Math.max(0, 100 - rad);
    const stop1 = Math.round(inner + rad * 0.35);
    const stop2 = Math.round(inner + rad * 0.7);
    const mask = `radial-gradient(ellipse at center, #000 0%, #000 ${inner}%, rgba(0, 0, 0, 0.8) ${stop1}%, rgba(0, 0, 0, 0.3) ${stop2}%, transparent 100%)`;
    return {
      maskImage: mask,
      WebkitMaskImage: mask,
    };
  }

  // Linear mode (directional edges)
  const top = fade.top ?? 0;
  const bottom = fade.bottom ?? 0;
  const left = fade.left ?? 0;
  const right = fade.right ?? 0;

  const hasVertical = top > 0 || bottom > 0;
  const hasHorizontal = left > 0 || right > 0;

  if (!hasVertical && !hasHorizontal) return {};

  const masks: string[] = [];

  if (hasVertical) {
    const stops: string[] = [];
    if (top > 0) {
      stops.push(
        "transparent 0%",
        `rgba(0, 0, 0, 0.3) ${Math.round(top * 0.3)}%`,
        `rgba(0, 0, 0, 0.65) ${Math.round(top * 0.65)}%`,
        `#000 ${top}%`,
      );
    } else {
      stops.push("#000 0%");
    }

    if (bottom > 0) {
      const bStart = Math.max(top, 100 - bottom);
      stops.push(
        `#000 ${bStart}%`,
        `rgba(0, 0, 0, 0.65) ${Math.round(100 - bottom * 0.65)}%`,
        `rgba(0, 0, 0, 0.3) ${Math.round(100 - bottom * 0.3)}%`,
        "transparent 100%",
      );
    } else {
      stops.push("#000 100%");
    }
    masks.push(`linear-gradient(to bottom, ${stops.join(", ")})`);
  }

  if (hasHorizontal) {
    const stops: string[] = [];
    if (left > 0) {
      stops.push(
        "transparent 0%",
        `rgba(0, 0, 0, 0.3) ${Math.round(left * 0.3)}%`,
        `rgba(0, 0, 0, 0.65) ${Math.round(left * 0.65)}%`,
        `#000 ${left}%`,
      );
    } else {
      stops.push("#000 0%");
    }

    if (right > 0) {
      const rStart = Math.max(left, 100 - right);
      stops.push(
        `#000 ${rStart}%`,
        `rgba(0, 0, 0, 0.65) ${Math.round(100 - right * 0.65)}%`,
        `rgba(0, 0, 0, 0.3) ${Math.round(100 - right * 0.3)}%`,
        "transparent 100%",
      );
    } else {
      stops.push("#000 100%");
    }
    masks.push(`linear-gradient(to right, ${stops.join(", ")})`);
  }

  const maskValue = masks.join(", ");
  const maskStyle: CSSProperties = {
    maskImage: maskValue,
    WebkitMaskImage: maskValue,
  };

  if (masks.length > 1) {
    (maskStyle as Record<string, unknown>)["maskComposite"] = "intersect";
    (maskStyle as Record<string, unknown>)["WebkitMaskComposite"] = "destination-in";
  }

  return maskStyle;
}

/**
 * Single seam for rendering stored images in the public HTML runtime (FR-AST-002).
 * All URL building goes through `assetUrl`, so optimized variants / srcset can be
 * added here later without touching callers. Props are picked explicitly.
 */
export function PublicImage({
  assetId,
  src,
  alt,
  width,
  height,
  fit = "cover",
  focal = { x: 0.5, y: 0.5 },
  radius = 0,
  opacity = 1,
  flipH = false,
  flipV = false,
  fade,
  priority = false,
}: PublicImageProps) {
  const transforms: string[] = [];
  if (flipH) transforms.push("scaleX(-1)");
  if (flipV) transforms.push("scaleY(-1)");

  const maskStyle = buildCssImageMask(fade);
  const imageSrc = src ?? (assetId ? assetUrl(assetId, { width }) : "");

  const style: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: fit,
    objectPosition: focalToObjectPosition(focal),
    borderRadius: radius > 0 ? `calc(var(--u, 1px) * ${radius})` : 0,
    opacity,
    ...(transforms.length > 0 && { transform: transforms.join(" ") }),
    ...maskStyle,
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset delivery is our own route; variants come later
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority && { fetchPriority: "high" as const })}
      style={style}
    />
  );
}
