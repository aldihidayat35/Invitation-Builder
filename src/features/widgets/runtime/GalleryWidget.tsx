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
}

interface GalleryImage {
  readonly src: string;
  readonly alt: string;
}

const ASSET_ID = /^[0-9a-f-]{36}$/i;
const SAFE_SRC = /^(https?:\/\/|\/)/i;

/** Picks only known fields; accepts `assetId` (own asset) or a safe `src` URL. */
export function parseGalleryItems(items: unknown): GalleryImage[] {
  if (!Array.isArray(items)) return [];
  const out: GalleryImage[] = [];
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const alt = typeof rec.alt === "string" ? rec.alt : "";
    if (typeof rec.assetId === "string" && ASSET_ID.test(rec.assetId)) {
      out.push({ src: assetUrl(rec.assetId), alt });
    } else if (typeof rec.src === "string" && SAFE_SRC.test(rec.src)) {
      out.push({ src: rec.src, alt });
    }
  }
  return out;
}

/** Grid or slider gallery. Images are lazy; slider supports buttons, arrow keys and swipe (FR-WDG-006). */
export function GalleryWidget({ title, layout, items, style }: GalleryWidgetProps) {
  const images = parseGalleryItems(items);
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const heading = typeof title === "string" && title.trim() ? title.trim() : "Galeri";
  const presentation = getGalleryPresentation(style?.variant, layout);

  if (images.length === 0) {
    if (presentation !== "legacy-grid" && presentation !== "legacy-slider") {
      return (
        <WidgetFrame type="gallery" style={style} className={styles.gallery}>
          <div className={styles.galleryHeading}>
            <span className={styles.eyebrow}>Our Moments</span>
            <h3 className={styles.label}>{heading}</h3>
          </div>
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
    return (
      <WidgetFrame type="gallery" style={style}>
        <p className={styles.label}>{heading}</p>
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
        <div className={styles.galleryHeading}>
          <span className={styles.eyebrow}>Our Moments</span>
          <h3 className={styles.label}>{heading}</h3>
        </div>
        <ul
          className={styles.galleryGrid}
          aria-label={heading}
          data-gallery-presentation={presentation}
          data-testid="gallery-collection"
        >
          {images.map((img, i) => (
            <li key={`${img.src}-${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- own asset route */}
              <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
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
      <div className={styles.galleryHeading}>
        <span className={styles.eyebrow}>Our Moments</span>
        <h3 className={styles.label}>{heading}</h3>
      </div>
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
          {/* eslint-disable-next-line @next/next/no-img-element -- own asset route */}
          <img src={current.src} alt={current.alt} loading="lazy" decoding="async" />
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
