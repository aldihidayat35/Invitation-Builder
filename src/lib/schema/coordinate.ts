import { z } from "zod";

/**
 * Geographic coordinate (variable type `coordinate`, PRD §10 / FR-WDG-002).
 * Latitude -90..90, longitude -180..180; both finite.
 */
export const coordinateSchema = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Coordinate = z.infer<typeof coordinateSchema>;
