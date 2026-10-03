/**
 * Fase 5 + 6 acceptance (E2E): upload -> place -> save/reload -> replace -> bind,
 * unsafe files rejected by the server, and P0 widgets in editor + inspector.
 */
import { expect, test, type Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

// Smallest valid files: a real 1x1 PNG and a real 1x1 GIF-free JPEG-less pair is unnecessary;
// two distinct PNGs are enough for "replace".
const PNG_A = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_B = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M/wn4EIwDiqEAAmpAL/qO8ZDwAAAABJRU5ErkJggg==",
  "base64",
);

async function openNewEditor(page: Page) {
  await login(page, undefined, "/dashboard/templates");
  const name = uniqueName("Asset E2E");
  await page.locator("#new-template-name").fill(name);
  await page.locator("#create-template-submit").click();
  await expect(page.getByTestId("template-title")).toHaveText(name);
  await page.locator("#open-editor").click();
  await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("save-status")).toBeVisible();
  const sections = page.locator("section[data-testid^='section-']");
  if ((await sections.count()) === 0) await page.getByTestId("add-section").click();
  await expect(sections.first()).toBeVisible();
}

const png = (name: string, buffer: Buffer) => ({ name, mimeType: "image/png", buffer });

test.describe("asset pipeline (Fase 5)", () => {
  test("upload, place, save/reload, replace and bind to a variable", async ({ page }) => {
    await openNewEditor(page);

    await page.locator("#asset-file").setInputFiles(png("foto-a.png", PNG_A));
    const item = page.getByTestId("asset-item").filter({ hasText: "foto-a.png" });
    await expect(item).toBeVisible();
    await item.click();

    await expect(page.getByTestId("image-inspector")).toBeVisible();
    await expect(page.getByTestId("image-preview")).toHaveAttribute(
      "src",
      /\/api\/assets\/.+\/file/,
    );
    const firstSrc = await page.getByTestId("image-preview").getAttribute("src");
    // The public delivery route serves the validated image.
    const res = await page.request.get(firstSrc!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");

    // Save and reload: the image element persists.
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", {
      timeout: 15_000,
    });
    await page.reload();
    await page
      .locator("section[data-testid^='section-']")
      .first()
      .getByRole("button")
      .first()
      .click();
    await page.getByTestId("layer-list").locator("li").first().getByRole("button").first().click();
    await expect(page.getByTestId("image-preview")).toHaveAttribute("src", firstSrc!);

    // Replace with a second upload.
    await page.getByTestId("image-replace").click();
    await page.locator("#pick-file").setInputFiles(png("foto-b.png", PNG_B));
    await page.getByTestId("pick-item").filter({ hasText: "foto-b.png" }).click();
    await expect(page.getByTestId("image-preview")).not.toHaveAttribute("src", firstSrc!);

    // Bind to a new image variable.
    await page.getByTestId("insp-image-bind-new").click();
    await page.locator("#insp-image-bind-newkey").fill("media.photo");
    await page.getByTestId("insp-image-bind-create").click();
    await expect(page.locator("#insp-image-bind")).toHaveValue("media.photo");
    await expect(page.getByText("Terhubung ke variabel: media.photo")).toBeVisible();
  });

  test("the server rejects a non-image disguised as a PNG", async ({ page }) => {
    await openNewEditor(page);
    await page.locator("#asset-file").setInputFiles({
      name: "evil.png",
      mimeType: "image/png",
      buffer: Buffer.from("<script>alert(1)</script>".padEnd(64, " ")),
    });
    await expect(page.getByTestId("asset-error")).toBeVisible();
    await expect(page.getByTestId("asset-item").filter({ hasText: "evil.png" })).toHaveCount(0);
  });

  test("disallowed types are rejected", async ({ page }) => {
    await openNewEditor(page);
    await page.locator("#asset-file").setInputFiles({
      name: "vector.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
    });
    await expect(page.getByTestId("asset-error")).toBeVisible();
  });
});

test.describe("P0 widgets (Fase 6)", () => {
  test("insert map, countdown and greeting; the inspector is schema-driven", async ({ page }) => {
    await openNewEditor(page);

    for (const type of ["map", "countdown", "guestGreeting"]) {
      await page.getByTestId(`add-widget-${type}`).click();
      await expect(page.getByTestId("widget-inspector")).toBeVisible();
    }
    await expect(page.getByTestId("layer-list").locator("li")).toHaveCount(3);

    // Select the map widget (first layer inserted is last in the list or first; pick by label).
    await page
      .getByTestId("layer-list")
      .locator("li")
      .filter({ hasText: /Peta lokasi/ })
      .first()
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByTestId("widget-prop-coordinate")).toBeVisible();

    // Binding is limited to compatible variables: create a coordinate variable inline and bind.
    await page.getByTestId("insp-widget-coordinate-bind-new").click();
    await page.locator("#insp-widget-coordinate-bind-newkey").fill("venue.coordinate");
    await page.getByTestId("insp-widget-coordinate-bind-create").click();
    await expect(page.locator("#insp-widget-coordinate-bind")).toHaveValue("venue.coordinate");

    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", {
      timeout: 15_000,
    });
    await page.reload();
    await page
      .locator("section[data-testid^='section-']")
      .first()
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByTestId("layer-list").locator("li")).toHaveCount(3);
  });
});
