/**
 * Error telemetry integration point. No vendor is hardcoded: wire Sentry,
 * OpenTelemetry, etc. at startup with `setTelemetrySink` (see
 * `src/instrumentation.ts` and docs/operations/observability.md).
 * `reportError` never throws and never blocks a request.
 */
export interface ErrorContext {
  readonly requestId?: string;
  readonly route?: string;
  readonly [key: string]: unknown;
}

export type TelemetrySink = (error: unknown, context: ErrorContext) => void;

let sink: TelemetrySink | null = null;

export function setTelemetrySink(next: TelemetrySink | null): void {
  sink = next;
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  if (!sink) return;
  try {
    sink(error, context);
  } catch {
    // Telemetry failures must never affect the app.
  }
}
