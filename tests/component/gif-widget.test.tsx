import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  defaultWidgetRegistry,
  estimateWidgetContentHeight,
  getWidgetStyleVariants,
  WIDGET_STYLE_VARIANTS,
} from "@/features/widgets";
import {
  GifWidget,
  parseGifSource,
} from "@/features/widgets/runtime/GifWidget";
import { WidgetRuntime } from "@/features/widgets/runtime";
import type { WidgetElement } from "@/lib/schema";

describe("GIF Widget (FR-WDG-GIF: Animated Sticker, Presets, System Saving, 6 Style Variants)", () => {
  it("is registered in defaultWidgetRegistry with correct label and default frame", () => {
    const resolved = defaultWidgetRegistry.resolve("gif");
    expect(resolved.kind).toBe("known");
    if (resolved.kind === "known") {
      expect(resolved.definition.label).toBe("Animasi GIF");
      expect(resolved.definition.defaultFrame).toEqual({ w: 200, h: 200 });
      expect(resolved.definition.defaultProps).toMatchObject({
        fit: "contain",
        loop: true,
        alignment: "center",
      });
    }
  });

  it("provides 6 distinct curated design style variants", () => {
    const variants = getWidgetStyleVariants("gif");
    expect(variants.length).toBeGreaterThanOrEqual(6);

    const variantIds = variants.map((v) => v.id);
    expect(variantIds).toContain("clean");
    expect(variantIds).toContain("floating-badge");
    expect(variantIds).toContain("gold-border");
    expect(variantIds).toContain("neon-glow");
    expect(variantIds).toContain("vintage-frame");
    expect(variantIds).toContain("soft-pill");

    expect(WIDGET_STYLE_VARIANTS.gif).toBeDefined();
  });

  describe("parseGifSource", () => {
    it("handles direct https URLs", () => {
      const src = "https://media.giphy.com/media/26BRv0ThflsDTjDUs/giphy.gif";
      expect(parseGifSource(src, undefined)).toBe(src);
    });

    it("handles assetId UUIDs and formats asset file URL", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      expect(parseGifSource(undefined, id)).toBe(`/api/assets/${id}/file`);
    });

    it("prioritizes valid assetId over url", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const url = "https://example.com/test.gif";
      expect(parseGifSource(url, id)).toBe(`/api/assets/${id}/file`);
    });

    it("handles object structures with assetId or url", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      expect(parseGifSource({ assetId: id }, undefined)).toBe(`/api/assets/${id}/file`);
      expect(parseGifSource({ url: "https://example.com/obj.gif" }, undefined)).toBe("https://example.com/obj.gif");
      expect(parseGifSource({ src: "https://example.com/src.gif" }, undefined)).toBe("https://example.com/src.gif");
    });
  });

  describe("GifWidget Component Runtime", () => {
    it("renders default fallback image when url and assetId are omitted", () => {
      render(<GifWidget />);
      const img = screen.getByTestId("gif-widget-media") as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain("giphy.gif");
    });

    it("renders custom URL source", () => {
      render(<GifWidget url="https://example.com/wedding-rings.gif" />);
      const img = screen.getByTestId("gif-widget-media") as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBe("https://example.com/wedding-rings.gif");
    });

    it("renders caption when provided", () => {
      render(
        <GifWidget
          url="https://example.com/sticker.gif"
          caption="Selamat Menempuh Hidup Baru"
        />,
      );
      expect(screen.getByTestId("gif-widget-caption")).toHaveTextContent("Selamat Menempuh Hidup Baru");
    });

    it("does not render caption element when caption is empty or not provided", () => {
      render(<GifWidget url="https://example.com/sticker.gif" caption="" />);
      expect(screen.queryByTestId("gif-widget-caption")).not.toBeInTheDocument();
    });

    it("renders each of the 6 design variants without crashing", () => {
      const variants = [
        "clean",
        "floating-badge",
        "gold-border",
        "neon-glow",
        "vintage-frame",
        "soft-pill",
      ];

      for (const variant of variants) {
        const { unmount } = render(
          <GifWidget
            url="https://example.com/sticker.gif"
            style={{ variant }}
          />,
        );
        const root = screen.getByTestId("gif-widget-root");
        expect(root).toHaveAttribute("data-variant", variant);
        unmount();
      }
    });

    it("applies alignment and object-fit correctly", () => {
      render(
        <GifWidget
          url="https://example.com/sticker.gif"
          alignment="right"
          fit="cover"
        />,
      );
      const img = screen.getByTestId("gif-widget-media");
      expect(img.className).toContain("fitCover");
    });
  });

  describe("WidgetRuntime Integration", () => {
    it("renders gif widget through generic WidgetRuntime renderer", () => {
      render(
        <WidgetRuntime
          widgetType="gif"
          props={{
            url: "https://example.com/heart.gif",
            caption: "Love Forever",
          }}
          style={{ variant: "gold-border" }}
        />,
      );

      const img = screen.getByTestId("gif-widget-media") as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBe("https://example.com/heart.gif");
      expect(screen.getByText("Love Forever")).toBeInTheDocument();
    });
  });

  describe("estimateWidgetContentHeight", () => {
    it("estimates natural height according to frame and caption", () => {
      const elementNoCaption: WidgetElement = {
        id: "el-1",
        type: "widget",
        name: "Animasi GIF",
        visible: true,
        locked: false,
        frame: { x: 0, y: 0, w: 200, h: 200, rotation: 0 },
        widgetType: "gif",
        widgetVersion: 1,
        props: {},
        style: { variant: "clean" },
      };
      expect(estimateWidgetContentHeight(elementNoCaption)).toBe(200);

      const elementWithCaption: WidgetElement = {
        id: "el-2",
        type: "widget",
        name: "Animasi GIF",
        visible: true,
        locked: false,
        frame: { x: 0, y: 0, w: 200, h: 200, rotation: 0 },
        widgetType: "gif",
        widgetVersion: 1,
        props: { caption: "Keterangan Stiker" },
        style: { variant: "clean" },
      };
      expect(estimateWidgetContentHeight(elementWithCaption)).toBe(228);
    });
  });
});
