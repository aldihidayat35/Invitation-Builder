/**
 * In-memory login throttle (sliding window). Limits brute force per key
 * (email + client). KNOWN LIMITATION: state is per server process; a
 * multi-instance deployment needs a shared store (documented tech debt).
 */
export interface ThrottleOptions {
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly now?: () => number;
}

export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: ThrottleOptions = { maxFailures: 5, windowMs: 15 * 60_000 }) {
    this.maxFailures = options.maxFailures;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const kept = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
    if (kept.length === 0) this.failures.delete(key);
    else this.failures.set(key, kept);
    return kept;
  }

  /** Seconds until another attempt is allowed; 0 when allowed. */
  retryAfterSeconds(key: string): number {
    const kept = this.recent(key);
    if (kept.length < this.maxFailures) return 0;
    const oldest = kept[0] ?? this.now();
    return Math.max(1, Math.ceil((oldest + this.windowMs - this.now()) / 1000));
  }

  recordFailure(key: string): void {
    this.recent(key);
    this.failures.set(key, [...(this.failures.get(key) ?? []), this.now()]);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}
