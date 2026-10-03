import "server-only";
import { checkDatabase } from "@/features/health/service";
import { logError, requestIdFrom } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for load balancers and production smoke tests.
 * Returns only a status flag (no versions, hosts or error details).
 */
export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdFrom(request);
  const headers = { "Cache-Control": "no-store", "X-Request-Id": requestId };
  try {
    await checkDatabase();
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    logError("health check failed", error, { requestId, route: "/api/health" });
    return Response.json({ status: "unavailable", requestId }, { status: 503, headers });
  }
}
