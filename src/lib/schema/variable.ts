/**
 * Variable definitions and per-type value schemas.
 *
 * PRD refs: FR-VAR-001, §10 (variable keys stable dot paths), P-02.
 * `guest-context` and `collection` appear in the PRD §10 key table
 * (guest.name, gift.accounts) in addition to the FR-VAR-001 list.
 */
import { z } from "zod";
import { coordinateSchema } from "./coordinate";
import {
  hexColorSchema,
  isRealCalendarDate,
  shortKeySchema,
  timeZoneSchema,
  variableKeySchema,
} from "./primitives";
import { safeUrlSchema } from "./url";

export const VARIABLE_TYPES = [
  "text",
  "richText",
  "number",
  "date",
  "datetime",
  "image",
  "url",
  "color",
  "boolean",
  "coordinate",
  "select",
  "collection",
  "guest-context",
] as const;
export type VariableType = (typeof VARIABLE_TYPES)[number];

/** Reserved namespace for values supplied at runtime from guest context. */
export const GUEST_CONTEXT_PREFIX = "guest.";

/** Runtime-provided variables that need no declaration (Lampiran C). */
export const RUNTIME_CONTEXT_VARIABLES: Readonly<Record<string, VariableType>> = {
  "guest.name": "guest-context",
};

export const MAX_TEXT_LENGTH = 5000;
export const MAX_COLLECTION_ITEMS = 50;

// ---------------------------------------------------------------- value types

export const richTextValueSchema = z
  .array(
    z.strictObject({
      text: z.string().max(2000),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
    }),
  )
  .max(200);

const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Wall-clock time + IANA zone, so "event.ceremony.startAt" is unambiguous (§10). */
export const datetimeValueSchema = z.strictObject({
  local: z.string().superRefine((value, ctx) => {
    const m = LOCAL_DATETIME_PATTERN.exec(value);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Expected YYYY-MM-DDTHH:mm[:ss]" });
      return;
    }
    const [, y, mo, d, h, mi, s] = m;
    const valid =
      isRealCalendarDate(Number(y), Number(mo), Number(d)) &&
      Number(h) <= 23 &&
      Number(mi) <= 59 &&
      (s === undefined || Number(s) <= 59);
    if (!valid) ctx.addIssue({ code: "custom", message: "Not a real calendar date/time" });
  }),
  timeZone: timeZoneSchema,
});
export type DatetimeValue = z.infer<typeof datetimeValueSchema>;

export const dateValueSchema = z.iso.date();

export const imageValueSchema = z.strictObject({ assetId: z.uuid() });

export const collectionFieldTypeSchema = z.enum(["text", "number", "url", "boolean"]);

const collectionFieldSchema = z.strictObject({
  key: shortKeySchema,
  label: z.string().min(1).max(80),
  type: collectionFieldTypeSchema,
  required: z.boolean().default(false),
});
export type CollectionField = z.infer<typeof collectionFieldSchema>;

// ---------------------------------------------------------- definition schema

const base = {
  key: variableKeySchema,
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  required: z.boolean().default(false),
};

const textVariable = z.strictObject({
  ...base,
  type: z.literal("text"),
  default: z.string().max(MAX_TEXT_LENGTH).optional(),
  maxLength: z.int().min(1).max(MAX_TEXT_LENGTH).optional(),
});

const richTextVariable = z.strictObject({
  ...base,
  type: z.literal("richText"),
  default: richTextValueSchema.optional(),
});

const numberVariable = z.strictObject({
  ...base,
  type: z.literal("number"),
  default: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  integer: z.boolean().default(false),
});

const dateVariable = z.strictObject({
  ...base,
  type: z.literal("date"),
  default: dateValueSchema.optional(),
});

const datetimeVariable = z.strictObject({
  ...base,
  type: z.literal("datetime"),
  default: datetimeValueSchema.optional(),
});

const imageVariable = z.strictObject({
  ...base,
  type: z.literal("image"),
  default: imageValueSchema.optional(),
});

const urlVariable = z.strictObject({
  ...base,
  type: z.literal("url"),
  default: safeUrlSchema().optional(),
});

const colorVariable = z.strictObject({
  ...base,
  type: z.literal("color"),
  default: hexColorSchema.optional(),
});

const booleanVariable = z.strictObject({
  ...base,
  type: z.literal("boolean"),
  default: z.boolean().optional(),
});

const coordinateVariable = z.strictObject({
  ...base,
  type: z.literal("coordinate"),
  default: coordinateSchema.optional(),
});

const selectVariable = z.strictObject({
  ...base,
  type: z.literal("select"),
  options: z
    .array(z.strictObject({ value: z.string().min(1).max(100), label: z.string().min(1).max(120) }))
    .min(1)
    .max(50),
  default: z.string().max(100).optional(),
});

