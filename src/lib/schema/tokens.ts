import { z } from "zod";
import { fontNameSchema, hexColorSchema, shortKeySchema } from "./primitives";

/**
 * Template design tokens (FR-SET-001): fonts, colors, spacing defaults.
 * Exposed to widgets/renderer as CSS variables (Fase 6/9).
 */
const MAX_TOKENS = 32;

function limited<T extends z.ZodType>(valueSchema: T) {
  return z
    .record(shortKeySchema, valueSchema)
    .refine((r) => Object.keys(r).length <= MAX_TOKENS, `At most ${MAX_TOKENS} tokens`);
}

export const themeTokensSchema = z.strictObject({
  colors: limited(hexColorSchema).default({}),
  fonts: limited(fontNameSchema).default({}),
  spacing: limited(z.number().min(0).max(1000)).default({}),
});
export type ThemeTokens = z.infer<typeof themeTokensSchema>;
