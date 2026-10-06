"use client";

import { useMemo } from "react";
import { assetUrl } from "@/features/assets/urls";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";
import styles from "./GifWidget.module.css";

export interface GifWidgetProps {
  readonly url?: unknown;
  readonly assetId?: unknown;
  readonly caption?: unknown;
  readonly fit?: unknown;
  readonly loop?: unknown;
  readonly alignment?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

const ASSET_ID = /^[0-9a-f-]{36}$/i;
const SAFE_SRC = /^(https?:\/\/|\/|data:image\/)/i;
const DEFAULT_GIF_URL = "https://media.giphy.com/media/l41lO3n0gIuY7vM0E/giphy.gif";

export function parseGifSource(url: unknown, assetId: unknown): string | null {
  if (typeof assetId === "string" && ASSET_ID.test(assetId.trim())) {
    return assetUrl(assetId.trim());
  }
  if (typeof url === "string") {
    const trimmed = url.trim();
    if (ASSET_ID.test(trimmed)) return assetUrl(trimmed);
    if (SAFE_SRC.test(trimmed)) return trimmed;
  }
  if (typeof url === "object" && url !== null) {
    const rec = url as Record<string, unknown>;
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

export function GifWidget({
  url,
  assetId,
  caption,
  fit,
  loop,
  alignment,
  style,
}: GifWidgetProps) {
  const variant = style?.variant || "clean";

  const resolvedSrc = useMemo(() => {
    const parsed = parseGifSource(url, assetId);
    return parsed || DEFAULT_GIF_URL;
  }, [url, assetId]);

  const captionText = typeof caption === "string" ? caption.trim() : "";
  const objectFit = fit === "cover" ? "cover" : "contain";
  const align = alignment === "left" || alignment === "right" ? alignment : "center";

  // Variant class mapping
  const variantClass = useMemo(() => {
    switch (variant) {
      case "floating-badge":
        return styles.variantFloatingBadge;
      case "gold-border":
        return styles.variantGoldBorder;
      case "neon-glow":
        return styles.variantNeonGlow;
      case "vintage-frame":
        return styles.variantVintageFrame;
      case "soft-pill":
        return styles.variantSoftPill;
      case "clean":
      default:
        return styles.variantClean;
    }
  }, [variant]);

  const alignClass =
    align === "left" ? styles.alignLeft : align === "right" ? styles.alignRight : styles.alignCenter;

  const fitClass = objectFit === "cover" ? styles.fitCover : styles.fitContain;

  return (
    <WidgetFrame type="gif" style={style} className={`${styles.gifWidgetRoot} ${variantClass}`}>
      <div
        className={`${styles.gifContentArea} ${alignClass}`}
        data-testid="gif-widget-root"
        data-variant={variant}
      >
        {resolvedSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolvedSrc}
            alt={captionText || "Stiker Animasi GIF"}
            className={`${styles.gifMedia} ${fitClass}`}
            data-testid="gif-widget-media"
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholderCard} data-testid="gif-widget-placeholder">
            <span className={styles.placeholderIcon} aria-hidden="true">
              ✨
            </span>
            <p className={styles.placeholderTitle}>Stiker GIF Belum Diatur</p>
            <p className={styles.placeholderSubtitle}>Pilih stiker animasi dari panel editor</p>
          </div>
        )}
      </div>

      {captionText ? (
        <p
          className={styles.caption}
          style={{ textAlign: align }}
          data-testid="gif-widget-caption"
        >
          {captionText}
        </p>
      ) : null}
    </WidgetFrame>
  );
}
