/** Authentication / authorization errors. Messages are safe to show to end users. */
export class AuthenticationError extends Error {
  constructor(message = "Email atau password salah.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Terlalu banyak percobaan login. Coba lagi nanti.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** The actor is authenticated but lacks the role/capability, or is not a workspace member. */
export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki akses untuk aksi ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
