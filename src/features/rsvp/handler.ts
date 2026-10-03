import "server-only";
import { getDb } from "@/lib/db/client";
import { RSVP_MAX_BODY_BYTES } from "./schemas";
import { RsvpInvalidError, RsvpUnavailableError, submitRsvp } from "./service";
import { createRateLimiter } from "@/lib/rate-limit";
import { log, logError, requestIdFrom } from "@/lib/logger";

/** 10 submissions / minute / (client IP + invitation). */
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

function baseJson(
  status: number,
  body: Record<string, unknown>,
  headers: HeadersInit = {},
): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientKey(request: Request, slugHint: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded || request.headers.get("x-real-ip") || "unknown"}:${slugHint}`;
}

/**
 * Public RSVP endpoint logic (kept out of `route.ts` so tests can call it).
 * Errors are generic: no stack traces, SQL or ids ever reach the client.
 */
export async function handleRsvpRequest(
  request: Request,
  deps: { db?: Awaited<ReturnType<typeof getDb>>; limiter?: typeof limiter } = {},
): Promise<Response> {
  const requestId = requestIdFrom(request);
  const response = await handle(request, deps, requestId);
  response.headers.set("X-Request-Id", requestId);
  return response;
}

async function handle(
  request: Request,
  deps: { db?: Awaited<ReturnType<typeof getDb>>; limiter?: typeof limiter },
  requestId: string,
): Promise<Response> {
  // Error bodies carry the requestId so users can quote it to support.
  const json = (status: number, body: Record<string, unknown>, headers: HeadersInit = {}) =>
    baseJson(status, "error" in body ? { ...body, requestId } : body, headers);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "Format permintaan tidak didukung." });
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > RSVP_MAX_BODY_BYTES) return json(413, { error: "Permintaan terlalu besar." });

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json(400, { error: "Data tidak valid." });
  }
  if (new TextEncoder().encode(text).length > RSVP_MAX_BODY_BYTES) {
    return json(413, { error: "Permintaan terlalu besar." });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "Data tidak valid." });
  }
  const slugHint =
    typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string"
      ? body.slug.slice(0, 120)
      : "-";

  const gate = (deps.limiter ?? limiter).check(clientKey(request, slugHint));
  if (!gate.allowed) {
    log("warn", "rsvp rate limited", { requestId, route: "/api/public/rsvp" });
    return json(
      429,
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { "Retry-After": String(gate.retryAfterSeconds) },
    );
  }

  try {
    const result = await submitRsvp(deps.db ?? (await getDb()), body);
    return json(200, { ok: true, status: result.status });
  } catch (error) {
    if (error instanceof RsvpInvalidError) return json(400, { error: error.message });
    if (error instanceof RsvpUnavailableError) return json(404, { error: error.message });
    logError("rsvp submit failed", error, { requestId, route: "/api/public/rsvp" });
    return json(500, { error: "Terjadi kesalahan. Silakan coba lagi." });
  }
}
