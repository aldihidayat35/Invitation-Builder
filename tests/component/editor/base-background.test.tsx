import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  canonicalDocumentV1Schema,
  type CanonicalDocument,
} from "@/lib/schema";
import { resolveDocument } from "@/lib/engine";
import { createEditorStore } from "@/features/editor/core/store";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { BaseBackgroundControl, BASE_BG_PRESETS } from "@/features/editor/components/BaseBackgroundControl";
import { DocumentRenderer } from "@/features/renderer";

function createTestDoc(): CanonicalDocument {
  return {
    schemaVersion: 1,
    design: {
      baseWidth: 390,
      tokens: {
        colors: { primary: "#7c3aed", surface: "#ffffff" },
        fonts: {},
        spacing: {},
      },
      background: {
        color: "#f8f6f0",
        fit: "cover",
        overlayColor: "#000000",
        overlayOpacity: 0.2,
      },
    },
    variables: [],
    sections: [
      {
        id: "sec-1",
        name: "Cover",
        baseHeight: 600,
        overflow: "hidden",
        visible: true,
        background: {
          fit: "cover",
        },
        elements: [],
      },
      {
        id: "sec-2",
        name: "Details",
        baseHeight: 500,
        overflow: "hidden",
        visible: true,
        background: {
          color: "#ffffff",
          fit: "cover",
        },
        elements: [],
      },
    ],
  };
}

describe("Default Screen Background Feature", () => {
  it("validates documentBackgroundSchema in canonical document schema", () => {
    const doc = createTestDoc();
    const parsed = canonicalDocumentV1Schema.safeParse(doc);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.design.background?.color).toBe("#f8f6f0");
      expect(parsed.data.design.background?.overlayOpacity).toBe(0.2);
    }
  });

  it("resolves document background in resolveDocument", () => {
    const doc = createTestDoc();
    const resolved = resolveDocument(doc);

    expect(resolved.ok).toBe(true);
    expect(resolved.background).toBeDefined();
    expect(resolved.background?.color).toBe("#f8f6f0");
    expect(resolved.background?.fit).toBe("cover");
    expect(resolved.background?.overlayColor).toBe("#000000");
    expect(resolved.background?.overlayOpacity).toBe(0.2);
  });

  it("manages screen background in editor store", () => {
    const doc = createTestDoc();
    const store = createEditorStore({ document: doc, revision: 1 });

    // Patch background
    store.getState().patchBaseBackground({ color: "#0f172a" });
    expect(store.getState().history.present.design.background?.color).toBe("#0f172a");

    // Clear background
    store.getState().setBaseBackground(undefined);
    expect(store.getState().history.present.design.background).toBeUndefined();
  });

  it("renders stationary base background and transparent section background when no color is set", () => {
    const doc = createTestDoc();
    const resolved = resolveDocument(doc);

    const { container } = render(<DocumentRenderer document={resolved} runtimeMode="preview" />);

    // Base background element exists with the resolved color
    const baseBg = screen.getByTestId("renderer-base-background");
    expect(baseBg).toBeInTheDocument();
    expect(baseBg).toHaveStyle({ backgroundColor: "rgb(248, 246, 240)" });

    // Section 1 has no background color specified, so it has transparent background
    const sec1 = container.querySelector('[data-section-id="sec-1"]');
    expect(sec1).toBeInTheDocument();
    expect(sec1).toHaveStyle({ background: "transparent" });

    // Section 2 has explicit white background
    const sec2 = container.querySelector('[data-section-id="sec-2"]');
    expect(sec2).toBeInTheDocument();
    expect(sec2).toHaveStyle({ background: "#ffffff" });
  });

  it("allows selecting presets and resetting background in BaseBackgroundControl", () => {
    const doc = createTestDoc();
    const store = createEditorStore({ document: doc, revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <BaseBackgroundControl />
      </EditorProvider>,
    );

    const control = screen.getByTestId("base-background-control");
    expect(control).toBeInTheDocument();

    // Click on a preset button, e.g., dark-slate
    const darkSlatePreset = BASE_BG_PRESETS.find((p) => p.id === "dark-slate");
    expect(darkSlatePreset).toBeDefined();

    const presetBtn = screen.getByTestId("base-bg-preset-dark-slate");
    fireEvent.click(presetBtn);

    expect(store.getState().history.present.design.background?.color).toBe("#0f172a");

    // Reset button
    const resetBtn = screen.getByTestId("base-bg-reset-btn");
    fireEvent.click(resetBtn);

    expect(store.getState().history.present.design.background).toBeUndefined();
  });
});
