import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { LeftPanel } from "@/features/editor/components/LeftPanel";
import { createEditorStore } from "@/features/editor/core/store";
import { moveElementInLayers } from "@/features/editor/core/ops";
import {
  canonicalDocumentSchema,
  type CanonicalDocument,
  type TextElement,
} from "@/lib/schema";

function makeDocWith3Elements(): CanonicalDocument {
  const el0: TextElement = {
    id: "el_bottom",
    type: "text",
    frame: { x: 10, y: 10, w: 100, h: 40, rotation: 0 },
    visible: true,
    locked: false,
    content: { segments: [{ text: "Bottom Text" }] },
    style: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
      color: "#000000",
      opacity: 1,
    },
  };
  const el1: TextElement = {
    id: "el_middle",
    type: "text",
    frame: { x: 20, y: 20, w: 100, h: 40, rotation: 0 },
    visible: true,
    locked: false,
    content: { segments: [{ text: "Middle Text" }] },
    style: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
      color: "#000000",
      opacity: 1,
    },
  };
  const el2: TextElement = {
    id: "el_top",
    type: "text",
    frame: { x: 30, y: 30, w: 100, h: 40, rotation: 0 },
    visible: true,
    locked: false,
    content: { segments: [{ text: "Top Text" }] },
    style: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
      color: "#000000",
      opacity: 1,
    },
  };

  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    design: {
      baseWidth: 390,
      tokens: { colors: {}, fonts: {}, spacing: {} },
    },
    variables: [],
    sections: [
      {
        id: "sec_main",
        name: "Cover",
        baseHeight: 844,
        background: { color: "#ffffff", fit: "cover" },
        overflow: "hidden",
        visible: true,
        // In elements array: index 0 is bottom, index 2 is top
        elements: [el0, el1, el2],
      },
    ],
  });
}

describe("Layer Reordering Logic (moveElementInLayers)", () => {
  it("moves the bottom element above the top element", () => {
    const doc = makeDocWith3Elements();
    // Visual layers in UI: [el_top, el_middle, el_bottom]
    // Move el_bottom "above" el_top => visual becomes [el_bottom, el_top, el_middle]
    // Resulting elements array: [el_middle, el_top, el_bottom] (el_bottom is last, highest z-index)
    const nextDoc = moveElementInLayers(doc, "sec_main", "el_bottom", "el_top", "above");
    const elements = nextDoc.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_middle", "el_top", "el_bottom"]);
  });

  it("moves the top element below the bottom element", () => {
    const doc = makeDocWith3Elements();
    // Visual layers in UI: [el_top, el_middle, el_bottom]
    // Move el_top "below" el_bottom => visual becomes [el_middle, el_bottom, el_top]
    // Resulting elements array: [el_top, el_bottom, el_middle] (el_top is first, lowest z-index)
    const nextDoc = moveElementInLayers(doc, "sec_main", "el_top", "el_bottom", "below");
    const elements = nextDoc.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_top", "el_bottom", "el_middle"]);
  });

  it("moves middle element above top element", () => {
    const doc = makeDocWith3Elements();
    // Move el_middle "above" el_top => visual becomes [el_middle, el_top, el_bottom]
    // Resulting elements array: [el_bottom, el_top, el_middle]
    const nextDoc = moveElementInLayers(doc, "sec_main", "el_middle", "el_top", "above");
    const elements = nextDoc.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_bottom", "el_top", "el_middle"]);
  });

  it("returns same doc on invalid or identical source and target", () => {
    const doc = makeDocWith3Elements();
    const same = moveElementInLayers(doc, "sec_main", "el_top", "el_top", "above");
    expect(same).toBe(doc);

    const nonExistent = moveElementInLayers(doc, "sec_main", "el_unknown", "el_top", "above");
    expect(nonExistent).toBe(doc);
  });
});

describe("Store moveElementLayer & Undo/Redo", () => {
  it("updates store present document and allows undo/redo", () => {
    const doc = makeDocWith3Elements();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().setActiveSection("sec_main");

    // Move el_bottom above el_top
    store.getState().moveElementLayer("sec_main", "el_bottom", "el_top", "above");

    let elements = store.getState().history.present.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_middle", "el_top", "el_bottom"]);

    // Undo restores original order
    store.getState().undo();
    elements = store.getState().history.present.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_bottom", "el_middle", "el_top"]);

    // Redo re-applies move
    store.getState().redo();
    elements = store.getState().history.present.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_middle", "el_top", "el_bottom"]);
  });
});

describe("LeftPanel Layer Drag and Drop UI", () => {
  it("renders grip handles and draggable layer rows", () => {
    const doc = makeDocWith3Elements();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().setActiveSection("sec_main");

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <LeftPanel />
      </EditorProvider>,
    );

    const list = screen.getByTestId("layer-list");
    expect(list).toBeInTheDocument();

    const gripTop = screen.getByTestId("layer-grip-el_top");
    const gripMiddle = screen.getByTestId("layer-grip-el_middle");
    const gripBottom = screen.getByTestId("layer-grip-el_bottom");

    expect(gripTop).toBeInTheDocument();
    expect(gripMiddle).toBeInTheDocument();
    expect(gripBottom).toBeInTheDocument();

    const rowTop = screen.getByTestId("layer-el_top");
    expect(rowTop).toHaveAttribute("draggable", "true");
  });

  it("handles dragover, computes placement above/below, and moves layer on drop", () => {
    const doc = makeDocWith3Elements();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().setActiveSection("sec_main");

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <LeftPanel />
      </EditorProvider>,
    );

    const rowBottom = screen.getByTestId("layer-el_bottom");

    vi.spyOn(window.HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.getAttribute("data-testid") === "layer-el_top") {
        return {
          top: 100,
          bottom: 130,
          height: 30,
          left: 0,
          right: 200,
          width: 200,
          x: 0,
          y: 100,
          toJSON: () => {},
        } as DOMRect;
      }
      return {
        top: 0,
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    });

    const mockDataTransfer = {
      setData: () => {},
      getData: () => "el_bottom",
      effectAllowed: "none",
      dropEffect: "none",
    };

    // 1. Drag start on el_bottom
    fireEvent.dragStart(rowBottom, { dataTransfer: mockDataTransfer });
    expect(screen.getByTestId("layer-el_bottom")).toHaveAttribute("data-dragging", "true");

    // 2. Drag over top half of el_top (clientY = 105 < midY = 115) => placement = "above"
    const targetRow = screen.getByTestId("layer-el_top");
    const dragOverEvent = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(dragOverEvent, "clientY", { value: 105 });
    Object.defineProperty(dragOverEvent, "dataTransfer", { value: mockDataTransfer });
    fireEvent(targetRow, dragOverEvent);

    expect(targetRow).toHaveAttribute("data-drop-target", "above");

    // 3. Drop on el_top
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", { value: mockDataTransfer });
    fireEvent(targetRow, dropEvent);

    // Verify store has el_bottom on top of el_top
    const elements = store.getState().history.present.sections[0]!.elements;
    expect(elements.map((e) => e.id)).toEqual(["el_middle", "el_top", "el_bottom"]);
  });
});
