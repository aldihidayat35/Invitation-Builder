import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ShadowControl } from "@/features/editor/components/ShadowControl";
import { Inspector } from "@/features/editor/components/Inspector";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { DocumentRenderer } from "@/features/renderer";
import { canonicalDocumentSchema, type CanonicalDocument, type ElementShadow } from "@/lib/schema";
import { resolveDocument } from "@/lib/engine";

const tokens = {
  colors: {
    primary: "#e85d8f",
    dark: "#1e293b",
    surface: "#ffffff",
  },
};

function makeDocWithShadow(shadow?: ElementShadow): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    design: {
      tokens: {
        colors: { primary: "#e85d8f", background: "#fcfaf7" },
        fonts: { body: "Plus Jakarta Sans" },
      },
    },
    variables: [],
    sections: [
      {
        id: "sec_1",
        name: "Main",
        baseHeight: 844,
        overflow: "hidden",
        visible: true,
        background: { color: "#ffffff" },
        elements: [
          {
            id: "el_text_shadow",
            type: "text",
            frame: { x: 20, y: 30, w: 200, h: 40, rotation: 0 },
            visible: true,
            locked: false,
            content: { segments: [{ text: "Teks Berbayangan" }] },
            style: {
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.4,
              letterSpacing: 0,
              textAlign: "center",
              color: "#000000",
              opacity: 1,
              shadow,
            },
          },
          {
            id: "el_shape_shadow",
            type: "shape",
            shapeType: "rectangle",
            frame: { x: 20, y: 100, w: 100, h: 100, rotation: 0 },
            visible: true,
            locked: false,
            style: {
              fill: "#e85d8f",
              radius: 12,
              opacity: 1,
              shadow,
            },
          },
        ],
      },
    ],
  });
}

describe("ShadowControl Component", () => {
  it("renders 6 preset buttons and indicates active preset", () => {
    const onChange = vi.fn();
    render(<ShadowControl shadow={undefined} tokens={tokens} onChange={onChange} />);

    expect(screen.getByTestId("shadow-control")).toBeInTheDocument();
    expect(screen.getByTestId("shadow-preset-none")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("shadow-preset-soft")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("shadow-preset-drop")).toBeInTheDocument();
    expect(screen.getByTestId("shadow-preset-lift")).toBeInTheDocument();
    expect(screen.getByTestId("shadow-preset-glow")).toBeInTheDocument();
    expect(screen.getByTestId("shadow-preset-hard")).toBeInTheDocument();
  });

  it("clicking a preset button calls onChange with preset defaults", () => {
    const onChange = vi.fn();
    render(<ShadowControl shadow={undefined} tokens={tokens} onChange={onChange} />);

    // Click 'Halus' (soft)
    fireEvent.click(screen.getByTestId("shadow-preset-soft"));
    expect(onChange).toHaveBeenCalledWith({
      color: "#000000",
      blur: 12,
      offsetX: 0,
      offsetY: 4,
      opacity: 0.25,
    });

    // Click 'Pijar' (glow)
    fireEvent.click(screen.getByTestId("shadow-preset-glow"));
    expect(onChange).toHaveBeenCalledWith({
      color: "#e85d8f",
      blur: 16,
      offsetX: 0,
      offsetY: 0,
      opacity: 0.65,
    });
  });

  it("shows fine-tuning sliders when shadow is active and allows resetting", () => {
    const onChange = vi.fn();
    const shadow: ElementShadow = {
      color: "#000000",
      blur: 12,
      offsetX: 0,
      offsetY: 4,
      opacity: 0.25,
    };

    render(<ShadowControl shadow={shadow} tokens={tokens} onChange={onChange} />);

    expect(screen.getByTestId("shadow-sliders")).toBeInTheDocument();

    // Reset button
    const resetBtn = screen.getByTestId("shadow-reset-btn");
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});

describe("Inspector and Renderer Shadow Integration", () => {
  it("allows setting and adjusting shadow from Inspector", () => {
    const doc = makeDocWithShadow();
    const store = createEditorStore({
      document: doc,
      revision: 1,
    });
    store.getState().selectElements(["el_text_shadow"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Inspector />
      </EditorProvider>,
    );

    expect(screen.getByTestId("shadow-control")).toBeInTheDocument();

    // Click Lift preset
    act(() => {
      fireEvent.click(screen.getByTestId("shadow-preset-lift"));
    });

    const currentDoc = store.getState().history.present;
    const textEl = currentDoc.sections[0]?.elements[0];
    expect(textEl?.style.shadow).toBeDefined();
    expect(textEl?.style.shadow?.blur).toBe(24);
    expect(textEl?.style.shadow?.offsetY).toBe(12);
  });

  it("DocumentRenderer renders text with text-shadow and shape with drop-shadow filter", () => {
    const shadow: ElementShadow = {
      color: "#000000",
      blur: 10,
      offsetX: 2,
      offsetY: 4,
      opacity: 0.5,
    };
    const doc = makeDocWithShadow(shadow);
    const resolved = resolveDocument(doc);

    render(<DocumentRenderer document={resolved} runtimeMode="public" />);

    // Text element should have textShadow
    const textEl = screen.getByText("Teks Berbayangan");
    expect(textEl).toHaveStyle({
      textShadow: "2px 4px 10px rgba(0, 0, 0, 0.5)",
    });

    // Shape element frame should have filter: drop-shadow(...)
    const shapeEl = screen.getByTestId("element-el_shape_shadow");
    expect(shapeEl).toHaveStyle({
      filter: "drop-shadow(2px 4px 10px rgba(0, 0, 0, 0.5))",
    });
  });
});
