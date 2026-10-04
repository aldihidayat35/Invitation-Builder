"use client";

import { track } from "@/features/analytics/track";
import { mapEmbedUrl, mapUrl } from "../logic";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";
import { PinIcon, RouteIcon } from "./WidgetIcons";

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
                <PinIcon className={styles.mapPinIconLarge} />
                <p className={styles.mapEmptyTitle}>Peta Lokasi Acara</p>
                <p className={styles.mapEmptySubtitle}>Atur koordinat di panel editor</p>
              </div>
            </div>
          )}
          <div className={styles.mapBadge}>
            <PinIcon className={styles.mapPinIcon} />
            <span>Google Maps</span>
          </div>
        </div>

        <div className={styles.mapDetails}>
          <div className={styles.mapTitleRow}>
            <PinIcon className={styles.mapLocationIcon} />
            <p className={styles.label}>{text(label, "Lokasi acara")}</p>
          </div>
          {href ? (
            <a
              className={styles.button}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="map-link"
              onClick={() => track("map_clicked")}
            >
              <RouteIcon className={styles.buttonIcon} />
              {text(buttonText, "Buka Google Maps")}
            </a>
          ) : (
            <span className={styles.button} aria-disabled="true" data-testid="map-link-disabled">
              <RouteIcon className={styles.buttonIcon} />
              {text(buttonText, "Buka Google Maps")}
            </span>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
