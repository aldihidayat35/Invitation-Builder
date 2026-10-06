import { describe, expect, it } from "vitest";
import {
  SHADOW_PRESETS,
  createShadowFromPreset,
  detectShadowPreset,
  hexToRgba,
  cssTextShadow,
  cssDropShadowFilter,
  konvaShadowProps,
} from "@/lib/shadow";
import type { ElementShadow, ThemeTokens } from "@/lib/schema";

const tokens: Pick<ThemeTokens, "colors"> = {
  colors: {
    primary: "#e85d8f",
    dark: "#1e293b",
  },
};

describe("Shadow Utilities & Presets", () => {
  it("provides 6 Canva-inspired shadow presets", () => {
    expect(SHADOW_PRESETS).toHaveLength(6);
    expect(SHADOW_PRESETS.map((p) => p.id)).toEqual([
      "none",
      "soft",
      "drop",
      "lift",
      "glow",
      "hard",
    ]);
  });

  it("createShadowFromPreset returns correct preset parameters", () => {
    expect(createShadowFromPreset("none")).toBeUndefined();

    const soft = createShadowFromPreset("soft");
    expect(soft).toEqual({
      color: "#000000",
      blur: 12,
      offsetX: 0,
      offsetY: 4,
      opacity: 0.25,
    });

    const glow = createShadowFromPreset("glow", "#10b981");
    expect(glow).toEqual({
      color: "#10b981",
      blur: 16,
      offsetX: 0,
      offsetY: 0,
      opacity: 0.65,
    });

    const hard = createShadowFromPreset("hard");
    expect(hard).toEqual({
      color: "#000000",
      blur: 0,
      offsetX: 4,
      offsetY: 4,
      opacity: 0.85,
    });
  });

  it("detectShadowPreset correctly classifies shadow geometries", () => {
    expect(detectShadowPreset(undefined)).toBe("none");
    expect(detectShadowPreset({ color: "#000", blur: 0, offsetX: 3, offsetY: 3, opacity: 0.8 })).toBe("hard");
    expect(detectShadowPreset({ color: "#000", blur: 16, offsetX: 0, offsetY: 0, opacity: 0.6 })).toBe("glow");
    expect(detectShadowPreset({ color: "#000", blur: 22, offsetX: 0, offsetY: 12, opacity: 0.35 })).toBe("lift");
    expect(detectShadowPreset({ color: "#000", blur: 12, offsetX: 0, offsetY: 4, opacity: 0.25 })).toBe("soft");
    expect(detectShadowPreset({ color: "#000", blur: 8, offsetX: 3, offsetY: 4, opacity: 0.4 })).toBe("drop");
  });

  it("hexToRgba converts 3-char hex, 6-char hex, and handles opacity", () => {
    expect(hexToRgba("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    expect(hexToRgba("#000000", 0.4)).toBe("rgba(0, 0, 0, 0.4)");
    expect(hexToRgba("#e85d8f", 0.8)).toBe("rgba(232, 93, 143, 0.8)");
    expect(hexToRgba("rgba(10, 20, 30, 0.9)", 0.5)).toBe("rgba(10, 20, 30, 0.9)");
  });

  it("cssTextShadow produces valid CSS text-shadow values", () => {
    expect(cssTextShadow(undefined, tokens)).toBeUndefined();

    const shadow: ElementShadow = {
      color: { token: "primary" },
      blur: 8,
      offsetX: 2,
      offsetY: 4,
      opacity: 0.5,
    };
    expect(cssTextShadow(shadow, tokens)).toBe("2px 4px 8px rgba(232, 93, 143, 0.5)");
  });

  it("cssDropShadowFilter produces valid CSS drop-shadow filter values", () => {
    expect(cssDropShadowFilter(undefined, tokens)).toBeUndefined();

    const shadow: ElementShadow = {
      color: "#000000",
      blur: 14,
      offsetX: 0,
      offsetY: 6,
      opacity: 0.3,
    };
    expect(cssDropShadowFilter(shadow, tokens)).toBe(
      "drop-shadow(0px 6px 14px rgba(0, 0, 0, 0.3))",
    );
  });

  it("konvaShadowProps returns attributes expected by Konva shapes", () => {
    expect(konvaShadowProps(undefined, tokens)).toEqual({});

    const shadow: ElementShadow = {
      color: { token: "dark" },
      blur: 10,
      offsetX: 3,
      offsetY: 5,
      opacity: 0.45,
    };
    expect(konvaShadowProps(shadow, tokens)).toEqual({
      shadowColor: "#1e293b",
      shadowBlur: 10,
      shadowOffsetX: 3,
      shadowOffsetY: 5,
      shadowOpacity: 0.45,
      shadowEnabled: true,
    });
  });
});
