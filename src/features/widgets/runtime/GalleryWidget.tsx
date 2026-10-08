"use client";

import { useState, type KeyboardEvent, type TouchEvent } from "react";
import { assetUrl } from "@/features/assets/urls";
import { getGalleryPresentation } from "../widget-styles";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface GalleryWidgetProps {
  readonly title?: unknown;
  readonly layout?: unknown;
  readonly items?: unknown;
  readonly style?: WidgetStyleProps | undefined;
  readonly variables?: readonly { key: string; default?: unknown }[] | undefined;
}

interface GalleryImage {
  readonly src: string;
  readonly alt: string;
  readonly bind?: string;
}

const ASSET_ID = /^[0-9a-f-]{36}$/i;
const SAFE_SRC = /^(https?:\/\/|\/|data:image\/)/i;

/** Picks only known fields; accepts `assetId` (own asset), safe `src` URL, or `{ bind: string }`. */
export function parseGalleryItems(
  items: unknown,
  variables?: readonly { key: string; default?: unknown }[],
): GalleryImage[] {
  if (!Array.isArray(items)) return [];
  const out: GalleryImage[] = [];
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const alt = typeof rec.alt === "string" ? rec.alt : "";
    let src = "";
    if (typeof rec.assetId === "string" && ASSET_ID.test(rec.assetId)) {
      src = assetUrl(rec.assetId);
    } else if (typeof rec.src === "string" && SAFE_SRC.test(rec.src)) {
      src = rec.src;
    } else if (typeof rec.url === "string" && SAFE_SRC.test(rec.url)) {
      src = rec.url;
    }

    if (typeof rec.bind === "string") {
      if (!src && typeof rec.fallback === "string") {
        if (ASSET_ID.test(rec.fallback)) src = assetUrl(rec.fallback);
        else if (SAFE_SRC.test(rec.fallback)) src = rec.fallback;
      }
      if (!src && variables) {
        const matching = variables.find((v) => v.key === rec.bind);
        if (matching?.default) {
          if (typeof matching.default === "string") {
            if (ASSET_ID.test(matching.default)) src = assetUrl(matching.default);
            else if (SAFE_SRC.test(matching.default)) src = matching.default;
          } else if (typeof matching.default === "object" && matching.default !== null) {
            const defRec = matching.default as Record<string, unknown>;
            if (typeof defRec.assetId === "string" && ASSET_ID.test(defRec.assetId)) {
              src = assetUrl(defRec.assetId);
            } else if (typeof defRec.src === "string" && SAFE_SRC.test(defRec.src)) {
              src = defRec.src;
            } else if (typeof defRec.url === "string" && SAFE_SRC.test(defRec.url)) {
              src = defRec.url;
            }
          }
        }
      }
      out.push({
        src,
        alt: alt || `{${rec.bind}}`,
        bind: rec.bind,
      });
      continue;
    }

    if (src) {
      out.push({ src, alt });
    }
  }
  return out;
}

/** Grid or slider gallery. Images are lazy; slider supports buttons, arrow keys and swipe (FR-WDG-006). */
export function GalleryWidget({ title, layout, items, style, variables }: GalleryWidgetProps) {
  const images = parseGalleryItems(items, variables);
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const heading = typeof title === "string" && title.trim() ? title.trim() : "Galeri";
  const presentation = getGalleryPresentation(style?.variant, layout);

  if (images.length === 0) {
    return (
      <WidgetFrame type="gallery" style={style} className={styles.gallery}>
        <div
          className={styles.galleryEmptyPreview}
          data-gallery-presentation={presentation}
          data-testid="gallery-empty-preview"
          aria-label="Belum ada foto galeri"
        >
          <span />
          <span />
          <span />
        </div>
      </WidgetFrame>
    );
  }

  const isSlider =
    presentation === "slider" ||
    presentation === "legacy-slider" ||
    presentation === "glass-carousel";

  if (!isSlider) {
    return (
      <WidgetFrame type="gallery" style={style} className={styles.gallery}>
        <ul
          className={styles.galleryGrid}
          aria-label={heading}
          data-gallery-presentation={presentation}
          data-testid="gallery-collection"
        >
          {images.map((img, i) => (
            <li key={`${img.bind || img.src}-${i}`}>
              {img.src ? (
                // eslint-disable-next-line @next/next/no-img-element -- own asset route
                <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
              ) : (
                <div
                  className={styles.galleryPlaceholderItem}
                  data-testid="gallery-placeholder-item"
                  aria-label={img.alt || "Placeholder Foto"}
                >
                  <svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <span className={styles.galleryPlaceholderText}>{img.bind ? `{${img.bind}}` : "Pilih Foto"}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </WidgetFrame>
    );
  }

  const last = images.length - 1;
  const go = (delta: number) => setIndex((i) => Math.min(last, Math.max(0, i + delta)));
  const current = images[Math.min(index, last)]!;
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
  };
  const onTouchEnd = (event: TouchEvent) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchX !== null && endX !== undefined && Math.abs(endX - touchX) > 40) {
      go(endX < touchX ? 1 : -1);
    }
    setTouchX(null);
  };

  return (
    <WidgetFrame type="gallery" style={style} className={styles.gallery}>
      <div
        className={styles.slider}
        role="group"
        aria-roledescription="carousel"
        aria-label={heading}
        tabIndex={0}
        onKeyDown={onKey}
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={onTouchEnd}
        data-testid="gallery-slider"
        data-gallery-presentation={presentation}
      >
        <div
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} dari ${images.length}`}
        >
          {current.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- own asset route
            <img src={current.src} alt={current.alt} loading="lazy" decoding="async" />
          ) : (
            <div
              className={styles.galleryPlaceholderItem}
              data-testid="gallery-placeholder-item"
              aria-label={current.alt || "Placeholder Foto"}
              style={{ minHeight: "220px" }}
            >
              <svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span className={styles.galleryPlaceholderText}>{current.bind ? `{${current.bind}}` : "Pilih Foto"}</span>
            </div>
          )}
        </div>
        <div className={styles.sliderNav}>
          <button
            type="button"
            className={styles.button}
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Foto sebelumnya"
          >
            ‹
          </button>
          <span aria-live="polite" data-testid="gallery-position">
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={() => go(1)}
            disabled={index >= last}
            aria-label="Foto berikutnya"
          >
            ›
          </button>
        </div>
      </div>
    </WidgetFrame>
  );
}
