import { reportError, type ErrorContext } from "@/lib/telemetry";

/**
 * Next.js instrumentation hook: forwards unhandled server errors (RSC, route
 * handlers, server actions) to the telemetry integration point with a
 * correlation context. No vendor SDK is bundled; register one via
 * `setTelemetrySink` here once chosen (docs/operations/observability.md).
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routePath?: string; routeType?: string },
): Promise<void> {
  const ctx: ErrorContext = {
    route: context.routePath ?? request.path ?? "unknown",
    method: request.method ?? "unknown",
    routeType: context.routeType ?? "unknown",
  };
  reportError(error, ctx);
  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      message: "unhandled request error",
      route: ctx.route,
      method: ctx.method,
      routeType: ctx.routeType,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    }),
  );
}
