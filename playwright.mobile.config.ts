import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3101);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "mobile-compat.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chrome-android", use: { ...devices["Pixel 7"] } },
    {
      name: "samsung-internet-compatible",
      use: {
        ...devices["Galaxy S9+"],
        userAgent:
          "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36",
      },
    },
    { name: "safari-ios", use: { ...devices["iPhone 13"] } },
    { name: "safari-ipad", use: { ...devices["iPad Pro 11"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run e2e:prepare && npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: "pglite://./.data/e2e",
      AUTH_INSECURE_COOKIES: "1",
      ALLOW_PGLITE_IN_PRODUCTION: "1",
      STORAGE_LOCAL_DIR: "./.data/e2e-uploads",
    },
  },
});
