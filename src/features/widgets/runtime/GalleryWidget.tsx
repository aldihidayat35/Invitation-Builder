"use client";

import {
  useState,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
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

/**
 * Gallery widget supporting unlimited photos (10+ hingga 50+ foto) with 3 modern responsive variants:
 * 1. Masonry Flow (Pinterest-style dynamic multi-column flow)
 * 2. Carousel Slider (Hero photo + interactive thumbnail strip)
 * 3. Square Grid (Clean uniform square photo album)
 * Includes expandable pagination toggle and interactive Fullscreen Lightbox preview.
 */
export function GalleryWidget({ title, layout, items, style, variables }: GalleryWidgetProps) {
  const images = parseGalleryItems(items, variables);
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxTouchX, setLightboxTouchX] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [lightboxIndex]);

  const heading = typeof title === "string" && title.trim() ? title.trim() : "Galeri";
  const presentation = getGalleryPresentation(style?.variant, layout);

  const isSlider =
    presentation === "carousel-slider" ||
    presentation === "slider" ||
    presentation === "legacy-slider" ||
    presentation === "glass-carousel";

  const isSquare = presentation === "square-grid";

  // Lightbox keyboard listener
  const handleLightboxKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null && prev < images.length - 1 ? prev + 1 : prev,
        );
      }
    },
    [lightboxIndex, images.length],
  );

  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener("keydown", handleLightboxKeyDown);
      return () => {
        window.removeEventListener("keydown", handleLightboxKeyDown);
      };
    }
  }, [lightboxIndex, handleLightboxKeyDown]);

  if (images.length === 0) {
    return null;
  }

  const last = images.length - 1;
  const goSlider = (delta: number) => setIndex((i) => Math.min(last, Math.max(0, i + delta)));
  const currentSliderImg = images[Math.min(index, last)]!;

  const onSliderTouchEnd = (event: TouchEvent) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchX !== null && endX !== undefined && Math.abs(endX - touchX) > 40) {
      goSlider(endX < touchX ? 1 : -1);
    }
    setTouchX(null);
  };

  const onLightboxTouchEnd = (event: TouchEvent) => {
    const endX = event.changedTouches[0]?.clientX;
    if (lightboxTouchX !== null && endX !== undefined && Math.abs(endX - lightboxTouchX) > 40) {
      if (endX < lightboxTouchX) {
        // Swipe left -> Next
        setLightboxIndex((prev) =>
          prev !== null && prev < images.length - 1 ? prev + 1 : prev,
        );
      } else {
        // Swipe right -> Prev
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      }
    }
    setLightboxTouchX(null);
  };

  const displayedImages = !isSlider && !expanded && images.length > 6 ? images.slice(0, 6) : images;

  // Lightbox element to portal
  const lightboxModal =
    mounted && lightboxIndex !== null && images[lightboxIndex]
      ? createPortal(
          <div
            className={styles.lightboxOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Tampilan Foto Layar Penuh"
            data-testid="gallery-lightbox"
            onClick={() => setLightboxIndex(null)}
          >
            <div className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
              <span className={styles.lightboxCounter}>
                {lightboxIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                className={styles.lightboxCloseBtn}
                onClick={() => setLightboxIndex(null)}
                aria-label="Tutup pratinjau foto"
                data-testid="gallery-lightbox-close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div
              className={styles.lightboxContent}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => setLightboxTouchX(e.touches[0]?.clientX ?? null)}
              onTouchEnd={onLightboxTouchEnd}
            >
              {lightboxIndex > 0 ? (
                <button
                  type="button"
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`}
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  aria-label="Foto sebelumnya"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightboxIndex]?.src}
                alt={images[lightboxIndex]?.alt || `Foto ${lightboxIndex + 1}`}
                className={styles.lightboxImg}
                decoding="async"
              />

              {lightboxIndex < images.length - 1 ? (
                <button
                  type="button"
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`}
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  aria-label="Foto selanjutnya"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : null}
            </div>

            {/* Thumbnail Navigation Strip inside Lightbox */}
            <div className={styles.lightboxThumbStrip} onClick={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={`lb-thumb-${img.bind || img.src}-${i}`}
                  type="button"
                  className={`${styles.lightboxThumbBtn} ${lightboxIndex === i ? styles.lightboxThumbActive : ""}`}
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`Pilih foto ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  // 1. CAROUSEL SLIDER VARIANT
  if (isSlider) {
    return (
      <WidgetFrame type="gallery" style={style} className={styles.gallery}>
        <div
          className={styles.galleryCarouselWrapper}
          role="group"
          aria-roledescription="carousel"
          aria-label={heading}
          tabIndex={0}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "ArrowRight") goSlider(1);
            else if (e.key === "ArrowLeft") goSlider(-1);
          }}
          onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={onSliderTouchEnd}
          data-testid="gallery-slider"
          data-gallery-presentation={presentation}
        >
          {/* Main Hero Photo Display */}
          <div
            className={styles.galleryCarouselHero}
            onClick={() => setLightboxIndex(index)}
            title="Klik untuk melihat layar penuh"
          >
            {currentSliderImg.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSliderImg.src}
                alt={currentSliderImg.alt || `Foto ${index + 1}`}
                className={styles.galleryCarouselHeroImg}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className={styles.galleryPlaceholderItem}
                data-testid="gallery-placeholder-item"
                aria-label={currentSliderImg.alt || "Placeholder Foto"}
                style={{ minHeight: "240px" }}
              >
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span className={styles.galleryPlaceholderText}>{currentSliderImg.bind ? `{${currentSliderImg.bind}}` : "Pilih Foto"}</span>
              </div>
            )}

            {/* Position badge & zoom hint */}
            <div className={styles.galleryCarouselBadge}>
              <span>{index + 1} / {images.length}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </div>

            {/* In-hero navigation buttons */}
            <button
              type="button"
              className={`${styles.galleryCarouselNavBtn} ${styles.galleryCarouselPrev}`}
              onClick={(e) => {
                e.stopPropagation();
                goSlider(-1);
              }}
              disabled={index === 0}
              aria-label="Foto sebelumnya"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.galleryCarouselNavBtn} ${styles.galleryCarouselNext}`}
              onClick={(e) => {
                e.stopPropagation();
                goSlider(1);
              }}
              disabled={index >= last}
              aria-label="Foto berikutnya"
            >
              ›
            </button>
          </div>

          {/* Bottom Thumbnail Strip */}
          <div className={styles.galleryThumbnailStrip} aria-label="Daftar foto galeri">
            {images.map((img, i) => (
              <button
                key={`thumb-${img.bind || img.src}-${i}`}
                type="button"
                className={`${styles.galleryThumbnailItem} ${index === i ? styles.galleryThumbnailActive : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Tampilkan foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt="" loading="lazy" />
              </button>
            ))}
          </div>

          <span className="sr-only" aria-live="polite" data-testid="gallery-position">
            {index + 1} / {images.length}
          </span>
        </div>
        {lightboxModal}
      </WidgetFrame>
    );
  }

  // 2. MASONRY FLOW & 3. SQUARE GRID VARIANTS
  return (
    <WidgetFrame type="gallery" style={style} className={styles.gallery}>
      <ul
        className={isSquare ? styles.gallerySquareGrid : styles.galleryMasonryFlow}
        aria-label={heading}
        data-gallery-presentation={presentation}
        data-gallery-count={images.length}
        data-testid="gallery-collection"
      >
        {displayedImages.map((img, i) => (
          <li
            key={`${img.bind || img.src}-${i}`}
            className={isSquare ? styles.gallerySquareItem : styles.galleryMasonryItem}
            onClick={() => setLightboxIndex(i)}
            title="Klik untuk melihat foto lebih besar"
          >
            {img.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.src}
                alt={img.alt || `Foto ${i + 1}`}
                className={isSquare ? styles.gallerySquareImg : styles.galleryMasonryImg}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className={styles.galleryPlaceholderItem}
                data-testid="gallery-placeholder-item"
                aria-label={img.alt || "Placeholder Foto"}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      {/* Expand / Collapse Button if > 6 photos */}
      {images.length > 6 ? (
        <div className={styles.galleryExpandWrapper}>
          <button
            type="button"
            className={styles.galleryExpandBtn}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            data-testid="gallery-expand-btn"
          >
            <span>{expanded ? "Tampilkan Lebih Sedikit" : `Lihat Semua Foto (${images.length} Foto)`}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={expanded ? styles.iconRotate : ""}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      ) : null}

      {lightboxModal}
    </WidgetFrame>
  );
}
