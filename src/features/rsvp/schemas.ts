import { z } from "zod";

export const RSVP_MAX_BODY_BYTES = 8 * 1024;

/** Public RSVP payload (FR-WDG-005). Strict: unknown keys are rejected. */
export const rsvpInputSchema = z.strictObject({
  slug: z.string().min(1).max(120),
  guestToken: z.string().min(1).max(64).optional(),
  name: z.string().trim().min(1, "Nama wajib diisi.").max(120),
  response: z.enum(["attending", "not_attending"]),
  partySize: z.int().min(0).max(20).optional(),
  message: z.string().trim().max(1000).optional(),
});

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export interface RsvpResult {
  readonly status: "created" | "updated";
}

export interface RsvpSummary {
  readonly id: string;
  readonly guestName: string | null;
  readonly name: string;
  readonly response: "attending" | "not_attending";
  readonly partySize: number;
  readonly message: string | null;
  readonly createdAt: Date;
}

export interface RsvpTotals {
  readonly attending: number;
  readonly notAttending: number;
  /** Sum of party sizes of attending responses. */
  readonly attendingParty: number;
}

export function totalsOf(rows: readonly RsvpSummary[]): RsvpTotals {
  let attending = 0;
  let notAttending = 0;
  let attendingParty = 0;
  for (const row of rows) {
    if (row.response === "attending") {
      attending += 1;
      attendingParty += row.partySize;
    } else {
      notAttending += 1;
    }
  }
  return { attending, notAttending, attendingParty };
}
