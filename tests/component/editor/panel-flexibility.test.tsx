import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createEditorStore } from "@/features/editor/core/store";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { LeftPanel } from "@/features/editor/components/LeftPanel";
import { Inspector } from "@/features/editor/components/Inspector";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

function createTestDoc(): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    variables: [],
    design: {
      tokens: {
        colors: { primary: "#4f46e5" },
      },
    },
    sections: [
      {
        id: "sec_1",
        name: "Section Utama",
        visible: true,
        baseHeight: 800,
        background: { color: "#ffffff" },
        overflow: "hidden",
        elements: [
          {
            id: "el_img_1",
            name: "Gambar 1",
            type: "image",
            visible: true,
            locked: false,
            frame: { x: 20, y: 30, w: 200, h: 200, rotation: 0 },
            style: { opacity: 1, fit: "cover", radius: 0 },
            source: { assetId: "a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5" },
          },
          {
            id: "el_img_2",
            name: "Gambar 2",
            type: "image",
            visible: true,
            locked: false,
            frame: { x: 50, y: 60, w: 220, h: 220, rotation: 0 },
            style: { opacity: 1, fit: "cover", radius: 0 },
            source: { assetId: "a2a2a2a2-b2b2-4c3c-8d4d-e5e5e5e5e5e5" },
          },
        ],
      },
    ],
  });
}

