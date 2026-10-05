/**
 * Component and Unit tests for Artboard Grid / Wrap Mode (Tampilan Section Sejajar).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TopBar } from "@/features/editor/components/TopBar";
import { Artboard } from "@/features/editor/components/Artboard";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import {
  createEditorStore,
  ARTBOARD_MODE_STORAGE_KEY,
  getInitialArtboardMode,
} from "@/features/editor/core/store";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

describe("Artboard Grid / Wrap Mode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(initialMode?: "cards" | "seamless" | "grid") {
    const rawDoc = fullDocument();
    const doc: CanonicalDocument = canonicalDocumentSchema.parse(rawDoc);
    const store = createEditorStore({
      document: doc,
      revision: 1,
      artboardMode: initialMode,
    });
    const currentRevision = vi.fn().mockResolvedValue(1);

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <TopBar
          templateId="tmpl_grid_test"
          templateName="Wedding Invitation"
          currentRevision={currentRevision}
        />
        <Artboard />
      </EditorProvider>,
    );

    return { ...utils, store, doc };
  }

  it("initializes with default mode or provided artboardMode and updates store on setArtboardMode", () => {
    expect(getInitialArtboardMode()).toBe("cards");

    localStorage.setItem(ARTBOARD_MODE_STORAGE_KEY, "grid");
    expect(getInitialArtboardMode()).toBe("grid");

    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);
    const store = createEditorStore({ document: doc, revision: 1 });
    expect(store.getState().artboardMode).toBe("grid");

    store.getState().setArtboardMode("cards");
    expect(store.getState().artboardMode).toBe("cards");
    expect(localStorage.getItem(ARTBOARD_MODE_STORAGE_KEY)).toBe("cards");

    store.getState().setArtboardMode("seamless");
    expect(store.getState().artboardMode).toBe("seamless");
    expect(localStorage.getItem(ARTBOARD_MODE_STORAGE_KEY)).toBe("seamless");
  });

  it("renders the 3 mode buttons in TopBar and switches to Sejajar (grid) mode on click", () => {
    const { store } = setup("cards");

    const cardsBtn = screen.getByTestId("artboard-mode-cards");
    const seamlessBtn = screen.getByTestId("artboard-mode-seamless");
    const gridBtn = screen.getByTestId("artboard-mode-grid");

    expect(cardsBtn).toBeInTheDocument();
    expect(seamlessBtn).toBeInTheDocument();
    expect(gridBtn).toBeInTheDocument();

    expect(cardsBtn).toHaveAttribute("data-active", "true");
    expect(gridBtn).toHaveAttribute("data-active", "false");

    fireEvent.click(gridBtn);

    expect(store.getState().artboardMode).toBe("grid");
    expect(gridBtn).toHaveAttribute("data-active", "true");
    expect(cardsBtn).toHaveAttribute("data-active", "false");
  });

  it("renders Artboard in grid mode with left/right reorder buttons and add-section-grid card", () => {
    const { store, doc } = setup("grid");

    const artboardEl = screen.getByTestId("artboard");
    const innerContainer = artboardEl.querySelector("[data-mode]");
    expect(innerContainer).toHaveAttribute("data-mode", "grid");

    // In grid mode, the reorder buttons should show ◀ and ▶
    const firstSectionId = doc.sections[0]!.id;
    const secondSectionId = doc.sections[1]!.id;

    const upBtn = screen.getByTestId(`section-up-${firstSectionId}`);
    const downBtn = screen.getByTestId(`section-down-${firstSectionId}`);

    expect(upBtn).toHaveTextContent("◀");
    expect(downBtn).toHaveTextContent("▶");
    expect(upBtn).toHaveAttribute("aria-label", "Pindah section ke kiri");
    expect(downBtn).toHaveAttribute("aria-label", "Pindah section ke kanan");

    // Reordering works in grid mode
    expect(store.getState().history.present.sections[0]!.id).toBe(firstSectionId);
    fireEvent.click(downBtn);
    expect(store.getState().history.present.sections[0]!.id).toBe(secondSectionId);

    // Dedicated Add Section Grid card should be present
    const addGridBtn = screen.getByTestId("add-section-grid");
    expect(addGridBtn).toBeInTheDocument();
    expect(addGridBtn).toHaveTextContent("Tambah Section Baru");

    const initialCount = store.getState().history.present.sections.length;
    fireEvent.click(addGridBtn);
    expect(store.getState().history.present.sections.length).toBe(initialCount + 1);
  });
});
