/**
 * Component tests for Duplicate, Copy, Paste features and ContextMenu.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Inspector } from "@/features/editor/components/Inspector";
import { ContextMenu } from "@/features/editor/components/ContextMenu";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";

function makeDoc(elements: Element[] = []): CanonicalDocument {
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
        name: "Cover",
        baseHeight: 844,
        overflow: "hidden",
        visible: true,
        background: { color: "#ffffff" },
        elements,
      },
      {
        id: "sec_2",
        name: "Acara",
        baseHeight: 844,
        overflow: "hidden",
        visible: true,
        background: { color: "#ffffff" },
        elements: [],
      },
    ],
  });
}

describe("Copy-Paste and Duplicate in Inspector", () => {
  it("renders Duplikat, Salin, and Tempel buttons for a selected element", () => {
    const textElement: Element = {
      id: "el_text_1",
      type: "text",
      name: "Teks Sambutan",
      frame: { x: 20, y: 30, w: 200, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Selamat Datang" }] },
      style: {
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "center",
        color: "#1e293b",
        opacity: 1,
      },
      animations: {
        enter: {
          presetId: "fade-in",
          trigger: "onEnterViewport",
          durationMs: 600,
          delayMs: 0,
          easing: "ease-out",
          repeat: 0,
          yoyo: false,
          staggerUnit: "none",
          staggerAmountMs: 0,
          once: true,
        },
      },
    };

    const doc = makeDoc([textElement]);
    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    // Select the element
    store.getState().selectElements([textElement.id]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Inspector />
      </EditorProvider>,
    );

    const dupBtn = screen.getByTestId("action-duplicate");
    const copyBtn = screen.getByTestId("action-copy");
    const pasteBtn = screen.getByTestId("action-paste");

    expect(dupBtn).toBeInTheDocument();
    expect(copyBtn).toBeInTheDocument();
    expect(pasteBtn).toBeInTheDocument();

    // Paste is initially disabled because clipboard is empty
    expect(pasteBtn).toBeDisabled();

    // Click Salin (Copy)
    fireEvent.click(copyBtn);

    // Clipboard now has the element
    expect(store.getState().clipboard).toHaveLength(1);
    expect(store.getState().clipboard[0]!.id).toBe(textElement.id);

    // Paste button is now enabled
    expect(pasteBtn).not.toBeDisabled();

    // Click Tempel (Paste)
    fireEvent.click(pasteBtn);

    // Document now has 2 elements in sec_1
    const sec1Elements = store.getState().history.present.sections[0]!.elements;
    expect(sec1Elements).toHaveLength(2);

    const pasted = sec1Elements[1]!;
    expect(pasted.id).not.toBe(textElement.id);
    expect(pasted.frame.w).toBe(textElement.frame.w);
    expect(pasted.frame.h).toBe(textElement.frame.h);
    expect(pasted.animations).toEqual(textElement.animations);
    expect(pasted.style).toEqual(textElement.style);
  });

  it("duplicates an element directly when Duplikat button is clicked", () => {
    const textElement: Element = {
      id: "el_text_1",
      type: "text",
      name: "Teks Judul",
      frame: { x: 10, y: 15, w: 150, h: 50, rotation: 5 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "The Wedding" }] },
      style: {
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#d97706",
        opacity: 0.95,
      },
    };

    const doc = makeDoc([textElement]);
    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    store.getState().selectElements([textElement.id]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Inspector />
      </EditorProvider>,
    );

    const dupBtn = screen.getByTestId("action-duplicate");
    fireEvent.click(dupBtn);

    const elements = store.getState().history.present.sections[0]!.elements;
    expect(elements).toHaveLength(2);

    const duplicate = elements[1]!;
    expect(duplicate.id).not.toBe(textElement.id);
    expect(duplicate.frame.w).toBe(150);
    expect(duplicate.frame.h).toBe(50);
    expect(duplicate.frame.rotation).toBe(5);
    expect(duplicate.style).toEqual(textElement.style);
    expect(store.getState().selectedIds).toEqual([duplicate.id]);
  });

  it("renders section duplicate and paste buttons in SectionPanel", () => {
    const doc = makeDoc();
    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    // Clear selection and set active section to sec_1
    store.getState().clearSelection();
    store.getState().setActiveSection("sec_1");

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Inspector />
      </EditorProvider>,
    );

    // Open Tindakan Section (default closed)
    fireEvent.click(screen.getByText("Tindakan Section"));

    const secDupBtn = screen.getByTestId("section-duplicate-btn");
    const secPasteBtn = screen.getByTestId("section-paste-btn");

    expect(secDupBtn).toBeInTheDocument();
    expect(secPasteBtn).toBeInTheDocument();
    expect(secPasteBtn).toBeDisabled();

    // Click duplicate section
    fireEvent.click(secDupBtn);
    expect(store.getState().history.present.sections).toHaveLength(3);
  });
});

describe("ContextMenu Component", () => {
  it("renders element context menu with duplicate, copy, paste, reorder, lock, and delete", () => {
    const textElement: Element = {
      id: "el_text_1",
      type: "text",
      frame: { x: 10, y: 10, w: 100, h: 30, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Hello" }] },
      style: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000",
        opacity: 1,
      },
    };

    const doc = makeDoc([textElement]);
    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    const handleClose = vi.fn();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <ContextMenu
          isOpen={true}
          x={100}
          y={150}
          canvasX={50}
          canvasY={70}
          sectionId="sec_1"
          elementId="el_text_1"
          onClose={handleClose}
        />
      </EditorProvider>,
    );

    expect(screen.getByTestId("ctx-duplicate")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-copy")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-paste")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-front")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-forward")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-backward")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-back")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-lock")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-hide")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-delete")).toBeInTheDocument();

    // Click Duplikat from ContextMenu
    fireEvent.click(screen.getByTestId("ctx-duplicate"));
    expect(handleClose).toHaveBeenCalled();
  });

  it("renders empty canvas context menu with paste, duplicate section, and add section", () => {
    const doc = makeDoc();
    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    const handleClose = vi.fn();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <ContextMenu
          isOpen={true}
          x={200}
          y={250}
          canvasX={120}
          canvasY={180}
          sectionId="sec_1"
          elementId={undefined}
          onClose={handleClose}
        />
      </EditorProvider>,
    );

    expect(screen.getByTestId("ctx-paste-section")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-duplicate-section")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-add-section")).toBeInTheDocument();
  });
});