describe("Panel Flexibility and Collapse State", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Initial Collapsed State and Selection Reset", () => {
    it("LeftPanel starts with all groups closed initially", () => {
      const doc = createTestDoc();
      const store = createEditorStore({ document: doc, revision: 1 });
      store.getState().setActiveSection("sec_1");

      const { container } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <LeftPanel />
        </EditorProvider>,
      );

      const sectionKeys = [
        "left-elements",
        "left-widgets",
        "left-media",
        "left-gif",
        "left-base-bg",
        "left-layers",
      ];

      for (const key of sectionKeys) {
        const sec = container.querySelector(`section[data-section-key="${key}"]`);
        expect(sec).not.toBeNull();
        expect(sec).toHaveAttribute("data-open", "false");
        const toggleBtn = sec!.querySelector("button[aria-expanded]");
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      }
    });

    it("Inspector starts with all groups closed when an element is clicked, and automatically resets to closed when switching to another element", () => {
      const doc = createTestDoc();
      const store = createEditorStore({ document: doc, revision: 1 });
      store.getState().setActiveSection("sec_1");

      // Select Gambar 1
      store.getState().selectElements(["el_img_1"]);

      const { container, rerender } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <Inspector />
        </EditorProvider>,
      );

      // Verify Gambar 1 inspector starts with all groups closed
      const elementSectionKeys = [
        "insp-general",
        "insp-transform",
        "insp-opacity-section",
        "insp-shadow-section",
        "insp-image",
        "insp-animation",
      ];

      for (const key of elementSectionKeys) {
        const sec = container.querySelector(`section[data-section-key="${key}"]`);
        expect(sec).not.toBeNull();
        expect(sec).toHaveAttribute("data-open", "false");
        const toggleBtn = sec!.querySelector("button[aria-expanded]");
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      }

      // User opens "Posisi & ukuran" and "Gambar" on Gambar 1
      const transformSec = container.querySelector('section[data-section-key="insp-transform"]')!;
      const transformBtn = transformSec.querySelector("button[aria-expanded]")!;
      fireEvent.click(transformBtn);

      const imageSec = container.querySelector('section[data-section-key="insp-image"]')!;
      const imageBtn = imageSec.querySelector("button[aria-expanded]")!;
      fireEvent.click(imageBtn);

      expect(transformBtn).toHaveAttribute("aria-expanded", "true");
      expect(transformSec).toHaveAttribute("data-open", "true");
      expect(imageBtn).toHaveAttribute("aria-expanded", "true");
      expect(imageSec).toHaveAttribute("data-open", "true");

      // Now switch selection to Gambar 2
      store.getState().selectElements(["el_img_2"]);

      rerender(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <Inspector />
        </EditorProvider>,
      );

      // On Gambar 2, groups MUST AUTOMATICALLY BE CLOSED!
      for (const key of elementSectionKeys) {
        const sec = container.querySelector(`section[data-section-key="${key}"]`);
        expect(sec).not.toBeNull();
        expect(sec).toHaveAttribute("data-open", "false");
        const toggleBtn = sec!.querySelector("button[aria-expanded]");
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      }
    });
  });

  describe("Drag and Drop / Reordering Flexibility", () => {
    it("LeftPanel groups can be reordered (e.g. Widget placed first) and order is persisted", () => {
      const doc = createTestDoc();
      const store = createEditorStore({ document: doc, revision: 1 });
      store.getState().setActiveSection("sec_1");

      const { container } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <LeftPanel />
        </EditorProvider>,
      );

      // Initially, left-elements is before left-widgets
      const sectionsBefore = container.querySelectorAll("section[data-section-key]");
      expect(sectionsBefore[0]).toHaveAttribute("data-section-key", "left-elements");
      expect(sectionsBefore[1]).toHaveAttribute("data-section-key", "left-widgets");

      // Reorder using move-up button on left-widgets
      const moveUpBtn = screen.getByTestId("section-move-up-left-widgets");
      fireEvent.click(moveUpBtn);

      // Now left-widgets is first!
      const sectionsAfter = container.querySelectorAll("section[data-section-key]");
      expect(sectionsAfter[0]).toHaveAttribute("data-section-key", "left-widgets");
      expect(sectionsAfter[1]).toHaveAttribute("data-section-key", "left-elements");

      // Verify localStorage was updated
      const stored = localStorage.getItem("dib:left-panel-section-order");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed[0]).toBe("left-widgets");
      expect(parsed[1]).toBe("left-elements");
    });

    it("Inspector groups can be reordered via drag-and-drop / move buttons and order persists", () => {
      const doc = createTestDoc();
      const store = createEditorStore({ document: doc, revision: 1 });
      store.getState().setActiveSection("sec_1");
      store.getState().selectElements(["el_img_1"]);

      const { container } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <Inspector />
        </EditorProvider>,
      );

      // Initially: insp-general, insp-transform, insp-content, etc.
      const sectionsBefore = container.querySelectorAll("section[data-section-key]");
      expect(sectionsBefore[0]).toHaveAttribute("data-section-key", "insp-general");
      expect(sectionsBefore[1]).toHaveAttribute("data-section-key", "insp-transform");

      // Move insp-transform up above insp-general
      const moveUpBtn = screen.getByTestId("section-move-up-insp-transform");
      fireEvent.click(moveUpBtn);

      const sectionsAfter = container.querySelectorAll("section[data-section-key]");
      expect(sectionsAfter[0]).toHaveAttribute("data-section-key", "insp-transform");
      expect(sectionsAfter[1]).toHaveAttribute("data-section-key", "insp-general");

      // Verify localStorage was saved
      const stored = localStorage.getItem("dib:element-inspector-order");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed[0]).toBe("insp-transform");
      expect(parsed[1]).toBe("insp-general");
    });

    it("Drag and drop HTML5 events reorder sections properly", () => {
      const doc = createTestDoc();
      const store = createEditorStore({ document: doc, revision: 1 });
      store.getState().setActiveSection("sec_1");

      const mockRect = {
        top: 100,
        bottom: 200,
        height: 100,
        left: 0,
        right: 200,
        width: 200,
        x: 0,
        y: 100,
        toJSON: () => {},
      };
      Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);
      HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

      const { container } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <LeftPanel />
        </EditorProvider>,
      );

      const gripWidgets = screen.getByTestId("section-grip-left-widgets");

      // Drag start from widgets
      const dataTransfer = {
        data: {} as Record<string, string>,
        setData(format: string, data: string) {
          this.data[format] = data;
        },
        getData(format: string) {
          return this.data[format] || "";
        },
        effectAllowed: "",
        dropEffect: "",
      };

      fireEvent.dragStart(gripWidgets, { dataTransfer });

      // Query sectionElements after dragStart
      const sectionElements = container.querySelector(
        'section[data-section-key="left-elements"]',
      )! as HTMLElement;

      // Drag over top half of left-elements (clientY: 120 < midY: 150 -> placement: "above")
      const dragOverEvent = new Event("dragover", { bubbles: true, cancelable: true });
      Object.defineProperty(dragOverEvent, "clientY", { value: 120 });
      Object.defineProperty(dragOverEvent, "dataTransfer", { value: dataTransfer });
      fireEvent(sectionElements, dragOverEvent);
      expect(sectionElements).toHaveAttribute("data-drop-target", "above");

      // Drop on left-elements
      const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, "dataTransfer", { value: dataTransfer });
      fireEvent(sectionElements, dropEvent);

      // Verify widgets is now before elements
      const sectionsAfter = container.querySelectorAll("section[data-section-key]");
      expect(sectionsAfter[0]).toHaveAttribute("data-section-key", "left-widgets");
      expect(sectionsAfter[1]).toHaveAttribute("data-section-key", "left-elements");
    });
  });
});
