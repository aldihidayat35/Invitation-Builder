/**
 * Fase 4 acceptance (E2E): FR-EDT-001..009, AC-08.
 * Desktop viewport: the editor is a wide-screen tool (the global project is Pixel 7).
 */
import { expect, test, type Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

async function openNewEditor(page: Page) {
  await login(page, undefined, "/dashboard/templates");
  const name = uniqueName("Editor E2E");
  await page.locator("#new-template-name").fill(name);
  await page.locator("#create-template-submit").click();
  await expect(page.getByTestId("template-title")).toHaveText(name);
  await page.locator("#open-editor").click();
  await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("save-status")).toBeVisible();
  return name;
}

const sections = (page: Page) => page.locator("section[data-testid^='section-']");
const num = async (page: Page, id: string) => Number(await page.locator(`#${id}`).inputValue());

/** New templates may start with zero sections; elements need an active section. */
async function ensureSection(page: Page) {
  if ((await sections(page).count()) === 0) await page.getByTestId("add-section").click();
  await expect(sections(page).first()).toBeVisible();
}

async function setField(page: Page, id: string, value: number) {
  const input = page.locator(`#${id}`);
  await input.fill(String(value));
  await input.press("Enter");
}

test.describe("editor core (Fase 4)", () => {
  test("3 sections, manipulate elements, undo/redo, save and reload", async ({ page }) => {
    await openNewEditor(page);

    // --- sections: end with three
    const initial = await sections(page).count();
    // A fresh template may start with zero sections; the editor must cope.
    expect(initial).toBeGreaterThanOrEqual(0);
    while ((await sections(page).count()) < 3) {
      await page.getByTestId("add-section").click();
    }
    await expect(sections(page)).toHaveCount(3);

    // The newly added section is active; add a rectangle to it.
    await page.getByTestId("add-rectangle").click();
    await expect(page.getByTestId("element-inspector")).toBeVisible();

    // --- inspector edits (frame)
    await setField(page, "insp-x", 40);
    await setField(page, "insp-y", 60);
    await setField(page, "insp-w", 120);
    await setField(page, "insp-h", 80);
    expect(await num(page, "insp-x")).toBe(40);

    // --- pointer drag moves the element by the pointer delta (zoom 100%)
    const last = sections(page).last();
    const canvas = last.locator("[data-testid^='canvas-']");
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = (await canvas.boundingBox())!;
    const cx = box.x + 40 + 60;
    const cy = box.y + 60 + 40;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 20, cy + 10, { steps: 4 });
    await page.mouse.move(cx + 50, cy + 30, { steps: 4 });
    await page.mouse.up();
    // Snapping may nudge by a few px, so compare approximately. Poll: the inspector
    // re-renders after the drag commits, which can lag the pointer-up under load.
    await expect
      .poll(async () => Math.abs((await num(page, "insp-x")) - 90), { timeout: 5_000 })
      .toBeLessThanOrEqual(8);
    await expect
      .poll(async () => Math.abs((await num(page, "insp-y")) - 90), { timeout: 5_000 })
      .toBeLessThanOrEqual(8);

    // --- one drag = one undo step
    await page.getByTestId("undo").click();
    expect(await num(page, "insp-x")).toBe(40);
    expect(await num(page, "insp-y")).toBe(60);
    await page.getByTestId("redo").click();
    expect(Math.abs((await num(page, "insp-x")) - 90)).toBeLessThanOrEqual(8);

    // --- rotation + second element + z-order
    await setField(page, "insp-rotation", 30);
    await page.getByTestId("add-circle").click();
    await page.getByTestId("action-back").click();
    const layersBefore = await page.getByTestId("layer-list").locator("li").allInnerTexts();
    expect(layersBefore).toHaveLength(2);

    // --- keyboard: nudge 1px / 10px with Shift
    const x0 = await num(page, "insp-x");
    await page.locator("body").click({ position: { x: 5, y: 5 } }); // blur inputs, keep selection
    await page.getByTestId("layer-list").locator("li").first().getByRole("button").first().click();
    const x1 = await num(page, "insp-x");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    expect((await num(page, "insp-x")) - x1).toBe(11);
    void x0;

    // --- autosave -> reload keeps geometry and layer order
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", {
      timeout: 15_000,
    });
    await page.reload();
    await expect(sections(page)).toHaveCount(3);
    const lastSection = page.locator("section[data-testid^='section-']").last();
    await lastSection.getByRole("button").first().click(); // activate section -> shows its layers
    const layersAfter = await page.getByTestId("layer-list").locator("li").allInnerTexts();
    expect(layersAfter).toEqual(layersBefore);
  });

  test("lock and hide are respected; undo history survives many actions", async ({ page }) => {
    await openNewEditor(page);
    await ensureSection(page);
    await page.getByTestId("add-rectangle").click();
    await setField(page, "insp-x", 50);

    await page.getByTestId("action-lock").click();
    // Locked element cannot be nudged.
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    const layer = page.getByTestId("layer-list").locator("li").first();
    await layer.getByRole("button").first().click();
    await page.keyboard.press("ArrowRight");
    expect(await num(page, "insp-x")).toBe(50);

    await layer.getByRole("button", { name: /Buka kunci/ }).click();
    await layer.getByRole("button", { name: "Sembunyikan" }).click();
    await expect(layer).toHaveAttribute("data-hidden", "true");

    // 60 quick edits are all undoable (history >= 50).
    await layer.getByRole("button", { name: "Tampilkan" }).click();
    for (let i = 0; i < 60; i++) await page.getByTestId("add-circle").click();
    for (let i = 0; i < 60; i++) await page.getByTestId("undo").click();
    await expect(page.getByTestId("layer-list").locator("li")).toHaveCount(1);
  });

  test("zoom does not change saved values", async ({ page }) => {
    await openNewEditor(page);
    await ensureSection(page);
    await page.getByTestId("add-rectangle").click();
    await setField(page, "insp-x", 33);
    await page.getByTestId("zoom-in").click();
    await page.getByTestId("zoom-in").click();
    await expect(page.getByTestId("zoom-label")).not.toHaveText("100%");
    expect(await num(page, "insp-x")).toBe(33);
    await page.getByTestId("zoom-out").click();
    await page.getByTestId("zoom-out").click();
    await expect(page.getByTestId("zoom-label")).toHaveText("100%");
    expect(await num(page, "insp-x")).toBe(33);
  });
});

