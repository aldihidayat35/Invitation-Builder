import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Artboard } from "@/features/editor/components/Artboard";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Section, type Element } from "@/lib/schema";
import { fullDocument } from "../../helpers/documents";

describe("Marquee Selection (Seleksi Objek Massal dengan Drag Kursor)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setupWithElements(elements: Element[]) {
    const rawDoc = fullDocument();
    const doc: CanonicalDocument = canonicalDocumentSchema.parse(rawDoc);
    
    // Use first section and place custom test elements
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
    {
      id: "el_2",
      type: "text",
      frame: { x: 140, y: 30, w: 100, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Item 2" }] },
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
    {
      id: "el_3",
      type: "text",
      frame: { x: 20, y: 150, w: 100, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Item 3 (Jauh)" }] },
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

  it("renders artboard container and initiates marquee on pointer drag", () => {
    const { store, sectionId } = setupWithElements(sampleElements);
    const artboard = screen.getByTestId("artboard");

    // Mock getBoundingClientRect
    vi.spyOn(artboard, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      right: 900,
      bottom: 850,
      width: 800,
      height: 800,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const canvasEl = screen.getByTestId(`canvas-${sectionId}`);
    vi.spyOn(canvasEl, "getBoundingClientRect").mockReturnValue({
      left: 200,
      top: 100,
      right: 590,
      bottom: 944,
      width: 390,
      height: 844,
      x: 200,
      y: 100,
      toJSON: () => {},
    });

    // Pointer down from outside the canvas (x=120, y=80)
    fireEvent.pointerDown(artboard, {
      clientX: 120,
      clientY: 80,
      button: 0,
    });

    // Drag to intersect el_1 and el_2
    // el_1 screen: left=200+20=220, top=100+30=130, right=320, bottom=170
    // el_2 screen: left=200+140=340, top=100+30=130, right=440, bottom=170
    fireEvent(
      window,
      new MouseEvent("pointermove", {
        clientX: 360,
        clientY: 150,
        bubbles: true,
      }),
    );

    // Marquee visual box should be rendered
    const marqueeBox = screen.queryByTestId("marquee-selection-box");
    expect(marqueeBox).toBeInTheDocument();

    // Both el_1 and el_2 should be selected in store
    const selected = store.getState().selectedIds;
    expect(selected).toContain("el_1");
    expect(selected).toContain("el_2");
    expect(selected).not.toContain("el_3");

    // Pointer up to finalize
    fireEvent(
      window,
      new MouseEvent("pointerup", {
        clientX: 360,
        clientY: 150,
        bubbles: true,
      }),
    );

    expect(screen.queryByTestId("marquee-selection-box")).not.toBeInTheDocument();
    expect(store.getState().selectedIds).toEqual(["el_1", "el_2"]);
  });

  it("supports Shift key for additive marquee selection", () => {
    const { store, sectionId } = setupWithElements(sampleElements);
    const artboard = screen.getByTestId("artboard");

    vi.spyOn(artboard, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      right: 900,
      bottom: 850,
      width: 800,
      height: 800,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const canvasEl = screen.getByTestId(`canvas-${sectionId}`);
    vi.spyOn(canvasEl, "getBoundingClientRect").mockReturnValue({
      left: 200,
      top: 100,
      right: 590,
      bottom: 944,
      width: 390,
      height: 844,
      x: 200,
      y: 100,
      toJSON: () => {},
    });

    // Initially select el_3
    store.getState().selectElements(["el_3"]);
    expect(store.getState().selectedIds).toEqual(["el_3"]);

    // Marquee select el_1 with Shift key held
    fireEvent.pointerDown(artboard, {
      clientX: 120,
      clientY: 80,
      button: 0,
      shiftKey: true,
    });

    fireEvent(
      window,
      new MouseEvent("pointermove", {
        clientX: 250,
        clientY: 150,
        bubbles: true,
      }),
    );

    // Both el_3 (from before) and el_1 (newly touched) should be selected
    const selected = store.getState().selectedIds;
    expect(selected).toContain("el_3");
    expect(selected).toContain("el_1");

    fireEvent(
      window,
      new MouseEvent("pointerup", {
        clientX: 250,
        clientY: 150,
        bubbles: true,
      }),
    );

    expect(store.getState().selectedIds).toContain("el_3");
    expect(store.getState().selectedIds).toContain("el_1");
  });

  it("clears selection when clicking empty space without dragging (normal click)", () => {
    const { store } = setupWithElements(sampleElements);
    const artboard = screen.getByTestId("artboard");

    // Initially select elements
    store.getState().selectElements(["el_1", "el_2"]);
    expect(store.getState().selectedIds).toHaveLength(2);

    // Click without move
    fireEvent.pointerDown(artboard, {
      clientX: 120,
      clientY: 80,
      button: 0,
      shiftKey: false,
    });

    fireEvent(
      window,
      new MouseEvent("pointerup", {
        clientX: 120,
        clientY: 80,
        bubbles: true,
      }),
    );

    expect(store.getState().selectedIds).toHaveLength(0);
  });

  it("does NOT clear selection when clicking on canvas target without dragging (preserves element selection)", () => {
    const { store, sectionId } = setupWithElements(sampleElements);

    // Select el_1
    store.getState().selectElements(["el_1"]);
    expect(store.getState().selectedIds).toEqual(["el_1"]);

    // Find canvas container
    const canvasContainer = screen.getByTestId(`canvas-${sectionId}`);
    // Simulate canvas DOM element
    const canvasEl = canvasContainer.querySelector("canvas") ?? canvasContainer;

    // Pointer down on canvas element
    fireEvent.pointerDown(canvasEl, {
      clientX: 200,
      clientY: 100,
      button: 0,
      shiftKey: false,
    });

    // Pointer up without moving/dragging
    fireEvent(
      window,
      new MouseEvent("pointerup", {
        clientX: 200,
        clientY: 100,
        bubbles: true,
      }),
    );

    // Selection should remain preserved because Konva handles canvas clicks
    expect(store.getState().selectedIds).toEqual(["el_1"]);
  });
});
