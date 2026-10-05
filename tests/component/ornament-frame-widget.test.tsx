import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ORNAMENT_SHAPES,
  getOrnamentShape,
} from "@/features/widgets/ornament-shapes";
import { OrnamentFrameWidget } from "@/features/widgets/runtime/OrnamentFrameWidget";
import { WidgetRuntime } from "@/features/widgets/runtime";
import { defaultWidgetRegistry } from "@/features/widgets";

describe("OrnamentFrameWidget (Interactive Shape Widget with Line Animation)", () => {
  it("provides 11 distinct ornamental and geometric shape definitions", () => {
    expect(ORNAMENT_SHAPES).toHaveLength(11);
    const ids = ORNAMENT_SHAPES.map((s) => s.id);
    expect(ids).toEqual([
      "arch-window",
      "circle",
      "oval",
      "rectangle",
      "rounded-rect",
      "notched-bracket",
      "baroque-crest",
      "wavy-cartouche",
      "royal-plaque",
      "scalloped-stamp",
      "pointed-cartouche",
    ]);

    for (const shape of ORNAMENT_SHAPES) {
      expect(shape.leftPath).toMatch(/^M/);
      expect(shape.rightPath).toMatch(/^M/);
      expect(shape.fullPath).toMatch(/Z$/);
      expect(shape.innerFullPath).toMatch(/Z$/);
    }
  });

  it("resolves ornament shapes safely with fallback", () => {
    expect(getOrnamentShape("baroque-crest").id).toBe("baroque-crest");
    expect(getOrnamentShape("circle").id).toBe("circle");
    expect(getOrnamentShape("rectangle").id).toBe("rectangle");
    expect(getOrnamentShape("unknown-shape").id).toBe("arch-window");
  });

  it("is registered in defaultWidgetRegistry", () => {
    const resolved = defaultWidgetRegistry.resolve("ornamentFrame");
    expect(resolved.kind).toBe("known");
    if (resolved.kind === "known") {
      expect(resolved.definition.label).toBe("Bingkai Ornamen");
      expect(resolved.definition.defaultFrame).toEqual({ w: 326, h: 360 });
    }
  });

  it("renders each of the 11 variants with its testid and data-variant attribute", () => {
    for (const shape of ORNAMENT_SHAPES) {
      const { unmount } = render(
        <OrnamentFrameWidget
          shape={shape.id}
        />,
      );

      const frame = screen.getByTestId(`ornament-frame-${shape.id}`);
      expect(frame).toBeInTheDocument();
      expect(frame).toHaveAttribute("data-widget", "ornamentFrame");
      expect(frame).toHaveAttribute("data-variant", shape.id);

      unmount();
    }
  });

  it("applies custom stroke, fill colors, and fill opacity", () => {
    const { container } = render(
      <OrnamentFrameWidget
        shape="baroque-crest"
        strokeColor="#d97706"
        fillColor="#fffbeb"
        fillOpacity={80}
        strokeWidth={4}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const basePath = container.querySelector("path[fill='#fffbeb']");
    expect(basePath).toBeInTheDocument();
    expect(basePath).toHaveAttribute("fill-opacity", "0.8");

    const strokePaths = container.querySelectorAll("path[stroke='#d97706']");
    expect(strokePaths.length).toBeGreaterThan(0);
  });

  it("supports dynamic innerGap between outer contour and inner outline", () => {
    const normalGap = getOrnamentShape("circle", 300, 300, 10);
    const wideGap = getOrnamentShape("circle", 300, 300, 25);

    // Inner paths should differ when innerGap changes
    expect(normalGap.innerFullPath).not.toEqual(wideGap.innerFullPath);
  });

  it("renders optional photo clipped inside shape with opacity", () => {
    const { container } = render(
      <OrnamentFrameWidget
        shape="oval"
        image="https://example.com/couple.jpg"
        imageOpacity={75}
      />,
    );

    const img = container.querySelector("image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("href", "https://example.com/couple.jpg");
    expect(img).toHaveAttribute("opacity", "0.75");
    expect(img?.getAttribute("clip-path")).toMatch(/^url\(#ornament-clip-/);
  });

  it("toggles double border correctly", () => {
    const { container, rerender } = render(
      <OrnamentFrameWidget shape="notched-bracket" doubleBorder={true} />,
    );

    expect(container.querySelector(".innerTrack")).toBeInTheDocument();

    rerender(<OrnamentFrameWidget shape="notched-bracket" doubleBorder={false} />);
    expect(container.querySelector(".innerTrack")).not.toBeInTheDocument();
  });

  it("renders correctly via WidgetRuntime dispatch", () => {
    const { container } = render(
      <WidgetRuntime
        widgetType="ornamentFrame"
        props={{
          shape: "pointed-cartouche",
          innerGap: 16,
          fillOpacity: 50,
          animationMode: "once",
          animationSpeed: "fast",
        }}
        style={{
          variant: "pointed-cartouche",
          color: "#b4833e",
          background: "#ffffff",
        }}
      />,
    );

    const widget = container.querySelector('[data-widget="ornamentFrame"]');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveAttribute("data-variant", "pointed-cartouche");

    const basePath = container.querySelector("path[fill='#ffffff']");
    expect(basePath).toHaveAttribute("fill-opacity", "0.5");
  });

  it("animates the inner outline with smooth moving strokes", () => {
    const { container } = render(
      <OrnamentFrameWidget
        shape="arch-window"
        animationMode="once"
      />,
    );

    // Outer border
    expect(container.querySelector(".outerBorder")).toBeInTheDocument();
    // Inner track
    expect(container.querySelector(".innerTrack")).toBeInTheDocument();

    // Moving animated strokes with dynamic path length and double-gap to prevent repetition
    const animatedStrokes = container.querySelectorAll(".animatedStroke");
    expect(animatedStrokes).toHaveLength(2);
    for (const stroke of animatedStrokes) {
      expect(stroke.getAttribute("stroke-dasharray")).toMatch(/^\d+ \d+$/);
    }
  });

  it("scales flexibly to taller widget heights without distortion", () => {
    const tallShape = getOrnamentShape("arch-window", 326, 600, 12);
    expect(tallShape.leftPath).toMatch(/^M 163/);
    expect(tallShape.leftPath).toContain("590");
  });
});
