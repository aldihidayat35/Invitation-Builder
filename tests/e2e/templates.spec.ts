/**
 * Fase 2 acceptance (E2E): FR-AUTH-001, FR-TPL-001..003, cross-workspace denial.
 * Runs against a real server + embedded Postgres seeded by scripts/e2e-prepare.ts.
 */
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, login, uniqueName } from "./helpers";

/** Read lazily: written by scripts/e2e-prepare.ts when the web server starts. */
function loadFixtures() {
  return JSON.parse(readFileSync(".data/e2e-fixtures.json", "utf8")) as {
    foreignTemplateId: string;
    devTemplateId: string;
  };
}

const card = (page: Page, name: string) =>
  page.getByTestId("template-card").filter({ hasText: name });

async function createTemplate(page: Page, name: string) {
  await page.goto("/dashboard/templates");
  await page.locator("#new-template-name").fill(name);
  await page.locator("#create-template-submit").click();
  await expect(page.getByTestId("template-title")).toHaveText(name);
}

test.describe("authentication (FR-AUTH-001)", () => {
  test("protected routes redirect to login and return after sign-in", async ({ page }) => {
    await page.goto("/dashboard/templates");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Ftemplates$/);
    await page.locator("#login-email").fill("dev@example.test");
    await page.locator("#login-password").fill(E2E_PASSWORD);
    await page.locator("#login-submit").click();
    await expect(page).toHaveURL(/\/dashboard\/templates$/);
    await expect(page.locator("#current-user")).toContainText("Dev User");
    await expect(page.locator("#active-workspace")).toContainText("Dev Workspace");
  });

  test("rejects wrong credentials with a generic message", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("nobody@example.test");
    await page.locator("#login-password").fill("definitely-wrong");
    await page.locator("#login-submit").click();
    await expect(page.locator("#login-error")).toHaveText("Email atau password salah.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ignores an external `next` target (no open redirect)", async ({ page }) => {
    await login(page, "dev@example.test", "/dashboard");
    await page.goto("/login?next=https%3A%2F%2Fevil.example");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("session cookie is HttpOnly and logout revokes it server-side", async ({
    page,
    context,
  }) => {
    await login(page);
    const cookie = (await context.cookies()).find((c) => c.name === "session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    const stolen = `session=${cookie?.value}`;

    const before = await page.request.post(
      `/api/templates/${loadFixtures().devTemplateId}/validate`,
      { data: {} },
    );
    expect(before.status()).toBe(200);

    await page.locator("#logout-button").click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=/);

    // Replaying the old cookie must fail: the session no longer exists in the DB.
    const replay = await page.request.post(
      `/api/templates/${loadFixtures().devTemplateId}/validate`,
      {
        data: {},
        headers: { cookie: stolen },
      },
    );
    expect(replay.status()).toBe(401);
  });
});

test.describe("template library (FR-TPL-001)", () => {
  test("shows the seeded empty template with the Draft indicator", async ({ page }) => {
    await login(page, "dev@example.test", "/dashboard/templates");
    const seeded = card(page, "Empty Template");
    await expect(seeded).toBeVisible();
    await expect(seeded.getByTestId("status-badge")).toContainText(/Draft|Published/);
  });

  test("create -> open -> rename -> duplicate -> archive (with confirmation)", async ({ page }) => {
    await login(page, "dev@example.test", "/dashboard/templates");
    const name = uniqueName("Rose");
    await createTemplate(page, name);
    await expect(page.getByTestId("status-badge")).toContainText("Draft");

    // Back to the library: the new template is listed.
    await page.goto("/dashboard/templates");
    await expect(card(page, name)).toBeVisible();

    // Rename
    const renamed = `${name} renamed`;
    await card(page, name).getByTestId("rename-button").click();
    await card(page, name).locator("input[name=name]").fill(renamed);
    await card(page, name).getByRole("button", { name: "Simpan" }).click();
    await expect(card(page, renamed)).toBeVisible();

    // Duplicate
    await card(page, renamed).getByTestId("duplicate-button").click();
    await expect(card(page, `${renamed} (salinan)`)).toBeVisible();

    // Archive: cancel keeps it, confirm removes it from the active list.
    await card(page, renamed).first().getByTestId("archive-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Arsipkan template?");
    await dialog.getByRole("button", { name: "Batal" }).click();
    await expect(dialog).toBeHidden();
    await expect(card(page, renamed).first()).toBeVisible();

    await card(page, `${renamed} (salinan)`).getByTestId("archive-button").click();
    await page.getByRole("dialog").getByTestId("confirm-action").click();
    await expect(card(page, `${renamed} (salinan)`)).toHaveCount(0);

    await page.getByRole("link", { name: "Diarsipkan" }).click();
    await expect(card(page, `${renamed} (salinan)`)).toBeVisible();
    await expect(card(page, `${renamed} (salinan)`).getByTestId("status-badge")).toContainText(
      "Diarsipkan",
    );
  });

  test("rejects an empty name with an inline error", async ({ page }) => {
    await login(page, "dev@example.test", "/dashboard/templates");
    await page.locator("#new-template-name").fill("   ");
    await page.locator("#create-template-submit").click();
    // Native `required` blocks fully-empty input; whitespace passes the browser and hits the server.
    await expect(page.locator("#create-error")).toContainText("Nama template wajib diisi.");
  });
});

test.describe("validate + publish (FR-TPL-002, FR-TPL-003, P-06)", () => {
  test("validate, publish v1, keep history, no-op republish is blocked", async ({ page }) => {
    await login(page, "dev@example.test", "/dashboard/templates");
    const name = uniqueName("Publish");
    await createTemplate(page, name);

    await page.locator("#validate-button").click();
    await expect(page.getByTestId("validation-result")).toContainText("Draft valid");

    await page.locator("#publish-note").fill("rilis awal");
    await page.locator("#publish-button").click();
    await expect(page.getByRole("status").filter({ hasText: "Versi v1 dipublish." })).toBeVisible();
    await expect(page.getByTestId("status-badge").first()).toContainText("Published · v1");
    await expect(page.getByTestId("version-list")).toContainText("v1");
    await expect(page.getByTestId("version-list")).toContainText("rilis awal");
    // Nothing changed since publishing: the button is disabled.
    await expect(page.locator("#publish-button")).toBeDisabled();

    await page.goto("/dashboard/templates");
    await expect(card(page, name).getByTestId("status-badge")).toContainText("Published");
  });
});

test.describe("cross-workspace isolation (acceptance gate)", () => {
  test("a foreign template looks like it does not exist", async ({ page }) => {
    await login(page);
    await page.goto(`/dashboard/templates/${loadFixtures().foreignTemplateId}`);
    await expect(page.getByTestId("not-found-state")).toBeVisible();
    await expect(page.getByText("Foreign Secret Template")).toHaveCount(0);
  });

  test("the library never lists other workspaces' templates", async ({ page }) => {
    await login(page, "dev@example.test", "/dashboard/templates");
    await expect(page.getByText("Foreign Secret Template")).toHaveCount(0);
  });

  test("the validate API denies foreign and anonymous callers", async ({
    page,
    playwright,
    baseURL,
  }) => {
    await login(page);
    const foreign = await page.request.post(
      `/api/templates/${loadFixtures().foreignTemplateId}/validate`,
      { data: {} },
    );
    expect(foreign.status()).toBe(404);

    const anonymous = await playwright.request.newContext({ baseURL });
    const denied = await anonymous.post(`/api/templates/${loadFixtures().devTemplateId}/validate`, {
      data: {},
    });
    expect(denied.status()).toBe(401);
    await anonymous.dispose();
  });

  test("the validate API rejects cross-site origins and bad payloads", async ({ page }) => {
    await login(page);
    const url = `/api/templates/${loadFixtures().devTemplateId}/validate`;
    const crossSite = await page.request.post(url, {
      data: {},
      headers: { origin: "https://evil.example" },
    });
    expect(crossSite.status()).toBe(403);

    const badJson = await page.request.post(url, {
      data: "{not json",
      headers: { "content-type": "application/json" },
    });
    expect(badJson.status()).toBe(400);

    const invalidDoc = await page.request.post(url, {
      data: { document: { schemaVersion: 1, sections: "nope" } },
    });
    expect(invalidDoc.status()).toBe(200);
    const body = (await invalidDoc.json()) as { valid: boolean; schemaIssues: unknown[] };
    expect(body.valid).toBe(false);
    expect(body.schemaIssues.length).toBeGreaterThan(0);
  });
});
