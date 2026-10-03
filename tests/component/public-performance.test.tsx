/**
 * PRD refs: NFR-PERF-001 (public page cost), NFR-A11Y-001, AC-11.
 * Realistic public document: 30 images + 100 text elements with animation.
 * Guards the lazy-loading strategy and keeps resolve/render inside a budget.
 */
import { render } from "@testing-library/react";
import { DocumentRenderer } from "@/features/renderer";
import type { ResolvedDocument } from "@/lib/engine";

const ASSET = "11111111-1111-4111-8111-111111111111";

function stressDocument(images: number, texts: number): ResolvedDocument {
  const frame = { x: 10, y: 10, w: 100, h: 100, rotation: 0 };
  const imageEls = Array.from({ length: images }, (_, i) => ({
    id: `img_${i}`,
    type: "image",
    hidden: false,
    frame,
    alt: `Foto ${i + 1}`,
    image: { assetId: ASSET },
    style: { fit: "cover", opacity: 1, radius: 8 },
    animations: {
      enter: {
        presetId: "fadeIn",
        trigger: "onEnterViewport",
        durationMs: 400,
        delayMs: 0,
        easing: "power2.out",
        repeat: 0,
        yoyo: false,
        staggerUnit: "none",
        staggerAmountMs: 0,
        once: true,
      },
    },
  }));
  const textEls = Array.from({ length: texts }, (_, i) => ({
    id: `txt_${i}`,
    type: "text",
    hidden: false,
    frame,
    text: `Teks ${i}`,
    style: {
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: "left",
      color: "#000",
      opacity: 1,
    },
  }));
  return {
    schemaVersion: 1,
    baseWidth: 390,
    tokens: { colors: {}, fonts: {} },
    sections: [
      {
        id: "s1",
        name: "Satu",
        hidden: false,
        baseHeight: 800,
        overflow: "hidden",
        background: {},
        elements: [...imageEls, ...textEls],
      },
    ],
    issues: [],
    ok: true,
  } as unknown as ResolvedDocument;
}

describe("public page with 30 images + 100 texts", () => {
  it("lazy-loads every image except the single above-the-fold one", () => {
    const { container } = render(
      <DocumentRenderer document={stressDocument(30, 100)} runtimeMode="public" />,
    );
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs).toHaveLength(30);
    expect(imgs.filter((i) => i.getAttribute("loading") === "eager")).toHaveLength(1);
    expect(imgs.filter((i) => i.getAttribute("loading") === "lazy")).toHaveLength(29);
    imgs.forEach((img) => expect(img.getAttribute("decoding")).toBe("async"));
  });

  it("has an alt strategy for every image and no canvas", () => {
    const { container } = render(
      <DocumentRenderer document={stressDocument(30, 10)} runtimeMode="public" />,
    );
    container.querySelectorAll("img").forEach((img) => expect(img.hasAttribute("alt")).toBe(true));
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("Satu");
  });

  it("renders within a generous time budget (guards accidental O(n^2))", () => {
    const doc = stressDocument(30, 100);
    const start = performance.now();
    render(<DocumentRenderer document={doc} runtimeMode="public" />);
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
