/**
 * Form generator primitives built from VariableDefinition (FR-INV-002).
 * Framework-free descriptors + value coercion. The final Data Mode UI is
 * Fase 8; this layer only answers "which field, which control, which
 * constraints" and converts raw form strings into typed values.
 */
import type { CollectionField, VariableDefinition, VariableType } from "@/lib/schema";
import type { DataIssue, InvitationData } from "./types";
import {
  createVariableRegistry,
  isMissingValue,
  validateInvitationData,
} from "./variable-registry";

export type FormControl =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "date"
  | "datetime-local"
  | "url"
  | "color"
  | "select"
  | "image"
  | "coordinate"
  | "collection"
  | "richtext";

export interface FormField {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
  readonly type: VariableType;
  readonly control: FormControl;
  readonly required: boolean;
  /** First dot segment, e.g. `couple` for `couple.bride.fullName`. */
  readonly group: string;
  readonly defaultValue?: unknown;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly collectionFields?: readonly CollectionField[];
  readonly maxItems?: number;
  /** datetime values also need an IANA zone (supplied by the caller). */
  readonly needsTimeZone: boolean;
}

export interface FormGroup {
  readonly group: string;
  readonly label: string;
  readonly fields: readonly FormField[];
}

const CONTROL_BY_TYPE: Record<Exclude<VariableType, "guest-context">, FormControl> = {
  text: "text",
  richText: "richtext",
  number: "number",
  date: "date",
  datetime: "datetime-local",
  image: "image",
  url: "url",
  color: "color",
  boolean: "checkbox",
  coordinate: "coordinate",
  select: "select",
  collection: "collection",
};

/** Guest-context variables are runtime-only and never appear in the form. */
export function buildFormFields(definitions: readonly VariableDefinition[]): FormField[] {
  const fields: FormField[] = [];
  for (const def of definitions) {
    if (def.type === "guest-context") continue;
    let control = CONTROL_BY_TYPE[def.type];
    if (def.type === "text" && (def.maxLength ?? 0) > 120) control = "textarea";

    fields.push({
      key: def.key,
      label: def.label,
      ...(def.description !== undefined && { description: def.description }),
      type: def.type,
      control,
      required: def.required,
      group: def.key.split(".")[0] ?? def.key,
      ...("default" in def && def.default !== undefined && { defaultValue: def.default }),
      ...(def.type === "text" && def.maxLength !== undefined && { maxLength: def.maxLength }),
      ...(def.type === "number" && {
        ...(def.min !== undefined && { min: def.min }),
        ...(def.max !== undefined && { max: def.max }),
        integer: def.integer,
      }),
      ...(def.type === "select" && { options: def.options }),
      ...(def.type === "collection" && { collectionFields: def.fields, maxItems: def.maxItems }),
      needsTimeZone: def.type === "datetime",
    });
  }
  return fields;
}

function titleFromGroup(group: string): string {
  const spaced = group.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Groups fields by first key segment, preserving definition order. */
export function groupFormFields(fields: readonly FormField[]): FormGroup[] {
  const groups = new Map<string, FormField[]>();
  for (const field of fields) {
    const list = groups.get(field.group) ?? [];
    list.push(field);
    groups.set(field.group, list);
  }
  return [...groups.entries()].map(([group, list]) => ({
    group,
    label: titleFromGroup(group),
    fields: list,
  }));
}

export interface FormParseOptions {
  /** Zone attached to `datetime` inputs (they carry wall-clock only). */
  readonly timeZone: string;
}

/** Converts one raw form string into a typed value; `undefined` means "not provided". */
export function parseFormValue(
  field: FormField,
  raw: string | undefined,
  options: FormParseOptions,
): unknown {
  if (field.control === "checkbox") {
    return raw === "on" || raw === "true" ? true : raw === undefined ? undefined : false;
  }
  if (raw === undefined || raw.trim() === "") return undefined;
  const text = raw.trim();

  switch (field.type) {
    case "number": {
      const n = Number(text);
      return Number.isFinite(n) ? n : text; // keep the bad text so validation reports wrong_type
    }
    case "datetime":
      return { local: text, timeZone: options.timeZone };
    case "image":
      return { assetId: text };
    case "coordinate": {
      const [lat, lng] = text.split(",").map((part) => Number(part.trim()));
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : text;
    }
    case "richText":
      return [{ text }];
    case "collection": {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    }
    default:
      return text;
  }
}

/** Inverse of {@link parseFormValue}: typed value -> string for an input. */
export function formatFormValue(field: FormField, value: unknown): string {
  if (value === undefined || value === null) return "";
  switch (field.type) {
    case "datetime":
      return typeof value === "object" && "local" in value ? String(value.local).slice(0, 16) : "";
    case "image":
      return typeof value === "object" && "assetId" in value ? String(value.assetId) : "";
    case "coordinate":
      return typeof value === "object" && "lat" in value && "lng" in value
        ? `${String(value.lat)}, ${String(value.lng)}`
        : "";
    case "richText":
      return Array.isArray(value) ? value.map((r: { text: string }) => r.text).join("") : "";
    case "collection":
      return JSON.stringify(value);
    case "boolean":
      return value === true ? "on" : "";
    default:
      return String(value);
  }
}

export interface FormSubmissionResult {
  readonly data: InvitationData;
  readonly issues: readonly DataIssue[];
}

/**
 * Turns raw submitted strings into invitation data and validates it against
 * the variable definitions (type, required, constraints).
 */
export function parseFormSubmission(
  definitions: readonly VariableDefinition[],
  raw: Readonly<Record<string, string | undefined>>,
  options: FormParseOptions,
): FormSubmissionResult {
  const registry = createVariableRegistry(definitions);
  const data: Record<string, unknown> = {};
  for (const field of buildFormFields(definitions)) {
    const value = parseFormValue(
      field,
      Object.hasOwn(raw, field.key) ? raw[field.key] : undefined,
      options,
    );
    if (!isMissingValue(value)) data[field.key] = value;
  }
  return { data, issues: validateInvitationData(registry, data) };
}
