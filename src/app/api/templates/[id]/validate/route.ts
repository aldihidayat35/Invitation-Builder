/**
 * POST /api/templates/:id/validate (FR-TPL-002, AC-14)
 * Body (optional JSON): { "document": <unsaved canonical document> }.
 * Without a document, the stored draft is validated. Runs the canonical Zod
 * schema AND semantic validation (bindings/widgets). Nothing is persisted.
 *
 * Responses: 200 {valid, schemaIssues, semanticIssues} | 400 | 401 | 403 | 404 | 413.
 */
import { NextResponse } from "next/server";
import { TemplateNotFoundError, validate } from "@/features/templates/api";
import { ForbiddenError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/server";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Cookie auth => defend against cross-site POST: Origin (when sent) must match this host. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/templates/[id]/validate">,
) {
  if (!isSameOrigin(request)) return json({ error: "Origin tidak diizinkan." }, 403);

  const user = await getCurrentUser();
  if (!user) return json({ error: "Belum login." }, 401);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "Payload terlalu besar." }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "Payload terlalu besar." }, 413);

  let document: unknown;
  if (text.trim() !== "") {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "Body bukan JSON yang valid." }, 400);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return json({ error: "Body harus berupa objek JSON." }, 400);
    }
    document = (body as Record<string, unknown>).document;
  }

  const { id } = await context.params;
  try {
    return json(await validate(id, document));
  } catch (error) {
    if (error instanceof TemplateNotFoundError)
      return json({ error: "Template tidak ditemukan." }, 404);
    if (error instanceof ForbiddenError) return json({ error: error.message }, 403);
    console.error("validate endpoint failed", error);
    return json({ error: "Terjadi kesalahan." }, 500);
  }
}
