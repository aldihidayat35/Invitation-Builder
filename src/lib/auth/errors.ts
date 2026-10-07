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

/** Reseller quota depletion error when attempting to publish an invitation. */
export class InsufficientQuotaError extends Error {
  constructor(
    message = "Saldo kuota undangan agensi Anda tidak mencukupi (0 kredit). Silakan lakukan pengajuan Top-Up Transfer Manual melalui menu Kuota Agensi.",
  ) {
    super(message);
    this.name = "InsufficientQuotaError";
  }
}

