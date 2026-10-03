/**
 * Pure widget logic (no React, no DOM): shared by definitions, editor
 * placeholders and runtime components, and unit-tested in isolation.
 */
import { coordinateSchema, type Coordinate } from "@/lib/schema";
import { zonedLocalToInstant } from "@/lib/engine/formatters";
import { datetimeValueSchema, type DatetimeValue } from "@/lib/schema";

// ----------------------------------------------------------------------- map

/**
 * Google Maps "search" deep link for a coordinate (no embedded Maps API in the
 * MVP, FR-WDG-002). Returns null for anything that is not a valid coordinate,
 * so the runtime can degrade to a disabled button instead of a broken link.
 */
export function mapUrl(value: unknown): string | null {
  const parsed = coordinateSchema.safeParse(value);
  if (!parsed.success) return null;
  const { lat, lng }: Coordinate = parsed.data;
  const fmt = (n: number) => String(Number(n.toFixed(7)));
  return `https://www.google.com/maps/search/?api=1&query=${fmt(lat)},${fmt(lng)}`;
}

// ------------------------------------------------------------------ countdown

export const COUNTDOWN_UNITS = ["days", "hours", "minutes", "seconds"] as const;
export type CountdownUnit = (typeof COUNTDOWN_UNITS)[number];

export const DEFAULT_COUNTDOWN_LABELS: Readonly<Record<CountdownUnit, string>> = {
  days: "Hari",
  hours: "Jam",
  minutes: "Menit",
  seconds: "Detik",
};

export type CountdownState =
  | { readonly state: "invalid" }
  | { readonly state: "elapsed" }
  | {
      readonly state: "counting";
      readonly days: number;
      readonly hours: number;
      readonly minutes: number;
      readonly seconds: number;
    };

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Absolute instant (ms since epoch) of a wall-clock target in its own IANA zone, or null. */
export function countdownTargetInstant(target: unknown): number | null {
  const parsed = datetimeValueSchema.safeParse(target);
  if (!parsed.success) return null;
  const { local, timeZone }: DatetimeValue = parsed.data;
  const instant = zonedLocalToInstant(local, timeZone);
  return Number.isFinite(instant) ? instant : null;
}

/**
 * Time left until `target` as seen at `nowMs`. Pure: the clock is injected, so
 * the same wall-clock target gives the same answer for every viewer timezone.
 */
export function computeCountdown(target: unknown, nowMs: number): CountdownState {
  const instant = countdownTargetInstant(target);
  if (instant === null) return { state: "invalid" };
  const remaining = instant - nowMs;
  if (remaining <= 0) return { state: "elapsed" };
  return {
    state: "counting",
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
  };
}

// ------------------------------------------------------------- guest greeting

export const DEFAULT_GREETING_PREFIX = "Kepada Yth.";
export const DEFAULT_GREETING_FALLBACK = "Tamu Undangan";

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

export interface GreetingParts {
  readonly prefix: string;
  readonly name: string;
  /** True when the generic fallback replaced a missing guest name. */
  readonly usedFallback: boolean;
}

/** Greeting for the current guest; a missing/blank name never leaves a blank or "null" (AC-06). */
export function greetingParts(props: {
  readonly guestName?: unknown;
  readonly prefix?: unknown;
  readonly fallback?: unknown;
}): GreetingParts {
  const name = asText(props.guestName);
  return {
    prefix: asText(props.prefix) ?? DEFAULT_GREETING_PREFIX,
    name: name ?? asText(props.fallback) ?? DEFAULT_GREETING_FALLBACK,
    usedFallback: name === undefined,
  };
}

// ------------------------------------------------------------------- helpers

/** Short human text for a prop that may be a binding or a static value (editor placeholders). */
export function describeProp(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && "bind" in (value as object)) {
    return `{${String((value as { bind: unknown }).bind)}}`;
  }
  if (typeof value === "string") return value;
  return undefined;
}