const collectionVariable = z.strictObject({
  ...base,
  type: z.literal("collection"),
  fields: z.array(collectionFieldSchema).min(1).max(10),
  maxItems: z.int().min(1).max(MAX_COLLECTION_ITEMS).default(MAX_COLLECTION_ITEMS),
  default: z
    .array(z.record(shortKeySchema, z.union([z.string(), z.number(), z.boolean()])))
    .optional(),
});

const guestContextVariable = z.strictObject({
  ...base,
  type: z.literal("guest-context"),
});

const variableUnion = z.discriminatedUnion("type", [
  textVariable,
  richTextVariable,
  numberVariable,
  dateVariable,
  datetimeVariable,
  imageVariable,
  urlVariable,
  colorVariable,
  booleanVariable,
  coordinateVariable,
  selectVariable,
  collectionVariable,
  guestContextVariable,
]);

export type VariableDefinitionInput = z.input<typeof variableUnion>;

export const variableDefinitionSchema = variableUnion.superRefine((def, ctx) => {
  const reserved = def.key.startsWith(GUEST_CONTEXT_PREFIX);
  if (def.type === "guest-context" && !reserved) {
    ctx.addIssue({
      code: "custom",
      path: ["key"],
      message: `guest-context variables must use the "${GUEST_CONTEXT_PREFIX}" namespace`,
    });
  }
  if (def.type !== "guest-context" && reserved) {
    ctx.addIssue({
      code: "custom",
      path: ["key"],
      message: `The "${GUEST_CONTEXT_PREFIX}" namespace is reserved for guest-context variables`,
    });
  }

  if (
    def.type === "number" &&
    def.min !== undefined &&
    def.max !== undefined &&
    def.min > def.max
  ) {
    ctx.addIssue({ code: "custom", path: ["min"], message: "min must be <= max" });
  }

  if (def.type === "select") {
    const values = def.options.map((o) => o.value);
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Option values must be unique" });
    }
  }

  if (def.type === "collection") {
    const keys = def.fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: "custom", path: ["fields"], message: "Field keys must be unique" });
    }
  }

  // The default value must itself satisfy the variable's own constraints.
  if ("default" in def && def.default !== undefined) {
    const result = valueSchemaForVariable(def).safeParse(def.default);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          path: ["default", ...issue.path],
          message: `Invalid default: ${issue.message}`,
        });
      }
    }
  }
});

export type VariableDefinition = z.output<typeof variableDefinitionSchema>;

// ----------------------------------------------------------- value validation

/**
 * Builds the Zod schema that validates an invitation data value for a given
 * variable definition (used for defaults now; Data Mode forms in Fase 3/8).
 * Optionality (`required`) is enforced by the caller, not here.
 */
export function valueSchemaForVariable(def: VariableDefinition): z.ZodType {
  switch (def.type) {
    case "text": {
      let s = z.string();
      if (def.maxLength !== undefined) s = s.max(def.maxLength);
      return s.max(MAX_TEXT_LENGTH);
    }
    case "richText":
      return richTextValueSchema;
    case "number": {
      let s = def.integer ? z.int() : z.number();
      if (def.min !== undefined) s = s.min(def.min);
      if (def.max !== undefined) s = s.max(def.max);
      return s;
    }
    case "date":
      return dateValueSchema;
    case "datetime":
      return datetimeValueSchema;
    case "image":
      return imageValueSchema;
    case "url":
      return safeUrlSchema();
    case "color":
      return hexColorSchema;
    case "boolean":
      return z.boolean();
    case "coordinate":
      return coordinateSchema;
    case "select": {
      const allowed = new Set(def.options.map((o) => o.value));
      return z.string().refine((v) => allowed.has(v), "Value is not one of the options");
    }
    case "collection": {
      const shape: Record<string, z.ZodType> = {};
      for (const field of def.fields) {
        const type =
          field.type === "text"
            ? z.string().max(MAX_TEXT_LENGTH)
            : field.type === "number"
              ? z.number()
              : field.type === "url"
                ? safeUrlSchema()
                : z.boolean();
        shape[field.key] = field.required ? type : type.optional();
      }
      return z.array(z.strictObject(shape)).max(def.maxItems);
    }
    case "guest-context":
      return z.string().max(200);
  }
}

/** Returns declared type, or the runtime context type, or undefined if unknown. */
export function lookupVariableType(
  key: string,
  variables: readonly Pick<VariableDefinition, "key" | "type">[],
): VariableType | undefined {
  const declared = variables.find((v) => v.key === key);
  if (declared) return declared.type;
  return Object.hasOwn(RUNTIME_CONTEXT_VARIABLES, key) ? RUNTIME_CONTEXT_VARIABLES[key] : undefined;
}
