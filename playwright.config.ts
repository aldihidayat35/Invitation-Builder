import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const isCI = Boolean(process.env.CI);
const server = isCI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // Resets + seeds an embedded Postgres (PGlite) with the real migrations, then starts the app.
    // CI runs against the production build (`npm run build` happens first).
    command: `npm run e2e:prepare && ${server}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      DATABASE_URL: "pglite://./.data/e2e",
      // Plain-http localhost has no TLS; real production keeps Secure cookies.
      AUTH_INSECURE_COOKIES: "1",
      ALLOW_PGLITE_IN_PRODUCTION: "1",
      STORAGE_LOCAL_DIR: "./.data/e2e-uploads",
    },
  },
});
