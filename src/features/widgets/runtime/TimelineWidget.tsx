"use client";

import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface TimelineEventItem {
  readonly time: string;
  readonly title: string;
  readonly description?: string;
  readonly location?: string;
  readonly icon?: "ring" | "heart" | "glass" | "calendar" | "church" | "sparkles";
}

export interface TimelineWidgetProps {
  readonly title?: unknown;
  readonly subtitle?: unknown;
  readonly events?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const DEFAULT_EVENTS: readonly TimelineEventItem[] = [
  {
    time: "08:00 - 10:00 WIB",
    title: "Akad Nikah",
    description: "Prosesi ijab kabul & doa bersama",
    location: "Masjid Raya",
    icon: "ring",
  },
  {
    time: "11:00 - 13:00 WIB",
    title: "Resepsi Pernikahan",
    description: "Ramah tamah & santap siang",
    location: "Grand Ballroom",
    icon: "glass",
  },
  {
    time: "19:00 - 21:00 WIB",
    title: "After Party",
    description: "Perayaan bersama kerabat dekat",
    location: "Rooftop Garden",
    icon: "sparkles",
  },
];

export function parseTimelineEvents(events: unknown): TimelineEventItem[] {
  if (!Array.isArray(events)) return [...DEFAULT_EVENTS];
  const out: TimelineEventItem[] = [];
  for (const raw of events) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const time = s(rec.time);
    const title = s(rec.title);
    if (!time && !title) continue;
    out.push({
      time: time || "00:00",
      title: title || "Agenda",
      description: s(rec.description) || undefined,
      location: s(rec.location) || undefined,
      icon: (s(rec.icon) as TimelineEventItem["icon"]) || "ring",
    });
  }
  return out.length > 0 ? out : [...DEFAULT_EVENTS];
}

function EventIcon({ icon }: { readonly icon?: string }) {
  switch (icon) {
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case "glass":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
          <path d="M8 22h8" />
          <path d="M12 15v7" />
          <path d="M6 3h12l-2 9a4 4 0 0 1-8 0L6 3z" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "church":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
          <path d="M12 2v4" />
          <path d="M10 4h4" />
          <path d="M4 22V10l8-5 8 5v12H4z" />
          <path d="M10 22v-5a2 2 0 0 1 4 0v5" />
        </svg>
      );
    case "sparkles":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
      );
    case "ring":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="14" r="7" />
          <path d="M12 3l2 4h-4l2-4z" />
        </svg>
      );
  }
}

export function TimelineWidget({ title, subtitle, events, style }: TimelineWidgetProps) {
  const items = parseTimelineEvents(events);
  const heading = s(title) || "Rundown Acara";
  const sub = s(subtitle);
  const variant = style?.variant ?? "vertical-left";

  return (
    <WidgetFrame type="timeline" style={style} className={`${styles.timelineWidget} ${styles[`timeline_${variant}`] ?? ""}`}>
      {/* Header */}
      <div className={styles.timelineHeader}>
        <h3 className={styles.timelineHeading}>{heading}</h3>
        {sub && <p className={styles.timelineSubheading}>{sub}</p>}
      </div>

      {/* Timeline Content */}
      <div className={styles.timelineBody} data-variant={variant}>
        {variant === "horizontal-steps" ? (
          <div className={styles.timelineHorizontalTrack}>
            {items.map((ev, i) => (
              <div key={`${ev.time}-${i}`} className={styles.timelineHorizontalStep}>
                <div className={styles.stepNodeBadge}>
                  <span className={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</span>
                  <div className={styles.stepIconWrap}>
                    <EventIcon icon={ev.icon} />
                  </div>
                </div>
                <div className={styles.stepCard}>
                  <span className={styles.stepTime}>{ev.time}</span>
                  <h4 className={styles.stepTitle}>{ev.title}</h4>
                  {ev.location && (
                    <div className={styles.stepLocation}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      <span>{ev.location}</span>
                    </div>
                  )}
                  {ev.description && <p className={styles.stepDesc}>{ev.description}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.timelineVerticalList}>
            {items.map((ev, i) => {
              const isEven = i % 2 === 0;
              return (
                <div
                  key={`${ev.time}-${i}`}
                  className={`${styles.timelineVerticalItem} ${isEven ? styles.itemEven : styles.itemOdd}`}
                >
                  <div className={styles.timelineNodeWrap}>
                    <div className={styles.timelineNode}>
                      <EventIcon icon={ev.icon} />
                    </div>
                    {i < items.length - 1 && <div className={styles.timelineTrackLine} />}
                  </div>

                  <div className={styles.timelineItemCard}>
                    <div className={styles.timelineCardBadge}>
                      <span className={styles.timelineTimeText}>{ev.time}</span>
                    </div>
                    <h4 className={styles.timelineItemTitle}>{ev.title}</h4>
                    {ev.location && (
                      <div className={styles.timelineItemLocation}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11" aria-hidden="true">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        <span>{ev.location}</span>
                      </div>
                    )}
                    {ev.description && <p className={styles.timelineItemDesc}>{ev.description}</p>}
                  </div>

                  {/* Spacer for centered layout symmetry */}
                  <div className={styles.timelineCenterSpacer} aria-hidden="true" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
