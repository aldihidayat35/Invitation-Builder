import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Artboard } from "@/features/editor/components/Artboard";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";
import { fullDocument } from "../../helpers/documents";

describe("Artboard Selection Stability (Bebas dari Interferensi Marquee)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setupWithElements(elements: Element[]) {
    const rawDoc = fullDocument();
    const doc: CanonicalDocument = canonicalDocumentSchema.parse(rawDoc);

    const testSection = doc.sections[0]!;
    testSection.elements = elements;

    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Artboard />
      </EditorProvider>,
    );

    return { ...utils, store, doc, sectionId: testSection.id };
  }

  const sampleElements: Element[] = [
    {
      id: "el_1",
      type: "text",
      frame: { x: 20, y: 30, w: 100, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Item 1" }] },
      style: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        opacity: 1,
      },
    },
  ];

  it("does not render marquee box and keeps selection stable during drag movements", () => {
    const { store } = setupWithElements(sampleElements);
    const artboard = screen.getByTestId("artboard");

    // Select el_1 manually
    store.getState().selectElements(["el_1"]);
    expect(store.getState().selectedIds).toEqual(["el_1"]);

    // Move pointer around artboard
    fireEvent.pointerMove(artboard, { clientX: 300, clientY: 200 });

    // Ensure marquee box is never rendered
    expect(screen.queryByTestId("marquee-selection-box")).not.toBeInTheDocument();

    // Selection should remain intact
    expect(store.getState().selectedIds).toEqual(["el_1"]);
  });

  it("clears selection when clicking empty artboard scroll background directly", () => {
    const { store } = setupWithElements(sampleElements);
    const artboard = screen.getByTestId("artboard");

    store.getState().selectElements(["el_1"]);
    expect(store.getState().selectedIds).toEqual(["el_1"]);

    // Click directly on artboard scroll container
    fireEvent.pointerDown(artboard);

    expect(store.getState().selectedIds).toEqual([]);
  });
});
