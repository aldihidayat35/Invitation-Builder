import { z } from "zod";

/**
 * Element frame in canonical 390 px artboard coordinates (PRD §9.2, P-07).
 *
 * Design constraints: x, y, w, h, rotation are finite numbers (Zod's
 * `z.number()` already rejects NaN/±Infinity), and w/h > 0. Rotation is
 * degrees in [-360, 360]; the editor normalizes before committing.
 */
const COORDINATE_LIMIT = 100_000;

const position = z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT);
const size = z.number().positive().max(COORDINATE_LIMIT);

export const frameSchema = z.strictObject({
  x: position,
  y: position,
  w: size,
  h: size,
  rotation: z.number().min(-360).max(360).default(0),
});

export type Frame = z.infer<typeof frameSchema>;
