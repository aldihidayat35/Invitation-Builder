import { expect, type Page } from "@playwright/test";

export const DEV_EMAIL = "dev@example.test";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

export async function login(page: Page, email = DEV_EMAIL, next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(E2E_PASSWORD);
  await page.locator("#login-submit").click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[/?]/g, "\\$&")}$`));
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
