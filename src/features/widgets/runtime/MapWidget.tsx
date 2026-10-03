"use client";

import { track } from "@/features/analytics/track";
import { mapUrl } from "../logic";
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

/** Static link widget: opens Google Maps for the coordinate. No embedded Maps API (FR-WDG-002). */
export function MapWidget({ coordinate, label, buttonText, style }: MapWidgetProps) {
  const href = mapUrl(coordinate);
  return (
    <WidgetFrame type="map" style={style}>
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
          {text(buttonText, "Buka Google Maps")}
        </a>
      ) : (
        <span className={styles.button} aria-disabled="true" data-testid="map-link-disabled">
          {text(buttonText, "Buka Google Maps")}
        </span>
      )}
    </WidgetFrame>
  );
}
