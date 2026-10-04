/**
 * Component tests for Image Crop and Remove BG features.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Inspector } from "@/features/editor/components/Inspector";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";

class MockImage {
  onload: (() => void) | null = null;
  width = 400;
  height = 400;
  naturalWidth = 400;
  naturalHeight = 400;
  private _src = "";
  get src() {
    return this._src;
  }
  set src(val: string) {
    this._src = val;
    setTimeout(() => this.onload?.(), 10);
  }
}

describe("Image Crop & Remove BG Integration in Inspector", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", MockImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setupEditorWithImage() {
    const imageElement: Element = {
      id: "el_img_1",
      type: "image",
      frame: { x: 20, y: 30, w: 200, h: 200, rotation: 0 },
      visible: true,
      locked: false,
      source: { assetId: "a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5" },
      style: {
        fit: "cover",
        focal: { x: 0.5, y: 0.5 },
        radius: 0,
        opacity: 1,
        flipH: false,
        flipV: false,
      },
      alt: "Foto mempelai",
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
          name: "Section Utama",
          baseHeight: 844,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [imageElement],
        },
      ],
    };

    const store = createEditorStore({
      document: canonicalDocumentSchema.parse(doc),
      revision: 1,
    });

    store.getState().selectElements(["el_img_1"]);

    return { store };
  }

  it("renders 'Potong (Crop)', 'Flip H', 'Flip V', and 'Hapus BG' buttons when an image is selected", () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const cropBtn = screen.getByTestId("image-crop-btn");
    const flipHBtn = screen.getByTestId("image-flip-h-btn");
    const flipVBtn = screen.getByTestId("image-flip-v-btn");
    const removeBgBtn = screen.getByTestId("image-remove-bg-btn");

    expect(cropBtn).toBeInTheDocument();
    expect(cropBtn).toHaveTextContent("Potong (Crop)");

    expect(flipHBtn).toBeInTheDocument();
    expect(flipHBtn).toHaveTextContent("Flip H");
    expect(flipHBtn).toHaveAttribute("data-active", "false");

    expect(flipVBtn).toBeInTheDocument();
    expect(flipVBtn).toHaveTextContent("Flip V");
    expect(flipVBtn).toHaveAttribute("data-active", "false");

    expect(removeBgBtn).toBeInTheDocument();
    expect(removeBgBtn).toHaveTextContent("Hapus BG");
  });

  it("toggles flipH and flipV styles when flip buttons are clicked", () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const flipHBtn = screen.getByTestId("image-flip-h-btn");
    const flipVBtn = screen.getByTestId("image-flip-v-btn");

    // Click Flip H
    fireEvent.click(flipHBtn);
    let el = store.getState().history.present.sections[0]?.elements[0];
    if (el?.type === "image") {
      expect(el.style.flipH).toBe(true);
    }
    expect(flipHBtn).toHaveAttribute("data-active", "true");

    // Click Flip H again to toggle off
    fireEvent.click(flipHBtn);
    el = store.getState().history.present.sections[0]?.elements[0];
    if (el?.type === "image") {
      expect(el.style.flipH).toBe(false);
    }
    expect(flipHBtn).toHaveAttribute("data-active", "false");

    // Click Flip V
    fireEvent.click(flipVBtn);
    el = store.getState().history.present.sections[0]?.elements[0];
    if (el?.type === "image") {
      expect(el.style.flipV).toBe(true);
    }
    expect(flipVBtn).toHaveAttribute("data-active", "true");
  });

  it("opens ImageCropModal on clicking 'Potong (Crop)' and closes on cancel", async () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const cropBtn = screen.getByTestId("image-crop-btn");
    fireEvent.click(cropBtn);

    // Modal dialog is opened
    const modal = screen.getByTestId("image-crop-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText("Potong Gambar (Crop)")).toBeInTheDocument();

    // Check aspect ratio buttons once image loads
    expect(await screen.findByRole("button", { name: "Bebas" }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1:1 Persegi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4:5 Potret" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "16:9 Lanskap" })).toBeInTheDocument();

    // Cancel button closes the modal
    const cancelBtn = screen.getByRole("button", { name: "Batal" });
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId("image-crop-modal")).not.toBeInTheDocument();
  });

  it("opens RemoveBgModal on clicking 'Hapus BG' and displays controls", async () => {
    const { store } = setupEditorWithImage();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    const removeBgBtn = screen.getByTestId("image-remove-bg-btn");
    fireEvent.click(removeBgBtn);

    // Modal dialog is opened
    const modal = screen.getByTestId("remove-bg-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText("Hapus Latar Belakang (Remove BG)")).toBeInTheDocument();

    // Sliders exist once image loads
    expect(await screen.findByLabelText("Toleransi Warna")).toBeInTheDocument();
    expect(screen.getByLabelText("Kehalusan Tepi (Feather)")).toBeInTheDocument();

    // Backdrop buttons exist
    expect(screen.getByRole("button", { name: "Papan Catur" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gelap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terang" })).toBeInTheDocument();

    // Cancel button closes the modal
    const cancelBtn = screen.getByRole("button", { name: "Batal" });
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId("remove-bg-modal")).not.toBeInTheDocument();
  });
});

