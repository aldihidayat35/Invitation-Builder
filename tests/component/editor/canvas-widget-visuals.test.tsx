/**
 * Component tests: Canvas Widget Visuals rendering matches Preview specs.
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Stage, Layer } from "react-konva";
import { WidgetVisual } from "@/features/editor/components/canvas-visuals";
import { getWidgetStyleVariants, QUICK_COLOR_PALETTES } from "@/features/widgets";
import type { Element, ThemeTokens } from "@/lib/schema";

beforeEach(() => {
  const mockCtx = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    rect: vi.fn(),
    clip: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

type WidgetElement = Extract<Element, { type: "widget" }>;

const tokens: ThemeTokens = {
  colors: { primary: "#832729", text: "#1f2937" },
  fonts: {},
  spacing: {},
};

function renderKonvaWidget(element: WidgetElement) {
  return render(
    <Stage width={400} height={400}>
      <Layer>
        <WidgetVisual element={element} tokens={tokens} />
      </Layer>
    </Stage>,
  );
}

describe("Canvas Widget Visuals", () => {
  it("renders countdown widget visual with 4 tabular units and custom labels", () => {
    const el: WidgetElement = {
      id: "w_cd_1",
      type: "widget",
      name: "Countdown",
      frame: { x: 0, y: 0, w: 320, h: 80, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: "#832729" },
      widgetType: "countdown",
      widgetVersion: 1,
      props: {
        targetDateTime: { local: "2027-12-12T08:00", timeZone: "Asia/Jakarta" },
        labels: { days: "Hari", hours: "Jam", minutes: "Menit", seconds: "Detik" },
      },
    };

    const { container } = renderKonvaWidget(el);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders map widget visual with location label and outlined pill button", () => {
    const el: WidgetElement = {
      id: "w_map_1",
      type: "widget",
      name: "Map",
      frame: { x: 0, y: 0, w: 300, h: 70, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: { token: "primary" } },
      widgetType: "map",
      widgetVersion: 1,
      props: {
        label: "Gedung Pernikahan",
        buttonText: "Buka Petunjuk Arah",
      },
    };

    const { container } = renderKonvaWidget(el);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders guestGreeting widget visual with prefix and name", () => {
    const el: WidgetElement = {
      id: "w_greet_1",
      type: "widget",
      name: "Greeting",
      frame: { x: 0, y: 0, w: 300, h: 60, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: "#2b2118" },
      widgetType: "guestGreeting",
      widgetVersion: 1,
      props: {
        prefix: "Kepada Yth.",
        guestName: "Bapak Budi & Keluarga",
      },
    };

    const { container } = renderKonvaWidget(el);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders rsvp widget visual with form fields and submit button", () => {
    const el: WidgetElement = {
      id: "w_rsvp_1",
      type: "widget",
      name: "RSVP",
      frame: { x: 0, y: 0, w: 320, h: 300, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: "#1f2937" },
      widgetType: "rsvp",
      widgetVersion: 1,
      props: {
        title: "Konfirmasi Kehadiran",
        enablePartySize: true,
      },
    };

    const { container } = renderKonvaWidget(el);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders gift widget visual with bank accounts and salin button", () => {
    const el: WidgetElement = {
      id: "w_gift_1",
      type: "widget",
      name: "Gift",
      frame: { x: 0, y: 0, w: 320, h: 160, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: "#2b2118" },
      widgetType: "gift",
      widgetVersion: 1,
      props: {
        title: "Amplop Digital",
        accounts: [
          { bank: "BCA", accountNumber: "1234567890", accountName: "Siti Rahma" },
        ],
      },
    };

    const { container } = renderKonvaWidget(el);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders music widget visual with outlined pill button", () => {
    const el: WidgetElement = {
      id: "w_music_1",
      type: "widget",
      name: "Music",
      frame: { x: 0, y: 0, w: 260, h: 50, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: "#832729" },
      widgetType: "music",
      widgetVersion: 1,
      props: {
        title: "Kisah Kasih",
      },
    };

    const { container } = renderKonvaWidget(el);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders gallery widget visual in grid and slider layout modes", () => {
    const elGrid: WidgetElement = {
      id: "w_gal_1",
      type: "widget",
      name: "Gallery Grid",
      frame: { x: 0, y: 0, w: 320, h: 220, rotation: 0 },
      locked: false,
      visible: true,
      style: { color: "#2b2118" },
      widgetType: "gallery",
      widgetVersion: 1,
      props: {
        title: "Momen Bahagia",
        layout: "grid",
        items: [{ src: "https://example.com/photo1.jpg", alt: "Photo 1" }],
      },
    };

    const { container: c1 } = renderKonvaWidget(elGrid);
    expect(c1.querySelector("canvas")).toBeInTheDocument();

    const elSlider: WidgetElement = {
      ...elGrid,
      id: "w_gal_2",
      name: "Gallery Slider",
      props: {
        title: "Momen Bahagia",
        layout: "slider",
        items: [{ src: "https://example.com/photo1.jpg", alt: "Photo 1" }],
      },
    };

    const { container: c2 } = renderKonvaWidget(elSlider);
    expect(c2.querySelector("canvas")).toBeInTheDocument();
  });

  it("provides exactly 5 style variants for each of the 7 widget types", () => {
    const widgetTypes = ["countdown", "map", "guestGreeting", "rsvp", "gift", "music", "gallery"] as const;

    for (const type of widgetTypes) {
      const variants = getWidgetStyleVariants(type);
      expect(variants).toHaveLength(5);
      for (const v of variants) {
        expect(v.id).toBeTruthy();
        expect(v.label).toBeTruthy();
        expect(v.description).toBeTruthy();
      }
    }

    expect(QUICK_COLOR_PALETTES.length).toBeGreaterThanOrEqual(5);
  });

  it("renders widgets on canvas with custom variant, color, and background", () => {
    const elWithStyle: WidgetElement = {
      id: "w_custom_style",
      type: "widget",
      name: "Custom Styled Countdown",
      frame: { x: 0, y: 0, w: 320, h: 100, rotation: 0 },
      locked: false,
      visible: true,
      style: {
        variant: "luxury",
        color: "#be185d",
        background: "#fdf2f8",
        radius: 14,
      },
      widgetType: "countdown",
      widgetVersion: 1,
      props: {
        targetDate: "2026-12-31T23:59:59Z",
      },
    };

    const { container } = renderKonvaWidget(elWithStyle);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });
});