test.describe("editor panels", () => {
  test("side panels can be resized by drag/keyboard and the width persists", async ({ page }) => {
    await openNewEditor(page);
    const left = page.getByTestId("resizer-left");
    const right = page.getByTestId("resizer-right");
    const start = Number(await left.getAttribute("aria-valuenow"));

    const box = (await left.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 200, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await left.getAttribute("aria-valuenow")))
      .toBeGreaterThan(start + 60);
    const aside = page.getByRole("complementary", { name: "Panel kiri" });
    expect((await aside.boundingBox())!.width).toBeGreaterThan(start + 60);

    // Keyboard: ArrowLeft on the right splitter widens the inspector.
    const rightStart = Number(await right.getAttribute("aria-valuenow"));
    await right.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(right).toHaveAttribute("aria-valuenow", String(rightStart + 16));

    const widened = await left.getAttribute("aria-valuenow");
    await page.reload();
    await expect(page.getByTestId("resizer-left")).toHaveAttribute("aria-valuenow", widened!);

    // Double-click resets to the default width (the track is 0px wide; its hit area is a
    // pseudo-element, so click by coordinates).
    const handle = (await page.getByTestId("resizer-left").boundingBox())!;
    await page.mouse.dblclick(handle.x + 2, handle.y + 200);
    await expect(page.getByTestId("resizer-left")).toHaveAttribute("aria-valuenow", "272");
  });
});
