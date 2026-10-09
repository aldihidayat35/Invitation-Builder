/**
 * CanonicalDocumentV1 — the declarative design model stored in the database
 * and consumed identically by the editor and the public renderer.
 *
 * PRD refs: P-03, FR-TPL-002, §15.2, §15.3, Lampiran C, AC-14.
 */
import { z } from "zod";
import { colorValueSchema, opacitySchema } from "./primitives";
import { imageSourceSchema } from "./binding";
import { CANONICAL_BASE_WIDTH } from "./constants";
import { sectionSchema } from "./section";
import { themeTokensSchema } from "./tokens";
import { variableDefinitionSchema } from "./variable";

export const SCHEMA_VERSION_V1 = 1 as const;
export const MAX_SECTIONS = 100;
export const MAX_VARIABLES = 200;

export const documentBackgroundSchema = z.strictObject({
  color: colorValueSchema.optional(),
  image: imageSourceSchema.optional(),
  fit: z.enum(["cover", "contain", "repeat"]).default("cover"),
  overlayColor: z.string().optional(),
  overlayOpacity: opacitySchema.default(0),
});
export type DocumentBackground = z.infer<typeof documentBackgroundSchema>;

export const documentAudioPositionSchema = z.enum([
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
]);
export type DocumentAudioPosition = z.infer<typeof documentAudioPositionSchema>;

export const documentAudioSchema = z.strictObject({
  enabled: z.boolean().default(false),
  src: z.string().optional(),
  title: z.string().optional(),
  position: documentAudioPositionSchema.default("bottom-right"),
  loop: z.boolean().default(true),
  autoplayOnOpen: z.boolean().default(true),
});
export type DocumentAudio = z.infer<typeof documentAudioSchema>;

export const canonicalDocumentV1Schema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION_V1),
    design: z
      .strictObject({
        /** Canonical artboard width; v1 documents are always 390 px (P-07). */
        baseWidth: z.literal(CANONICAL_BASE_WIDTH).default(CANONICAL_BASE_WIDTH),
        tokens: themeTokensSchema.prefault({}),
        background: documentBackgroundSchema.optional(),
        audio: documentAudioSchema.optional(),
      })
      .prefault({}),
    variables: z.array(variableDefinitionSchema).max(MAX_VARIABLES).default([]),
    sections: z.array(sectionSchema).max(MAX_SECTIONS).default([]),
  })
  .superRefine((doc, ctx) => {
    // Section and element/widget ids share ONE namespace (Lampiran C).
    const seen = new Map<string, string>();
    const claim = (id: string, path: (string | number)[]) => {
      const first = seen.get(id);
      if (first !== undefined) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `Duplicate id "${id}" (first used at ${first})`,
          params: { reason: "duplicate_id", id },
        });
      } else {
        seen.set(id, path.slice(0, -1).join("."));
      }
    };

    doc.sections.forEach((section, si) => {
      claim(section.id, ["sections", si, "id"]);
      section.elements.forEach((element, ei) => {
        claim(element.id, ["sections", si, "elements", ei, "id"]);
      });
    });

    const keys = new Set<string>();
    doc.variables.forEach((variable, vi) => {
      if (keys.has(variable.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["variables", vi, "key"],
          message: `Duplicate variable key "${variable.key}"`,
          params: { reason: "duplicate_variable_key", key: variable.key },
        });
      }
      keys.add(variable.key);
    });
  });

export type CanonicalDocumentV1 = z.output<typeof canonicalDocumentV1Schema>;
export type CanonicalDocumentV1Input = z.input<typeof canonicalDocumentV1Schema>;

/** Latest-version aliases. Always import these in application code. */
export const LATEST_SCHEMA_VERSION = SCHEMA_VERSION_V1;
export const canonicalDocumentSchema = canonicalDocumentV1Schema;
export type CanonicalDocument = CanonicalDocumentV1;

/** A new, empty draft document (no client data). */
export function createEmptyDocument(): CanonicalDocument {
  return canonicalDocumentSchema.parse({ schemaVersion: LATEST_SCHEMA_VERSION });
}

// ------------------------------------------------------------ issue reporting

export interface DocumentIssue {
  /** Dotted path, e.g. `sections.0.elements.2.frame.w`. */
  readonly path: string;
  readonly pointer: readonly (string | number)[];
  readonly message: string;
  readonly code: string;
  readonly sectionId?: string;
  readonly elementId?: string;
}

function getAt(value: unknown, key: string | number): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string | number, unknown>)[key];
}

function idOf(value: unknown): string | undefined {
  const id = getAt(value, "id");
  return typeof id === "string" ? id : undefined;
}

/**
 * Turns Zod issues into field-level descriptors that point at the offending
 * section/element (AC-14: "error menunjuk field/element yang bermasalah").
 */
export function describeIssues(input: unknown, error: z.ZodError): DocumentIssue[] {
  return error.issues.map((issue) => {
    const pointer = issue.path.filter((p): p is string | number => typeof p !== "symbol");
    let sectionId: string | undefined;
    let elementId: string | undefined;

    if (pointer[0] === "sections" && typeof pointer[1] === "number") {
      const section = getAt(getAt(input, "sections"), pointer[1]);
      sectionId = idOf(section);
      if (pointer[2] === "elements" && typeof pointer[3] === "number") {
        elementId = idOf(getAt(getAt(section, "elements"), pointer[3]));
      }
    }

    return {
      path: pointer.join("."),
      pointer,
      message: issue.message,
      code: issue.code,
      ...(sectionId !== undefined ? { sectionId } : {}),
      ...(elementId !== undefined ? { elementId } : {}),
    };
  });
}

export class DocumentValidationError extends Error {
  readonly issues: readonly DocumentIssue[];

  constructor(issues: readonly DocumentIssue[]) {
    super(`Document validation failed with ${issues.length} issue(s)`);
    this.name = "DocumentValidationError";
    this.issues = issues;
  }
}

/** Parse latest-version document or throw DocumentValidationError with field paths. */
export function parseDocumentOrThrow(input: unknown): CanonicalDocument {
  const result = canonicalDocumentSchema.safeParse(input);
  if (!result.success) throw new DocumentValidationError(describeIssues(input, result.error));
  return result.data;
}
