import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { imageStyleSchema, type ImageFade } from "@/lib/schema";
import { buildCssImageMask, PublicImage } from "@/features/renderer/components/PublicImage";
import { Inspector } from "@/features/editor/components/Inspector";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";

describe("Image Fade / Blend Schema & Logic", () => {
  it("validates default and custom fade schema correctly", () => {
    const defaultParsed = imageStyleSchema.parse({});
    expect(defaultParsed.fade).toBeUndefined();

    const withLinear = imageStyleSchema.parse({
      fade: {
        mode: "linear",
        top: 20,
        bottom: 40,
        left: 0,
        right: 15,
        radial: 0,
      },
    });
    expect(withLinear.fade?.mode).toBe("linear");
    expect(withLinear.fade?.top).toBe(20);
    expect(withLinear.fade?.bottom).toBe(40);
    expect(withLinear.fade?.right).toBe(15);

    const withRadial = imageStyleSchema.parse({
      fade: {
        mode: "radial",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        radial: 50,
      },
    });
    expect(withRadial.fade?.mode).toBe("radial");
    expect(withRadial.fade?.radial).toBe(50);
  });

  it("builds correct CSS mask properties for radial vignette", () => {
    const empty = buildCssImageMask(undefined);
    expect(empty).toEqual({});

    const zeroRadial = buildCssImageMask({
      mode: "radial",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      radial: 0,
    });
    expect(zeroRadial).toEqual({});

    const radialFade: ImageFade = {
      mode: "radial",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      radial: 50,
    };
    const style = buildCssImageMask(radialFade);
    expect(style.maskImage).toBeDefined();
    expect(style.maskImage).toContain("radial-gradient(ellipse at center");
    expect(style.WebkitMaskImage).toEqual(style.maskImage);
  });

  it("builds correct CSS mask properties for directional linear fades", () => {
    const bottomFade: ImageFade = {
      mode: "linear",
      top: 0,
      bottom: 40,
      left: 0,
      right: 0,
      radial: 0,
    };
    const bStyle = buildCssImageMask(bottomFade);
    expect(bStyle.maskImage).toContain("linear-gradient(to bottom");
    expect(bStyle.maskImage).not.toContain("linear-gradient(to right");

    const allSidesFade: ImageFade = {
      mode: "linear",
      top: 25,
      bottom: 25,
      left: 20,
      right: 20,
      radial: 0,
    };
    const allStyle = buildCssImageMask(allSidesFade) as Record<string, unknown>;
    expect(allStyle.maskImage).toContain("linear-gradient(to bottom");
    expect(allStyle.maskImage).toContain("linear-gradient(to right");
    expect(allStyle.maskComposite).toBe("intersect");
    expect(allStyle.WebkitMaskComposite).toBe("destination-in");
  });

  it("renders PublicImage with mask styles applied", () => {
    const fade: ImageFade = {
      mode: "linear",
      top: 0,
      bottom: 50,
      left: 0,
      right: 0,
      radial: 0,
    };
    const { container } = render(
      <PublicImage
        assetId="a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5"
        alt="Foto fade"
        width={300}
        height={200}
        fade={fade}
      />,
    );
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    const mask = img?.style.maskImage || img?.style.webkitMaskImage || "";
    expect(mask).toContain("linear-gradient");
  });
});

describe("Image Fade UI in Inspector", () => {
  function setupEditorWithImage(initialFade?: ImageFade) {
    const imageElement: Element = {
      id: "el_img_fade",
      type: "image",
      frame: { x: 0, y: 0, w: 300, h: 200, rotation: 0 },
      visible: true,
      locked: false,
      source: { assetId: "a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5" },
      style: {
        fit: "cover",
        focal: { x: 0.5, y: 0.5 },
        radius: 0,
        opacity: 1,
        flipH: false,
        flipV: false,
        fade: initialFade,
      },
      alt: "Foto mempelai",
    };

    const doc: CanonicalDocument = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: { colors: {}, fonts: {}, spacing: {} },
      },
      variables: [],
      sections: [
        {
          id: "sec_1",
          name: "Section Utama",
          baseHeight: 844,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [imageElement],
        },
      ],
    };

    const store = createEditorStore({
      document: canonicalDocumentSchema.parse(doc),
      revision: 1,
    });

    store.getState().selectElements(["el_img_fade"]);
    return { store };
  }

  it("renders Blend Transparan control with mode tabs and quick presets", () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    expect(screen.getByTestId("image-fade-control")).toBeInTheDocument();
    expect(screen.getByTestId("fade-mode-linear")).toBeInTheDocument();
    expect(screen.getByTestId("fade-mode-radial")).toBeInTheDocument();
    expect(screen.getByTestId("fade-preset-bottom-40")).toBeInTheDocument();
  });

  it("applies preset on click and updates store document state", () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const presetBottomBtn = screen.getByTestId("fade-preset-bottom-40");
    fireEvent.click(presetBottomBtn);

    const el = store.getState().history.present.sections[0].elements[0];
    if (el.type !== "image") throw new Error("Expected image element");

    expect(el.style.fade).toBeDefined();
    expect(el.style.fade?.mode).toBe("linear");
    expect(el.style.fade?.bottom).toBe(40);
    expect(el.style.fade?.top).toBe(0);
  });

  it("switches to radial vignette mode and updates radial slider", () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const radialTab = screen.getByTestId("fade-mode-radial");
    fireEvent.click(radialTab);

    const presetRadial50 = screen.getByTestId("fade-preset-radial-50");
    fireEvent.click(presetRadial50);

    const el = store.getState().history.present.sections[0].elements[0];
    if (el.type !== "image") throw new Error("Expected image element");

    expect(el.style.fade?.mode).toBe("radial");
    expect(el.style.fade?.radial).toBe(50);
  });

  it("resets fade when reset button is clicked", () => {
    const { store } = setupEditorWithImage({
      mode: "linear",
      top: 0,
      bottom: 40,
      left: 0,
      right: 0,
      radial: 0,
    });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const resetBtn = screen.getByTestId("fade-reset-btn");
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);

    const el = store.getState().history.present.sections[0].elements[0];
    if (el.type !== "image") throw new Error("Expected image element");

    expect(el.style.fade).toBeUndefined();
  });
});
