import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded from node_modules at runtime (native/WASM assets must not be bundled).
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
};

export default nextConfig;
