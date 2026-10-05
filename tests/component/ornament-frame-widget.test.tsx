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
  it("provides 7 distinct ornamental shape definitions matching the reference designs", () => {
    expect(ORNAMENT_SHAPES).toHaveLength(7);
    const ids = ORNAMENT_SHAPES.map((s) => s.id);
    expect(ids).toEqual([
      "arch-window",
      "notched-bracket",
      "baroque-crest",
      "wavy-cartouche",
      "royal-plaque",
      "scalloped-stamp",
      "pointed-cartouche",
    ]);

    for (const shape of ORNAMENT_SHAPES) {
      expect(shape.leftPath).toMatch(/^M 200/);
      expect(shape.rightPath).toMatch(/^M 200/);
      expect(shape.fullPath).toMatch(/Z$/);
      expect(shape.innerFullPath).toMatch(/Z$/);
    }
  });

  it("resolves ornament shapes safely with fallback", () => {
    expect(getOrnamentShape("baroque-crest").id).toBe("baroque-crest");
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

  it("renders each of the 7 variants with its testid and data-variant attribute", () => {
    for (const shape of ORNAMENT_SHAPES) {
      const { unmount } = render(
        <OrnamentFrameWidget
          shape={shape.id}
          title="The Wedding Of"
          subtitle="Rama & Alya"
        />,
      );

      const frame = screen.getByTestId(`ornament-frame-${shape.id}`);
      expect(frame).toBeInTheDocument();
      expect(frame).toHaveAttribute("data-widget", "ornamentFrame");
      expect(frame).toHaveAttribute("data-variant", shape.id);

      expect(screen.getByText("The Wedding Of")).toBeInTheDocument();
      expect(screen.getByText("Rama & Alya")).toBeInTheDocument();

      unmount();
    }
  });

  it("applies custom stroke and fill colors and stroke width", () => {
    const { container } = render(
      <OrnamentFrameWidget
        shape="baroque-crest"
        strokeColor="#d97706"
        fillColor="#fffbeb"
        strokeWidth={4}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const basePath = container.querySelector("path[fill='#fffbeb']");
    expect(basePath).toBeInTheDocument();

    const strokePaths = container.querySelectorAll("path[stroke='#d97706']");
    expect(strokePaths.length).toBeGreaterThan(0);
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
          title: "Walimatul 'Urs",
          animationMode: "loop",
          animationSpeed: "fast",
        }}
        style={{
          variant: "pointed-cartouche",
          color: "#b4833e",
          background: "transparent",
        }}
      />,
    );

    const widget = container.querySelector('[data-widget="ornamentFrame"]');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveAttribute("data-variant", "pointed-cartouche");
    expect(screen.getByText("Walimatul 'Urs")).toBeInTheDocument();
  });

  it("animates the inner outline without image or yellow dots", () => {
    const { container } = render(
      <OrnamentFrameWidget
        shape="arch-window"
        title="THE WEDDING OF"
        subtitle="Benny & Dinda"
        caption="Sabtu, 24 Oktober 2026"
        animationMode="scroll"
      />,
    );

    // No image tag or clipPath for photos
    expect(container.querySelector("image")).not.toBeInTheDocument();
    // No yellow glow circles
    expect(container.querySelector("circle")).not.toBeInTheDocument();

    // Outer border
    expect(container.querySelector(".outerBorder")).toBeInTheDocument();
    // Inner track
    expect(container.querySelector(".innerTrack")).toBeInTheDocument();

    // Moving animated strokes with pathLength 1000 for 100% completion to bottom
    const animatedStrokes = container.querySelectorAll(".animatedStroke");
    expect(animatedStrokes).toHaveLength(2);
    for (const stroke of animatedStrokes) {
      expect(stroke).toHaveAttribute("pathLength", "1000");
      expect(stroke).toHaveAttribute("stroke-dasharray", "1000");
    }

    expect(screen.getByText("THE WEDDING OF")).toBeInTheDocument();
    expect(screen.getByText("Benny & Dinda")).toBeInTheDocument();
    expect(screen.getByText("Sabtu, 24 Oktober 2026")).toBeInTheDocument();
  });
});
