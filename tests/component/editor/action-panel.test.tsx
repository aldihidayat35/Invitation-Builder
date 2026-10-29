import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionPanel } from "@/features/editor/components/ActionPanel";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore, selectDocument } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type Element, type Section } from "@/lib/schema";

describe("ActionPanel Inspector Controls", () => {
  function renderWithStore(element: Element, sectionId = "sec_1") {
    const doc = canonicalDocumentSchema.parse({
      schemaVersion: 1,
      sections: [
        {
          id: sectionId,
          name: "Cover Section",
          baseHeight: 844,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [element],
        },
        {
          id: "sec_2",
          name: "Acara & Lokasi",
          baseHeight: 844,
          background: { color: "#f7f7f7", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [],
        },
      ],
    });

    const store = createEditorStore({ document: doc, revision: 1 });

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <ActionPanel element={element} readOnly={false} sectionId={sectionId} />
      </EditorProvider>,
    );

    return { ...utils, store };
  }

  const baseImageElement: Element = {
    id: "el_img_1",
    type: "image",
    frame: { x: 0, y: 0, w: 200, h: 200, rotation: 0 },
    visible: true,
    locked: false,
    source: { assetId: "00000000-0000-0000-0000-000000000000" },
    style: {
      fit: "cover",
      focal: { x: 0.5, y: 0.5 },
      radius: 8,
      opacity: 1,
      flipH: false,
      flipV: false,
    },
  };

  it("renders disabled state by default and toggles on", () => {
    const { store } = renderWithStore(baseImageElement);

    const toggle = screen.getByTestId("element-action-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    // Toggle on
    fireEvent.click(toggle);

    const updatedDoc = selectDocument(store.getState());
    const targetEl = updatedDoc.sections[0]?.elements[0];
    expect(targetEl?.action).toBeDefined();
    expect(targetEl?.action?.type).toBe("url");
  });

  it("switches action type to scroll_to_section and selects target section", () => {
    const elementWithAction: Element = {
      ...baseImageElement,
      action: {
        type: "url",
        url: "https://example.com",
        target: "_blank",
        hoverEffect: "scale",
      },
    };

    const { store } = renderWithStore(elementWithAction);

    const typeSelect = screen.getByLabelText(/Tipe Aksi Tombol/i);
    fireEvent.change(typeSelect, { target: { value: "scroll_to_section" } });

    const updatedDoc = selectDocument(store.getState());
    const targetEl = updatedDoc.sections[0]?.elements[0];
    expect(targetEl?.action?.type).toBe("scroll_to_section");
    expect(targetEl?.action?.sectionId).toBe("sec_1");
  });

  it("toggles off to remove action completely", () => {
    const elementWithAction: Element = {
      ...baseImageElement,
      action: {
        type: "open_invitation",
        hoverEffect: "opacity",
        target: "_blank",
      },
    };

    const { store } = renderWithStore(elementWithAction);

    const toggle = screen.getByTestId("element-action-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);

    const updatedDoc = selectDocument(store.getState());
    const targetEl = updatedDoc.sections[0]?.elements[0];
    expect(targetEl?.action).toBeUndefined();
  });
});
