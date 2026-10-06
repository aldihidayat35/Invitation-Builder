/**
 * Shadow presets and rendering utilities (Canva-inspired shadow effects).
 * Shared across editor and public renderer without Konva or editor dependencies.
 */
import type { ElementShadow, ThemeTokens } from "./schema";

export type ShadowPreset = "none" | "soft" | "drop" | "lift" | "glow" | "hard";

export interface ShadowPresetItem {
  readonly id: ShadowPreset;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly defaultShadow?: Omit<ElementShadow, "color"> & { defaultColor?: string };
}

export const SHADOW_PRESETS: readonly ShadowPresetItem[] = [
  {
    id: "none",
    label: "Tanpa Shadow",
    description: "Hilangkan efek bayangan",
    icon: "none",
  },
  {
    id: "soft",
    label: "Halus",
    description: "Bayangan lembut & elegan untuk teks dan elemen modern",
    icon: "soft",
    defaultShadow: {
      blur: 12,
      offsetX: 0,
      offsetY: 4,
      opacity: 0.25,
      defaultColor: "#000000",
    },
  },
  {
    id: "drop",
    label: "Klasik",
    description: "Bayangan jatuh natural dengan jarak proporsional",
    icon: "drop",
    defaultShadow: {
      blur: 8,
      offsetX: 3,
      offsetY: 4,
      opacity: 0.4,
      defaultColor: "#000000",
    },
  },
  {
    id: "lift",
    label: "Melayang",
    description: "Elevasi tinggi memberikan efek kartu melayang",
    icon: "lift",
    defaultShadow: {
      blur: 24,
      offsetX: 0,
      offsetY: 12,
      opacity: 0.35,
      defaultColor: "#000000",
    },
  },
  {
    id: "glow",
    label: "Pijar",
    description: "Cahaya halo lembut bersinar di sekeliling objek",
    icon: "glow",
    defaultShadow: {
      blur: 16,
      offsetX: 0,
      offsetY: 0,
      opacity: 0.65,
      defaultColor: "#e85d8f",
    },
  },
  {
    id: "hard",
    label: "Retro",
    description: "Bayangan tegas tanpa blur bergaya pop art retro",
    icon: "hard",
    defaultShadow: {
      blur: 0,
      offsetX: 4,
      offsetY: 4,
      opacity: 0.85,
      defaultColor: "#000000",
    },
  },
] as const;

/**
 * Creates an ElementShadow configuration from a preset, preserving custom color if available.
 */
export function createShadowFromPreset(
  preset: ShadowPreset,
  currentColor?: string | { token: string },
): ElementShadow | undefined {
  if (preset === "none") return undefined;
  const item = SHADOW_PRESETS.find((p) => p.id === preset);
  if (!item || !item.defaultShadow) return undefined;

  const color = currentColor ?? item.defaultShadow.defaultColor ?? "#000000";
  return {
    color,
    blur: item.defaultShadow.blur,
    offsetX: item.defaultShadow.offsetX,
    offsetY: item.defaultShadow.offsetY,
    opacity: item.defaultShadow.opacity,
  };
}

/**
 * Detects matching preset based on shadow values, or returns "drop" as customizable default.
 */
export function detectShadowPreset(shadow: ElementShadow | undefined): ShadowPreset {
  if (!shadow) return "none";
  if (shadow.blur === 0 && (shadow.offsetX !== 0 || shadow.offsetY !== 0)) return "hard";
  if (shadow.offsetX === 0 && shadow.offsetY === 0 && shadow.blur > 0) return "glow";
  if (shadow.offsetY >= 10 && shadow.blur >= 18) return "lift";
  if (shadow.offsetX === 0 && shadow.offsetY <= 6 && shadow.blur >= 10 && shadow.opacity <= 0.3) {
    return "soft";
  }
  return "drop";
}

/**
 * Resolves color value or token to hex literal string.
 */
export function resolveShadowColor(
  value: string | { token: string } | undefined,
  tokens: Pick<ThemeTokens, "colors">,
  fallback: string = "#000000",
): string {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  return tokens.colors[value.token] ?? fallback;
}

/**
 * Converts hex (#rgb, #rrggbb) to rgba string with clamped alpha.
 */
export function hexToRgba(hexOrColor: string, opacity: number): string {
  if (!hexOrColor) return `rgba(0, 0, 0, ${opacity})`;
  if (hexOrColor.startsWith("rgba(") || hexOrColor.startsWith("rgb(")) {
    return hexOrColor;
  }
  const cleanHex = hexOrColor.replace("#", "").trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0]! + cleanHex[0]!, 16);
    g = parseInt(cleanHex[1]! + cleanHex[1]!, 16);
    b = parseInt(cleanHex[2]! + cleanHex[2]!, 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  }
  const alpha = Math.max(0, Math.min(1, opacity));
  return `rgba(${isNaN(r) ? 0 : r}, ${isNaN(g) ? 0 : g}, ${isNaN(b) ? 0 : b}, ${alpha})`;
}

/**
 * Returns CSS text-shadow string for typography.
 */
export function cssTextShadow(
  shadow: ElementShadow | undefined,
  tokens: Pick<ThemeTokens, "colors">,
): string | undefined {
  if (!shadow) return undefined;
  const baseColor = resolveShadowColor(shadow.color, tokens, "#000000");
  const rgba = hexToRgba(baseColor, shadow.opacity);
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${rgba}`;
}

/**
 * Returns CSS drop-shadow filter string for images, shapes, and widgets.
 */
export function cssDropShadowFilter(
  shadow: ElementShadow | undefined,
  tokens: Pick<ThemeTokens, "colors">,
): string | undefined {
  if (!shadow) return undefined;
  const baseColor = resolveShadowColor(shadow.color, tokens, "#000000");
  const rgba = hexToRgba(baseColor, shadow.opacity);
  return `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${rgba})`;
}

/**
 * Returns Konva node properties for real-time canvas rendering.
 */
export function konvaShadowProps(
  shadow: ElementShadow | undefined,
  tokens: Pick<ThemeTokens, "colors">,
): {
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowEnabled?: boolean;
} {
  if (!shadow) return {};
  const baseColor = resolveShadowColor(shadow.color, tokens, "#000000");
  return {
    shadowColor: baseColor,
    shadowBlur: shadow.blur,
    shadowOffsetX: shadow.offsetX,
    shadowOffsetY: shadow.offsetY,
    shadowOpacity: shadow.opacity,
    shadowEnabled: true,
  };
}
