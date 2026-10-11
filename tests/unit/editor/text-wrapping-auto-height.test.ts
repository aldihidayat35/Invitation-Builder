import { describe, it, expect } from "vitest";
import { WEDDING_PRESETS } from "@/features/editor/components/VariablesCatalogPanel";
import { variableDefinitionSchema, createEmptyDocument } from "@/lib/schema";
import { addSection, createElement, updateVariable, addVariable } from "@/features/editor/core/ops";
import { createEditorStore } from "@/features/editor/core/store";

describe("Text Element Auto-Height, Wrapping & Variable Limits", () => {
  it("defines comprehensive maxLength limits across all wedding text presets", () => {
    // Check key presets requested
    const groomFullName = WEDDING_PRESETS.find((p) => p.key === "couple.groom.fullName");
    expect(groomFullName).toBeDefined();
    expect(groomFullName?.maxLength).toBe(80);

    const groomNickname = WEDDING_PRESETS.find((p) => p.key === "couple.groom.nickname");
    expect(groomNickname).toBeDefined();
    expect(groomNickname?.maxLength).toBe(30);

    const brideTitle = WEDDING_PRESETS.find((p) => p.key === "wedding.title");
    expect(brideTitle).toBeDefined();
    expect(brideTitle?.maxLength).toBe(60);

    const groomBio = WEDDING_PRESETS.find((p) => p.key === "couple.groom.bio");
    expect(groomBio).toBeDefined();
    expect(groomBio?.maxLength).toBe(200);

    const brideBio = WEDDING_PRESETS.find((p) => p.key === "couple.bride.bio");
    expect(brideBio).toBeDefined();
    expect(brideBio?.maxLength).toBe(200);

    const story = WEDDING_PRESETS.find((p) => p.key === "wedding.story");
    expect(story).toBeDefined();
    expect(story?.maxLength).toBe(500);

    const thanks = WEDDING_PRESETS.find((p) => p.key === "wedding.thanks");
    expect(thanks).toBeDefined();
    expect(thanks?.maxLength).toBe(300);

    // Every text preset must have a positive maxLength
    for (const preset of WEDDING_PRESETS) {
      if (preset.type === "text") {
        expect(preset.maxLength).toBeDefined();
        expect(preset.maxLength).toBeGreaterThan(0);
      }
    }
  });

  it("validates and accepts maxLength on text variables in variableDefinitionSchema", () => {
    const valid = variableDefinitionSchema.safeParse({
      key: "couple.groom.fullName",
      label: "Nama Pengantin Pria",
      type: "text",
      default: "Danang",
      maxLength: 100,
      required: false,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.type === "text" && valid.data.maxLength).toBe(100);
    }

    // Fails if maxLength is negative or zero
    const invalidZero = variableDefinitionSchema.safeParse({
      key: "test.limit",
      label: "Limit Zero",
      type: "text",
      maxLength: 0,
      required: false,
    });
    expect(invalidZero.success).toBe(false);
  });

  it("supports updating variable maxLength via store operations", () => {
    let doc = createEmptyDocument();
    const { document: withSec, sectionId } = addSection(doc);
    const { document: withText, elementId } = createElement(withSec, sectionId, "text");

    const store = createEditorStore({ document: withText, revision: 1 });

    // Add variable with maxLength
    store.getState().addVariable({
      key: "custom.note",
      label: "Catatan Tamu",
      type: "text",
      default: "Semoga bahagia",
      maxLength: 150,
      required: false,
    });

    let current = store.getState().history.present;
    let found = current.variables.find((v) => v.key === "custom.note");
    expect(found).toBeDefined();
    expect(found?.type === "text" && found.maxLength).toBe(150);

    // Update variable maxLength
    store.getState().updateVariable("custom.note", { maxLength: 250 });
    current = store.getState().history.present;
    found = current.variables.find((v) => v.key === "custom.note");
    expect(found?.type === "text" && found.maxLength).toBe(250);
  });
});
