/**
 * Password hashing with scrypt from node:crypto (no extra dependency).
 * Format: scrypt$N$r$p$<salt b64>$<hash b64>. Parameters live in the hash so
 * they can be raised later and old hashes still verify.
 * Defaults follow OWASP guidance (N=2^16, r=8, p=1).
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export interface ScryptParams {
  readonly N: number;
  readonly r: number;
  readonly p: number;
}

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { N: 65_536, r: 8, p: 1 };
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 256;
const KEY_LENGTH = 32;
const MAX_N = 1 << 20;

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  const options: ScryptOptions = {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: 256 * params.N * params.r,
  };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) throw new Error("Password is too long");
}

export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, params);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** Constant-time compare. Malformed stored hashes verify as false (never throw). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw = "", rRaw = "", pRaw = "", saltB64 = "", hashB64 = ""] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (
    ![N, r, p].every(Number.isInteger) ||
    N < 2 ||
    N > MAX_N ||
    r < 1 ||
    r > 32 ||
    p < 1 ||
    p > 16
  ) {
    return false;
  }
  if ((N & (N - 1)) !== 0) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, salt, { N, r, p });
  return timingSafeEqual(actual, expected);
}
