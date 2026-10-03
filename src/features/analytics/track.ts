/**
 * Lightweight analytics hooks (PRD analytics events): `map_clicked`,
 * `rsvp_submitted`, `music_played`. Events are dispatched as a DOM
 * CustomEvent so any sink (GA, Plausible, a beacon) can subscribe later.
 * Payloads are non-PII scalars only; never throws and never blocks the UI.
 */
export const ANALYTICS_EVENTS = ["map_clicked", "rsvp_submitted", "music_played"] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_DOM_EVENT = "dib:analytics";

export type AnalyticsPayload = Readonly<Record<string, string | number | boolean>>;

export interface AnalyticsDetail {
  readonly event: AnalyticsEventName;
  readonly payload: AnalyticsPayload;
  readonly at: number;
}

export function track(event: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  if (typeof window === "undefined") return;
  try {
    const detail: AnalyticsDetail = { event, payload, at: Date.now() };
    window.dispatchEvent(new CustomEvent<AnalyticsDetail>(ANALYTICS_DOM_EVENT, { detail }));
  } catch {
    // Analytics must never affect the page.
  }
}
