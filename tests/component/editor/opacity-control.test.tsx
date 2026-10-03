/**
 * Component tests for OpacityField & Inspector Opacity Controls.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpacityField } from "@/features/editor/components/fields";
import { Inspector } from "@/features/editor/components/Inspector";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";

describe("OpacityField Component", () => {
  it("renders slider, number input, and quick preset buttons", () => {
    const handleChange = vi.fn();
    render(
      <OpacityField
        id="test-opacity"
        value={0.8}
        onChange={handleChange}
        label="Tingkat Opasitas"
      />,
    );

    // Number input shows percentage 80
    const numberInput = screen.getByRole("spinbutton", {
      name: "Tingkat Opasitas",
    }) as HTMLInputElement;
    expect(numberInput).toBeInTheDocument();
    expect(numberInput.value).toBe("80");

    // Slider has value 80
    const slider = screen.getByRole("slider", {
      name: "Tingkat Opasitas slider",
    }) as HTMLInputElement;
    expect(slider).toBeInTheDocument();
    expect(slider.value).toBe("80");

    // Quick presets (100%, 75%, 50%, 25%, 0%)
    const btn100 = screen.getByRole("button", { name: "100%" });
    const btn75 = screen.getByRole("button", { name: "75%" });
    const btn50 = screen.getByRole("button", { name: "50%" });
    const btn25 = screen.getByRole("button", { name: "25%" });
    const btn0 = screen.getByRole("button", { name: "0%" });

    expect(btn100).toBeInTheDocument();
    expect(btn75).toBeInTheDocument();
    expect(btn50).toBeInTheDocument();
    expect(btn25).toBeInTheDocument();
    expect(btn0).toBeInTheDocument();
  });

  it("updates opacity when range slider changes", () => {
    const handleChange = vi.fn();
    render(<OpacityField id="test-opacity" value={1} onChange={handleChange} />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "45" } });

    expect(handleChange).toHaveBeenCalledWith(0.45);
  });

  it("updates opacity when number input changes", () => {
    const handleChange = vi.fn();
    render(<OpacityField id="test-opacity" value={1} onChange={handleChange} />);

    const numberInput = screen.getByRole("spinbutton");
    fireEvent.change(numberInput, { target: { value: "60" } });

    expect(handleChange).toHaveBeenCalledWith(0.6);
  });

  it("updates opacity when preset button is clicked", () => {
    const handleChange = vi.fn();
    render(<OpacityField id="test-opacity" value={1} onChange={handleChange} />);

    const btn50 = screen.getByRole("button", { name: "50%" });
    fireEvent.click(btn50);

    expect(handleChange).toHaveBeenCalledWith(0.5);
  });
});

describe("Inspector Opacity Integration", () => {
  it("allows adjusting opacity for an element in the Inspector", () => {
    const textElement: Element = {
      id: "el_text_1",
      type: "text",
      frame: { x: 10, y: 10, w: 200, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Hello Opacity" }] },
      style: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        opacity: 1,
      },
    };

    const doc: CanonicalDocument = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: { colors: {}, fonts: {}, spacing: {} },
      },
      variables: [],
      sections: [
        {
          id: "sec_1",
          name: "Section 1",
          baseHeight: 844,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [textElement],
        },
      ],
    };

    const store = createEditorStore({
      document: canonicalDocumentSchema.parse(doc),
      revision: 1,
    });

    // Select the text element
    store.getState().selectElements(["el_text_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Inspector />
      </EditorProvider>,
    );

    // Dedicated Transparansi & Opasitas heading
    expect(screen.getByText("Transparansi & Opasitas")).toBeInTheDocument();

    // Change opacity using slider
    const slider = screen.getByRole("slider", { name: /slider/i });
    fireEvent.change(slider, { target: { value: "35" } });

    // Store has been updated with opacity 0.35
    const updatedElement = store
      .getState()
      .history.present.sections[0]?.elements.find((e) => e.id === "el_text_1");
    expect(updatedElement?.style.opacity).toBe(0.35);
  });
});
