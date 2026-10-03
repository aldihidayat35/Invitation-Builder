/**
 * Unit tests: Animation Presets and Registry (FR-ANM-001..004, P-09).
 */
import {
  ALL_PRESETS,
  P0_ENTER_PRESETS,
  TEXT_PRESETS,
  animationPresetRegistry,
} from "@/features/animations";

describe("Animation Presets (FR-ANM-001..004)", () => {
  it("includes all P0 enter presets defined in PRD §12", () => {
    const p0Ids = P0_ENTER_PRESETS.map((p) => p.id);
    expect(p0Ids).toContain("fadeIn");
    expect(p0Ids).toContain("slideUp");
    expect(p0Ids).toContain("slideDown");
    expect(p0Ids).toContain("slideLeft");
    expect(p0Ids).toContain("slideRight");
    expect(p0Ids).toContain("zoomIn");
    expect(p0Ids).toContain("rotateInSoft");
  });

  it("includes required text presets (charFade, charRise, wordReveal)", () => {
    const textIds = TEXT_PRESETS.map((p) => p.id);
    expect(textIds).toContain("charFade");
    expect(textIds).toContain("charRise");
    expect(textIds).toContain("wordReveal");
  });

  it("ensures all presets are transform/opacity-first (Rule 9 / NFR-PERF-001)", () => {
    const allowedKeys = new Set([
      "opacity",
      "x",
      "y",
      "scale",
      "scaleX",
      "scaleY",
      "rotation",
      "transformOrigin",
    ]);

    for (const preset of ALL_PRESETS) {
      for (const key of Object.keys(preset.keyframes.from)) {
        expect(allowedKeys.has(key)).toBe(true);
      }
      for (const key of Object.keys(preset.keyframes.to)) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    }
  });

  it("restricts text presets to text elements only", () => {
    for (const preset of TEXT_PRESETS) {
      expect(preset.applicableElements).toEqual(["text"]);
    }
  });
});

describe("Animation Preset Registry (P-09)", () => {
  it("retrieves presets by id and validates existence", () => {
    expect(animationPresetRegistry.has("fadeIn")).toBe(true);
    expect(animationPresetRegistry.has("charRise")).toBe(true);
    expect(animationPresetRegistry.has("unknown_preset")).toBe(false);

    const preset = animationPresetRegistry.get("slideUp");
    expect(preset?.label).toBe("Geser Naik (Slide Up)");
  });

  it("filters presets for specific element types", () => {
    const textPresets = animationPresetRegistry.listForElement("text");
    const shapePresets = animationPresetRegistry.listForElement("shape");

    const textPresetIds = textPresets.map((p) => p.id);
    const shapePresetIds = shapePresets.map((p) => p.id);

    expect(textPresetIds).toContain("charRise");
    expect(shapePresetIds).not.toContain("charRise");
    expect(shapePresetIds).toContain("fadeIn");
    expect(shapePresetIds).toContain("slideDown");
  });
});
