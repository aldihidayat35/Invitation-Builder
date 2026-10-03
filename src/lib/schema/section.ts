import { z } from "zod";
import { imageSourceSchema } from "./binding";
import { DEFAULT_SECTION_HEIGHT } from "./constants";
import { elementSchema } from "./element";
import { colorValueSchema, idSchema } from "./primitives";

/**
 * Section: vertical unit of the scroll document (PRD §9.3, FR-EDT-009).
 * Elements use absolute coordinates relative to the section.
 */
export const MAX_ELEMENTS_PER_SECTION = 500;

export const sectionBackgroundSchema = z.strictObject({
  color: colorValueSchema.optional(),
  image: imageSourceSchema.optional(),
  fit: z.enum(["cover", "contain"]).default("cover"),
});

export const sectionSchema = z.strictObject({
  id: idSchema,
  name: z.string().max(120).optional(),
  baseHeight: z.number().min(100).max(10_000).default(DEFAULT_SECTION_HEIGHT),
  background: sectionBackgroundSchema.prefault({}),
  /** Default hidden; `visible` is for decorative edge objects (PRD §9.3). */
  overflow: z.enum(["hidden", "visible"]).default("hidden"),
  visible: z.boolean().default(true),
  elements: z.array(elementSchema).max(MAX_ELEMENTS_PER_SECTION).default([]),
});
export type Section = z.infer<typeof sectionSchema>;
