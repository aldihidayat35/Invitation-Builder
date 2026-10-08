import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { PhotoFrameImageControl } from "@/features/editor/components/PhotoFrameImageControl";
import { GalleryItemsControl } from "@/features/editor/components/GalleryItemsControl";
import { createEditorStore } from "@/features/editor/core/store";
import { parseFrameImage } from "@/features/widgets/runtime/PhotoFrameWidget";
import { parseGalleryItems } from "@/features/widgets/runtime/GalleryWidget";
import { resolveDocument } from "@/lib/engine/resolve-document";
import type { CanonicalDocument, Element } from "@/lib/schema";

describe("Shape & Gallery Dynamic Image Variables", () => {
  const baseDoc: CanonicalDocument = {
    schemaVersion: 1,
    design: { baseWidth: 390, tokens: { colors: {}, fonts: {}, spacing: {} } },
    variables: [
      {
        key: "couple.bride.photo",
        label: "Foto Mempelai Wanita",
        type: "url",
        required: false,
        default: "https://example.com/bride-default.jpg",
      },
      {
        key: "media.gallery1",
        label: "Galeri Utama",
        type: "url",
        required: false,
        default: "https://example.com/gallery1-default.jpg",
      },
    ],
    sections: [
      {
        id: "sec_1",
        name: "Section 1",
        baseHeight: 844,
        background: { color: "#ffffff", fit: "cover" },
        overflow: "hidden",
        visible: true,
        elements: [],
      },
    ],
  };

  describe("PhotoFrameImageControl (Shape & PhotoFrame)", () => {
    it("switches to Variabel Dinamis tab and binds to an existing variable", () => {
      const store = createEditorStore({ document: baseDoc, revision: 1 });
      let currentVal: unknown = undefined;

      const { rerender } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <PhotoFrameImageControl
            value={currentVal}
            disabled={false}
            onChange={(v) => {
              currentVal = v;
            }}
          />
        </EditorProvider>,
      );

      // Default tab is static
      expect(screen.getByTestId("photo-mode-static")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("photo-frame-pick-btn")).toBeInTheDocument();

      // Click "Variabel Dinamis"
      fireEvent.click(screen.getByTestId("photo-mode-variable"));
      expect(screen.getByTestId("photo-mode-variable")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("photo-variable-controls")).toBeInTheDocument();

      // Select variable
      const select = screen.getByTestId("photo-frame-var-select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "couple.bride.photo" } });

      expect(currentVal).toEqual({ bind: "couple.bride.photo" });

      // Rerender with bound value
      rerender(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <PhotoFrameImageControl
            value={currentVal}
            disabled={false}
            onChange={(v) => {
              currentVal = v;
            }}
          />
        </EditorProvider>,
      );

      expect(screen.getByText("couple.bride.photo")).toBeInTheDocument();
      expect(screen.getByTestId("photo-frame-unbind-btn")).toBeInTheDocument();

      // Unbind
      fireEvent.click(screen.getByTestId("photo-frame-unbind-btn"));
      expect(currentVal).toBeUndefined();
    });

    it("creates a new image variable and automatically binds to it", () => {
      const store = createEditorStore({ document: baseDoc, revision: 1 });
      let currentVal: unknown = undefined;

      render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <PhotoFrameImageControl
            value={currentVal}
            disabled={false}
            onChange={(v) => {
              currentVal = v;
            }}
          />
        </EditorProvider>,
      );

      fireEvent.click(screen.getByTestId("photo-mode-variable"));
      fireEvent.click(screen.getByTestId("photo-start-create-var"));

      const input = screen.getByTestId("photo-new-var-input");
      fireEvent.change(input, { target: { value: "photo.customFrame" } });
      fireEvent.click(screen.getByTestId("photo-create-var-submit"));

      // Variable is added to doc
      expect(store.getState().history.present.variables.some((v) => v.key === "photo.customFrame")).toBe(true);
      // And bound
      expect(currentVal).toEqual({ bind: "photo.customFrame" });
    });
  });

  describe("GalleryItemsControl (Gallery Widget)", () => {
    it("adds a bound variable to gallery items via the header button", () => {
      const store = createEditorStore({ document: baseDoc, revision: 1 });
      let galleryItemsState: unknown[] = [];

      render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <GalleryItemsControl
            elementId="gal_1"
            value={galleryItemsState}
            disabled={false}
            onChange={(items) => {
              galleryItemsState = [...items];
            }}
          />
        </EditorProvider>,
      );

      // Click "+ Variabel"
      fireEvent.click(screen.getByTestId("gallery-add-variable-btn"));
      expect(screen.getByTestId("gallery-variable-picker")).toBeInTheDocument();

      // Select existing variable
      const select = screen.getByTestId("gallery-var-select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "media.gallery1" } });
      fireEvent.click(screen.getByTestId("gallery-add-var-submit"));

      expect(galleryItemsState).toHaveLength(1);
      expect((galleryItemsState[0] as { bind: string }).bind).toBe("media.gallery1");
    });

    it("toggles an item between static and variable", () => {
      const store = createEditorStore({ document: baseDoc, revision: 1 });
      let galleryItemsState: unknown[] = [{ src: "https://example.com/static1.jpg", alt: "Static" }];

      const { rerender } = render(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <GalleryItemsControl
            elementId="gal_1"
            value={galleryItemsState}
            disabled={false}
            onChange={(items) => {
              galleryItemsState = [...items];
            }}
          />
        </EditorProvider>,
      );

      // Click "Variabel" on the first item
      fireEvent.click(screen.getByTestId("gallery-bind-btn-0"));
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "media.gallery1" } });

      expect((galleryItemsState[0] as { bind: string }).bind).toBe("media.gallery1");

      // Rerender with bound state
      rerender(
        <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
          <GalleryItemsControl
            elementId="gal_1"
            value={galleryItemsState}
            disabled={false}
            onChange={(items) => {
              galleryItemsState = [...items];
            }}
          />
        </EditorProvider>,
      );

      // Unbind ("Jadikan Statis")
      fireEvent.click(screen.getByTestId("gallery-unbind-btn-0"));
      expect((galleryItemsState[0] as { bind?: string }).bind).toBeUndefined();
    });
  });

  describe("Runtime & Resolver", () => {
    it("parseFrameImage resolves variable default when bound", () => {
      const bound = { bind: "couple.bride.photo" };
      const resolved = parseFrameImage(bound, baseDoc.variables);
      expect(resolved).toBe("https://example.com/bride-default.jpg");
    });

    it("parseGalleryItems resolves variable defaults and keeps bind tag", () => {
      const items = [{ bind: "media.gallery1", alt: "Galeri 1" }];
      const parsed = parseGalleryItems(items, baseDoc.variables);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.src).toBe("https://example.com/gallery1-default.jpg");
      expect(parsed[0]?.bind).toBe("media.gallery1");
    });

    it("resolveDocument resolves bound widget props including gallery array items", () => {
      const galleryElement: Element = {
        id: "gal_1",
        type: "widget",
        name: "Galeri",
        frame: { x: 0, y: 0, w: 300, h: 300, rotation: 0 },
        visible: true,
        locked: false,
        widgetType: "gallery",
        widgetVersion: 1,
        style: {},
        props: {
          items: [{ bind: "media.gallery1", alt: "Test" }],
        },
      };

      const docWithWidget: CanonicalDocument = {
        ...baseDoc,
        sections: [
          {
            ...baseDoc.sections[0]!,
            elements: [galleryElement],
          },
        ],
      };

      const resolved = resolveDocument(docWithWidget, {
        "media.gallery1": "https://example.com/resolved-gallery.jpg",
      });

      const resolvedProps = (resolved.sections[0]!.elements[0] as unknown as { props: { items: { src: string }[] } }).props;
      expect(resolvedProps.items[0]?.src).toBe("https://example.com/resolved-gallery.jpg");
    });
  });
});
