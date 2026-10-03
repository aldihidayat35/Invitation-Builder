/**
 * Fase 11 golden path (E2E): create template -> publish template -> create
 * invitation -> publish -> open the PUBLIC URL (no login) -> guest URL.
 * PRD refs: AC-01, AC-09, AC-11, AC-12 (5 viewports), P-04, Â§13.1 (noindex).
 * Draft isolation with real content (AC-10) is covered by
 * tests/integration/publishing.test.ts against a full document.
 */
import { expect, test, type Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

const VIEWPORTS = [320, 375, 390, 414, 430] as const;

async function publishedInvitation(page: Page) {
  const templateName = uniqueName("Golden");
  await login(page, "dev@example.test", "/dashboard/templates");
  await page.locator("#new-template-name").fill(templateName);
  await page.locator("#create-template-submit").click();
  await expect(page.getByTestId("template-title")).toHaveText(templateName);
  await page.locator("#publish-note").fill("golden path");
  await page.locator("#publish-button").click();
  await expect(page.getByRole("status").filter({ hasText: "Versi v1 dipublish." })).toBeVisible();

  await page.goto("/dashboard/invitations");
  const option = page
    .locator("#new-invitation-template option")
    .filter({ hasText: templateName })
    .first();
  await page.locator("#new-invitation-template").selectOption(await option.getAttribute("value"));
  await page.locator("#new-invitation-title").fill(uniqueName("Undangan Golden"));
  await page.locator("#create-invitation-submit").click();
  await expect(page).toHaveURL(/\/dashboard\/invitations\/[0-9a-f-]{36}$/, { timeout: 20_000 });

  await page.locator("#publish-submit").click();
  const link = page.getByTestId("public-url").getByRole("link");
  await expect(link).toBeVisible();
  const path = (await link.getAttribute("href")) ?? "";
  expect(path).toMatch(/^\/i\/[a-z0-9-]+$/);
  return path;
}

test.describe("golden path to the public invitation", () => {
  test("published invitation is reachable without login, DOM-only and noindex", async ({
    page,
    browser,
  }) => {
    const path = await publishedInvitation(page);

    const anonymous = await browser.newContext({ baseURL: page.url().split("/dashboard")[0]! });
    const visitor = await anonymous.newPage();
    const response = await visitor.goto(path);
    expect(response?.status()).toBe(200);
    await expect(visitor).toHaveURL(new RegExp(`${path}$`));
    await expect(visitor.getByTestId("public-invitation")).toBeAttached();
    await expect(visitor.locator("canvas")).toHaveCount(0);
    await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");

    for (const width of VIEWPORTS) {
      await visitor.setViewportSize({ width, height: 844 });
      await visitor.goto(path);
      const { scrollWidth, innerWidth } = await visitor.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(innerWidth);
    }
    await anonymous.close();
  });

  test("guest link opens the same page and unknown slugs are 404", async ({ page, browser }) => {
    const path = await publishedInvitation(page);
    await page.locator("#new-guest-name").fill("Tamu Golden");
    await page.locator("#add-guest-submit").click();
    const tokenLine = await page.getByTestId("guest-row").first().locator("code").innerText();
    const token = tokenLine.replace("token:", "").trim();
    expect(token.length).toBeGreaterThanOrEqual(16);

    const anonymous = await browser.newContext({ baseURL: page.url().split("/dashboard")[0]! });
    const visitor = await anonymous.newPage();
    expect((await visitor.goto(`${path}?to=${encodeURIComponent(token)}`))?.status()).toBe(200);
    expect((await visitor.goto(`${path}?to=not-a-real-token`))?.status()).toBe(200);
    expect((await visitor.goto("/i/this-slug-does-not-exist"))?.status()).toBe(404);
    await anonymous.close();
  });

  test("RSVP endpoint returns generic JSON errors with a request id", async ({ request }) => {
    const res = await request.post("/api/public/rsvp", {
      data: { slug: "nope", name: "Budi", response: "attending" },
    });
    expect(res.status()).toBe(404);
    expect(res.headers()["x-request-id"]).toBeTruthy();
    expect(await res.json()).toMatchObject({ error: "Undangan tidak tersedia." });
  });

  test("health endpoint reports ok without leaking details", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
