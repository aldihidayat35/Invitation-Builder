import type { NextConfig } from "next";

/**
 * Baseline security headers for every response (PRD §19 / NFR-SEC). A strict
 * CSP is intentionally not set here: Next injects inline bootstrap scripts, so
 * a nonce-based CSP is tracked as a documented follow-up in docs/security-audit.md.
 */
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
] as const;

const nextConfig: NextConfig = {
  // Loaded from node_modules at runtime (native/WASM assets must not be bundled).
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
