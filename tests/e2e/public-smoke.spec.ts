/**
 * PRD refs: P-04 / AC-11 (DOM, not canvas), AC-12 groundwork (no horizontal
 * overflow at target viewports), §13.1 (noindex by default).
 */
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const VIEWPORTS = [320, 375, 390, 414, 430] as const;

test.describe("public renderer smoke route", () => {
  test("is DOM HTML with selectable text and no canvas", async ({ page }) => {
    await page.goto("/smoke/renderer");

    const heading = page.getByRole("heading", { level: 1, name: "HTML Renderer OK" });
    await expect(heading).toBeVisible();
    await expect(page.locator('[data-renderer="html"]')).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(0);

    // Text is real DOM text (selectable), not bitmap.
    const selected = await heading.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return sel?.toString() ?? "";
    });
    expect(selected).toBe("HTML Renderer OK");
  });

  test("is noindex by default", async ({ page }) => {
    await page.goto("/smoke/renderer");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  for (const width of VIEWPORTS) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/smoke/renderer");
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
});

test.describe("dashboard entry (protected since Fase 2)", () => {
  test("root redirects to login, then to the dashboard, which links to the smoke route", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await login(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ringkasan");
    await page.locator("#open-renderer-smoke").click();
    await expect(page).toHaveURL(/\/smoke\/renderer$/);
  });

  test("the public smoke route needs no login", async ({ page }) => {
    await page.goto("/smoke/renderer");
    await expect(page).toHaveURL(/\/smoke\/renderer$/);
  });
});
