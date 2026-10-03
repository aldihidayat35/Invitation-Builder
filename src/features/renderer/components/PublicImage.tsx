import type { CSSProperties } from "react";
import { assetUrl } from "@/features/assets/urls";
import { focalToObjectPosition } from "@/lib/image-fit";

export interface PublicImageProps {
  readonly assetId: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly fit?: "cover" | "contain";
  readonly focal?: { readonly x: number; readonly y: number };
  readonly radius?: number;
  readonly opacity?: number;
  /** Above-the-fold image: eager load + high fetch priority. Otherwise lazy. */
  readonly priority?: boolean;
}

/**
 * Single seam for rendering stored images in the public HTML runtime (FR-AST-002).
 * All URL building goes through `assetUrl`, so optimized variants / srcset can be
 * added here later without touching callers. Props are picked explicitly.
 */
export function PublicImage({
  assetId,
  alt,
  width,
  height,
  fit = "cover",
  focal = { x: 0.5, y: 0.5 },
  radius = 0,
  opacity = 1,
  priority = false,
}: PublicImageProps) {
  const style: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: fit,
    objectPosition: focalToObjectPosition(focal),
    borderRadius: radius > 0 ? `calc(var(--u, 1px) * ${radius})` : 0,
    opacity,
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset delivery is our own route; variants come later
    <img
      src={assetUrl(assetId, { width })}
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
