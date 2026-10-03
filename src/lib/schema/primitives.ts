/**
 * Shared Zod primitives for the canonical document contract.
 *
 * PRD refs: P-03, §10 (variable keys are stable dot paths), §15, NFR-SEC-001.
 * Everything here is declarative data validation — no executable content.
 */
import { z } from "zod";

/** Stable element/section id, e.g. `sec_cover`, `el_title`, `wdg_map`. */
export const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const idSchema = z.string().regex(ID_PATTERN, "Invalid id");

/** Segment names that would be dangerous as object property names. */
const RESERVED_KEY_SEGMENTS: ReadonlySet<string> = new Set([
  "constructor",
  "prototype",
  "tostring",
  "valueof",
  "hasownproperty",
]);

/** Stable variable key as dot path, e.g. `couple.bride.fullName`. */
export const VARIABLE_KEY_PATTERN = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*$/;
export const MAX_VARIABLE_KEY_LENGTH = 128;

export const variableKeySchema = z
  .string()
  .max(MAX_VARIABLE_KEY_LENGTH)
  .regex(VARIABLE_KEY_PATTERN, "Variable key must be a dot path like couple.bride.fullName")
  .refine(
    (key) => key.split(".").every((segment) => !RESERVED_KEY_SEGMENTS.has(segment.toLowerCase())),
    "Variable key contains a reserved segment",
  );

/** Short lowerCamel key for tokens, widget props, collection fields. */
export const SHORT_KEY_PATTERN = /^[a-z][A-Za-z0-9]{0,31}$/;
export const shortKeySchema = z
  .string()
  .regex(SHORT_KEY_PATTERN, "Key must be lowerCamel, max 32 chars")
  .refine((key) => !RESERVED_KEY_SEGMENTS.has(key.toLowerCase()), "Reserved key");

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
export const hexColorSchema = z.string().regex(HEX_COLOR_PATTERN, "Invalid hex color");

/** A color is a hex literal or a reference to a theme token (FR-SET-001). */
export const colorValueSchema = z.union([
  hexColorSchema,
  z.strictObject({ token: shortKeySchema }),
]);

/** Font family names are restricted so they can never break out of CSS. */
export const FONT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
export const fontNameSchema = z.string().regex(FONT_NAME_PATTERN, "Invalid font name");
export const fontValueSchema = z.union([fontNameSchema, z.strictObject({ token: shortKeySchema })]);

export function isValidTimeZone(timeZone: string): boolean {
  if (timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z.string().refine(isValidTimeZone, "Unknown IANA time zone");

export function isValidLocale(locale: string): boolean {
  if (locale.length === 0 || locale.length > 35) return false;
  try {
    return Intl.getCanonicalLocales(locale).length === 1;
  } catch {
    return false;
  }
}

export const localeSchema = z.string().refine(isValidLocale, "Invalid locale");

/** Opacity 0..1 (finite). */
export const opacitySchema = z.number().min(0).max(1);

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (daysInMonth[month - 1] ?? 0);
}
