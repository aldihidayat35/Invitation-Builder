/** Accepts only same-origin absolute paths for post-login redirects (blocks open redirects). */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;
  if (value.startsWith("/login")) return fallback;
  return value;
}
