import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// The playground is development-only (404 in production builds, which CI uses).
test.skip(Boolean(process.env.CI), "playground is dev-only");

test.describe("engine playground (Fase 3, P-02)", () => {
  test("one template resolves to two different models for two datasets", async ({ page }) => {
    await login(page, undefined, "/dashboard/playground");
    await expect(page.getByRole("heading", { level: 1, name: "Engine playground" })).toBeVisible();

    const a = page.getByTestId("compare-a");
    const b = page.getByTestId("compare-b");
    await expect(a).toContainText("Anin & Bagas");
    await expect(a).toContainText("GEDUNG KARTINI");
    await expect(b).toContainText("Mempelai Wanita & Mempelai Pria");
    await expect(b).toContainText("PANTAI LOSARI HALL");
    await expect(a).not.toContainText("PANTAI LOSARI HALL");
  });

  test("generated form drives the resolved output and reports invalid input", async ({ page }) => {
    await login(page, undefined, "/dashboard/playground?set=b");
    await expect(page.locator("#resolve-status")).toHaveText("Siap dirender");

    await page.locator('[id="var-venue.name"]').fill("Balai Test");
    await page.locator("#playground-apply").click();
    await expect(page.locator("#resolved-lines")).toContainText("BALAI TEST");

    // Clear a required field -> blocking issue is listed, layout still renders.
    await page.goto("/dashboard/playground?v.couple.bride.fullName=A");
    await expect(page.locator("#resolve-status")).toContainText("masalah");
    await expect(page.locator("#resolve-issues")).toContainText("missing_required");
  });
});
