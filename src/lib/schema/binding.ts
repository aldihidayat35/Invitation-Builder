/**
 * Binding model: structured, declarative references to variables.
 *
 * PRD refs: FR-VAR-002, FR-VAR-003, §10.1.
 * - Bindings are objects, never interpolated strings (no template eval).
 * - Formatters come from a fixed whitelist with strictly typed options.
 */
import { z } from "zod";
import { isPlainObject, jsonValueSchema, isForbiddenKey, type JsonValue } from "./json";
import { localeSchema, timeZoneSchema, variableKeySchema } from "./primitives";

export const FORMATTER_NAMES = [
  "date",
  "datetime",
  "uppercase",
  "lowercase",
  "title-case",
  "phone-display",
  "currency",
] as const;
export type FormatterName = (typeof FORMATTER_NAMES)[number];

const dateStyle = z.enum(["short", "medium", "long", "full"]);

export const formatterSchema = z.discriminatedUnion("name", [
  z.strictObject({
    name: z.literal("date"),
    style: dateStyle.default("long"),
    timeZone: timeZoneSchema.optional(),
    locale: localeSchema.optional(),
  }),
  z.strictObject({
    name: z.literal("datetime"),
    style: dateStyle.default("long"),
    timeZone: timeZoneSchema.optional(),
    locale: localeSchema.optional(),
  }),
  z.strictObject({ name: z.literal("uppercase") }),
  z.strictObject({ name: z.literal("lowercase") }),
  z.strictObject({ name: z.literal("title-case") }),
  z.strictObject({
    name: z.literal("phone-display"),
    region: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default("ID"),
  }),
  z.strictObject({
    name: z.literal("currency"),
    currency: z.string().regex(/^[A-Z]{3}$/),
    locale: localeSchema.optional(),
  }),
]);
export type Formatter = z.infer<typeof formatterSchema>;

const fallbackSchema = z.union([z.string().max(1000), z.number(), z.boolean()]);

/** Reference to a variable, optionally formatted, with fallback/hide behavior. */
export const bindingSchema = z.strictObject({
  bind: variableKeySchema,
  /** Used when an optional value is missing (FR-VAR-003). */
  fallback: fallbackSchema.optional(),
  /** Hide the element/segment when the optional value is missing. */
  hideWhenMissing: z.boolean().optional(),
  formatter: formatterSchema.optional(),
});
export type Binding = z.infer<typeof bindingSchema>;

export function isBindingLike(value: unknown): boolean {
  return isPlainObject(value) && Object.hasOwn(value, "bind");
}

/** Structured text content: static text and/or binding tokens (§10.1). */
export const textSegmentSchema = z.union([
  z.strictObject({ text: z.string().max(2000) }),
  bindingSchema,
]);
export type TextSegment = z.infer<typeof textSegmentSchema>;

export function isBindingSegment(segment: TextSegment): segment is Binding {
  return "bind" in segment;
}

/** Image source: uploaded asset or a binding to an image variable. */
export const imageSourceSchema = z.union([z.strictObject({ assetId: z.uuid() }), bindingSchema]);
export type ImageSource = z.infer<typeof imageSourceSchema>;

export function isBinding(value: unknown): value is Binding {
  return bindingSchema.safeParse(value).success;
}

export type PropValue = Binding | JsonValue;

/**
 * Widget prop value: a Binding or static JSON. Any object that has a `bind`
 * key MUST be a valid Binding — a malformed binding is rejected rather than
 * silently stored as static data.
 */
export const propValueSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    if (isBindingLike(value)) {
      const result = bindingSchema.safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
        }
      }
      return;
    }
    const result = jsonValueSchema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
    }
  })
  .transform((value) => value as PropValue);

/** Keys allowed for widget props (also blocks injection-looking names). */
export const widgetPropKeySchema = z
  .string()
  .regex(/^[a-z][A-Za-z0-9]{0,31}$/, "Prop key must be lowerCamel, max 32 chars")
  .refine((key) => !isForbiddenKey(key), "Prop key is not allowed");
