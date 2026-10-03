/**
 * Whitelisted formatters (PRD section 10.1: date, datetime, uppercase,
 * lowercase, title-case, phone-display, simple currency). Pure functions: no
 * eval, no dynamic code, deterministic for a given input/locale/time zone.
 */
import type { DatetimeValue, Formatter, VariableType } from "@/lib/schema";
import { isFormatterCompatible } from "@/lib/schema";

export const DEFAULT_LOCALE = "id-ID";

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcMs);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converts a wall-clock time in an IANA zone to an absolute instant.
 * Handles DST by re-checking the offset at the candidate instant. Returns
 * NaN when the input does not match `YYYY-MM-DDTHH:mm[:ss]`.
 */
export function zonedLocalToInstant(local: string, timeZone: string): number {
  const m = LOCAL_PATTERN.exec(local);
  if (!m) return Number.NaN;
  const guess = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] ?? "0"),
  );
  const first = guess - zoneOffsetMs(guess, timeZone);
  const second = guess - zoneOffsetMs(first, timeZone);
  return second;
}

function isDatetimeValue(value: unknown): value is DatetimeValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DatetimeValue).local === "string" &&
    typeof (value as DatetimeValue).timeZone === "string"
  );
}

function formatDateOnly(iso: string, style: "short" | "medium" | "long" | "full", locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "UTC" }).format(
    Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1),
  );
}

/**
 * Formats a datetime value. Without `timeZone` the wall-clock time of the
 * stored zone is shown; with `timeZone` the same instant is converted.
 */
function formatDatetime(
  value: DatetimeValue,
  style: "short" | "medium" | "long" | "full",
  locale: string,
  targetZone: string | undefined,
  withTime: boolean,
): string {
  const zone = targetZone ?? value.timeZone;
  const instant = zonedLocalToInstant(value.local, value.timeZone);
  if (Number.isNaN(instant)) return "";
  const options: Intl.DateTimeFormatOptions = { dateStyle: style, timeZone: zone };
  if (withTime) options.timeStyle = style === "long" || style === "full" ? "long" : "short";
  return new Intl.DateTimeFormat(locale, options).format(instant);
}

export function titleCase(input: string): string {
  return input
    .toLocaleLowerCase()
    .replace(/(^|[\s\-(/])(\p{L})/gu, (_, boundary: string, letter: string) => {
      return boundary + letter.toLocaleUpperCase();
    });
}

/**
 * Display format for phone numbers. Region `ID` normalizes `08..`/`62..`/`+62..`
 * to `+62 812-3456-7890`. Unparseable or unsupported input is returned trimmed
 * (never throws, never drops the value).
 */
export function phoneDisplay(input: string, region: string): string {
  const trimmed = input.trim();
  if (region !== "ID") return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  let national: string;
  if (digits.startsWith("62")) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else return trimmed;
  if (national.length < 8 || national.length > 12) return trimmed;
  const head = national.slice(0, 3);
  const rest = national.slice(3);
  const groups: string[] = [];
  for (let i = 0; i < rest.length; i += 4) groups.push(rest.slice(i, i + 4));
  return `+62 ${[head, ...groups].join("-")}`;
}

export interface FormatOptions {
  readonly defaultLocale?: string;
}

/**
 * Applies a whitelisted formatter to an already-validated value. Returns
 * `undefined` when the formatter cannot be applied to this variable type, so
 * the caller can report it and fall back to plain text.
 */
export function applyFormatter(
  formatter: Formatter,
  variableType: VariableType,
  value: unknown,
  options: FormatOptions = {},
): string | undefined {
  if (!isFormatterCompatible(formatter.name, variableType)) return undefined;
  const fallbackLocale = options.defaultLocale ?? DEFAULT_LOCALE;

  switch (formatter.name) {
    case "date": {
      const locale = formatter.locale ?? fallbackLocale;
      if (variableType === "date" && typeof value === "string") {
        return formatDateOnly(value, formatter.style, locale);
      }
      if (isDatetimeValue(value)) {
        return formatDatetime(value, formatter.style, locale, formatter.timeZone, false);
      }
      return undefined;
    }
    case "datetime": {
      if (!isDatetimeValue(value)) return undefined;
      return formatDatetime(
        value,
        formatter.style,
        formatter.locale ?? fallbackLocale,
        formatter.timeZone,
        true,
      );
    }
    case "uppercase":
      return typeof value === "string" ? value.toLocaleUpperCase() : undefined;
    case "lowercase":
      return typeof value === "string" ? value.toLocaleLowerCase() : undefined;
    case "title-case":
      return typeof value === "string" ? titleCase(value) : undefined;
    case "phone-display":
      return typeof value === "string" ? phoneDisplay(value, formatter.region) : undefined;
    case "currency": {
      if (typeof value !== "number") return undefined;
      return new Intl.NumberFormat(formatter.locale ?? fallbackLocale, {
        style: "currency",
        currency: formatter.currency,
        maximumFractionDigits: formatter.currency === "IDR" ? 0 : 2,
      }).format(value);
    }
  }
}
