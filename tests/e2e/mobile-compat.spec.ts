import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, login } from "./helpers";

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      })),
    )
    .toEqual(
      expect.objectContaining({
        documentWidth: await page.evaluate(() => document.documentElement.clientWidth),
      }),
    );
}

async function openMobileMenu(page: Page) {
  const menu = page.getByRole("button", { name: "Buka navigasi menu" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Navigasi utama" })).toBeVisible();
    await page.getByRole("button", { name: "Tutup navigasi" }).click();
    await expect(page.getByRole("dialog", { name: "Navigasi utama" })).toBeHidden();
  }
}

test("public, login, dashboard and operational pages remain usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const path of ["/", "/login", "/seller/mitra-berkah"]) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  }

  await login(page, "dev@example.test", "/dashboard");
  await openMobileMenu(page);
  for (const path of [
    "/dashboard/templates",
    "/dashboard/invitations",
    "/dashboard/admin/orders",
    "/dashboard/admin/operations",
    "/dashboard/privacy",
  ]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  expect(errors).toEqual([]);
});

test("seller branding works without relying on hover or modern clipboard only", async ({
  page,
}) => {
  await page.goto("/login?next=%2Fdashboard%2Freseller%2Fbranding");
  await page.locator("#login-email").fill("reseller@example.test");
  await page.locator("#login-password").fill(E2E_PASSWORD);
  await page.locator("#login-submit").click();
  await expect(page).toHaveURL(/\/dashboard\/reseller\/branding$/);
  await expectNoHorizontalOverflow(page);
  const copy = page.getByRole("button", { name: "Salin Link" });
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(copy).toContainText(/Salin Link|Tersalin!/);
});

test("editor clearly blocks small screens and remains available on desktop", async ({ page }) => {
  await login(page, "dev@example.test", "/dashboard/templates");
  await page.getByTestId("open-template").first().click();
  await page.locator("#open-editor").click();
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await expect(page.getByRole("heading", { name: "Editor tersedia di desktop" })).toBeVisible();
    await expect(page.getByTestId("save-status")).toBeHidden();
  } else {
    await expect(page.getByTestId("save-status")).toBeVisible();
  }
});
