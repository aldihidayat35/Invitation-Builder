"use client";

import { useMemo } from "react";
import { assetUrl } from "@/features/assets/urls";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface PhotoFrameWidgetProps {
  readonly image?: unknown;
  readonly caption?: unknown;
  readonly fit?: unknown;
  readonly alt?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

const ASSET_ID = /^[0-9a-f-]{36}$/i;
const SAFE_SRC = /^(https?:\/\/|\/|data:image\/)/i;

export function parseFrameImage(image: unknown): string | null {
  if (typeof image === "string") {
    if (ASSET_ID.test(image)) return assetUrl(image);
    if (SAFE_SRC.test(image)) return image;
    return null;
  }
  if (typeof image === "object" && image !== null) {
    const rec = image as Record<string, unknown>;
    if (typeof rec.assetId === "string" && ASSET_ID.test(rec.assetId)) {
      return assetUrl(rec.assetId);
    }
    if (typeof rec.src === "string" && SAFE_SRC.test(rec.src)) {
      return rec.src;
    }
    if (typeof rec.url === "string" && SAFE_SRC.test(rec.url)) {
      return rec.url;
    }
  }
  return null;
}

/**
 * Canva-style aesthetic Landscape Placeholder (Sky, White Cloud, Rolling Green Hills)
 * Displayed when no photo has been selected yet.
 */
function CanvaLandscapePlaceholder({ label }: { readonly label?: string }) {
  return (
    <div className={styles.canvaPlaceholder} data-testid="canva-placeholder" aria-label={label || "Placeholder Foto"}>
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        className={styles.canvaSvg}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="canvaSkyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9fc5f8" />
            <stop offset="55%" stopColor="#cce2fd" />
            <stop offset="100%" stopColor="#ebf5ff" />
          </linearGradient>
          <filter id="cloudShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Sky Background */}
        <rect width="400" height="400" fill="url(#canvaSkyGrad)" />

        {/* Fluffy White Cloud */}
        <g filter="url(#cloudShadow)" transform="translate(130, 75) scale(0.9)">
          <path
            d="M 40 45 
               A 25 25 0 0 1 80 30 
               A 35 35 0 0 1 135 32 
               A 24 24 0 0 1 160 55 
               A 18 18 0 0 1 145 75 
               L 35 75 
               A 20 20 0 0 1 40 45 Z"
            fill="#ffffff"
          />
        </g>

        {/* Background Green Hill */}
        <path
          d="M -20 420 
             L -20 270 
             Q 120 230 240 280 
             Q 330 310 420 260 
             L 420 420 Z"
          fill="#8ec641"
        />

        {/* Foreground Rolling Green Hill */}
        <path
          d="M -20 420 
             L -20 330 
             Q 100 280 220 320 
             Q 320 350 420 300 
             L 420 420 Z"
          fill="#689f38"
        />
      </svg>
      <div className={styles.canvaHint}>
        <span className={styles.canvaHintIcon} aria-hidden="true">
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "inline-block", verticalAlign: "middle" }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </span>
        <span className={styles.canvaHintText}>Pilih Foto</span>
      </div>
    </div>
  );
}

/**
 * Photo Frame Widget:
 * Features 5 torn paper & vintage newspaper collage frame styles with Canva photo slot placeholder.
 */
export function PhotoFrameWidget({
  image,
  caption,
  fit = "cover",
  alt,
  style,
}: PhotoFrameWidgetProps) {
  const imgSrc = useMemo(() => parseFrameImage(image), [image]);
  const variant = style?.variant || "torn-rect";
  const objectFit = fit === "contain" ? "contain" : "cover";
  const captionText = typeof caption === "string" ? caption.trim() : "";
  const altText = typeof alt === "string" && alt.trim() ? alt.trim() : captionText || "Foto";

  return (
    <WidgetFrame type="photoFrame" style={style}>
      <div
        className={styles.frameContainer}
        data-frame-variant={variant}
        data-testid="photo-frame-widget"
      >
        {/* Torn Paper Outer Wrapper */}
        <div className={`${styles.tornPaperFrame} ${styles[`frame_${variant}`] || ""}`}>
          {/* Newspaper / Kraft details for specific variants */}
          {variant === "torn-oval" && (
            <div className={styles.newspaperHeader} aria-hidden="true">
              <span>THE WEDDING GAZETTE</span>
              <span>• SPECIAL EDITION •</span>
            </div>
          )}
          {variant === "torn-arch" && (
            <div className={styles.archNewspaperText} aria-hidden="true">
              <span>OUR CELEBRATION • SWEET MEMORIES • FOREVER</span>
            </div>
          )}

          {/* Photo Cutout Window */}
          <div className={`${styles.photoCutout} ${styles[`cutout_${variant}`] || ""}`}>
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={altText}
                className={styles.frameImage}
                style={{ objectFit }}
                loading="lazy"
                data-testid="photo-frame-image"
              />
            ) : (
              <CanvaLandscapePlaceholder label={captionText} />
            )}
          </div>

          {/* Realistic deckled torn paper edge overlay */}
          <div className={`${styles.tornEdgeOverlay} ${styles[`edge_${variant}`] || ""}`} aria-hidden="true" />
        </div>

        {/* Optional Caption */}
        {captionText && (
          <p className={styles.frameCaption} data-testid="photo-frame-caption">
            {captionText}
          </p>
        )}
      </div>
    </WidgetFrame>
  );
}
