"use client";

import { track } from "@/features/analytics/track";
import { mapEmbedUrl, mapUrl } from "../logic";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface MapWidgetProps {
  readonly coordinate?: unknown;
  readonly label?: unknown;
  readonly buttonText?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

const text = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

/**
 * Map Widget with embedded Google Maps interactive preview and deep-link button.
 */
export function MapWidget({ coordinate, label, buttonText, style }: MapWidgetProps) {
  const href = mapUrl(coordinate);
  const embedUrl = mapEmbedUrl(coordinate);

  return (
    <WidgetFrame type="map" style={style}>
      <div className={styles.mapCard}>
        <div className={styles.mapViewport}>
          {embedUrl ? (
            <iframe
              title={text(label, "Peta Lokasi")}
              src={embedUrl}
              className={styles.mapIframe}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className={`${styles.mapPlaceholder}`}>
              <div className={styles.mapEmptyContent}>
                <span className={styles.mapPinIconLarge}>📍</span>
                <p className={styles.mapEmptyTitle}>Peta Lokasi Acara</p>
                <p className={styles.mapEmptySubtitle}>Atur koordinat di panel editor</p>
              </div>
            </div>
          )}
          <div className={styles.mapBadge}>
            <span className={styles.mapPinIcon}>📍</span>
            <span>Google Maps</span>
          </div>
        </div>

        <div className={styles.mapDetails}>
          <p className={styles.label}>{text(label, "Lokasi acara")}</p>
          {href ? (
            <a
              className={styles.button}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="map-link"
              onClick={() => track("map_clicked")}
            >
              <span className={styles.buttonIcon}>🗺️</span>
              {text(buttonText, "Buka Google Maps")}
            </a>
          ) : (
            <span className={styles.button} aria-disabled="true" data-testid="map-link-disabled">
              <span className={styles.buttonIcon}>🗺️</span>
              {text(buttonText, "Buka Google Maps")}
            </span>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}

