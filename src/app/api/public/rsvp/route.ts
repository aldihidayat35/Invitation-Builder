import { handleRsvpRequest } from "@/features/rsvp/handler";

export const dynamic = "force-dynamic";

/** Public (no login) RSVP submission; validated, rate-limited, idempotent. */
export async function POST(request: Request): Promise<Response> {
  return handleRsvpRequest(request);
}
