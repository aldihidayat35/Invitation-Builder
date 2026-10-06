/**
 * Component tests for Custom Canvas Opening Screen (Section 0 / Cover Buka Undangan).
 * Tests:
 * 1. Designer-crafted Section 0 elements render within the OpeningCoverCanvas overlay.
 * 2. Clicking screen triggers exit animation, audio gesture dispatch, and Section 1 entrance animation trigger.
 * 3. Section 0 toggle and addOpeningSection ops in editor store.
 * 4. Section numbering in Artboard (#0 OPENING vs #1).
 */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";
import { resolveDocument } from "@/lib/engine";
import { DocumentRenderer } from "@/features/renderer";
import { PublicContextProvider } from "@/features/widgets/runtime";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { Artboard } from "@/features/editor/components/Artboard";
import { Inspector } from "@/features/editor/components/Inspector";
import { createEditorStore } from "@/features/editor/core/store";

function makeDocWithCanvasOpening(hasOpening = true): CanonicalDocument {
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
        id: "sec_0_opening",
        name: "Cover Opening",
        baseHeight: 844,
        overflow: "hidden",
        visible: true,
        isOpening: hasOpening,
        background: { color: "#111827" },
        elements: [
          {
            id: "el_cover_title",
            type: "text",
            frame: { x: 20, y: 150, w: 350, h: 60, rotation: 0 },
            visible: true,
            locked: false,
            content: { segments: [{ text: "The Wedding of Romeo & Juliet" }] },
            style: {
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: 0,
              textAlign: "center",
              color: "#ffffff",
              opacity: 1,
            },
          },
        ],
      },
      {
        id: "sec_1_content",
        name: "Mempelai & Sambutan",
        baseHeight: 844,
        overflow: "hidden",
        visible: true,
        isOpening: false,
        background: { color: "#ffffff" },
        elements: [
          {
            id: "el_sec1_heading",
            type: "text",
            frame: { x: 20, y: 50, w: 350, h: 40, rotation: 0 },
            visible: true,
            locked: false,
            content: { segments: [{ text: "Assalamu'alaikum Warahmatullahi Wabarakatuh" }] },
            style: {
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.4,
              letterSpacing: 0,
              textAlign: "center",
              color: "#000000",
              opacity: 1,
            },
          },
        ],
      },
    ],
  });
}

describe("Custom Canvas Opening Screen (Section 0)", () => {
  it("renders Section 0 as the full opening cover canvas overlay with custom elements", () => {
    const doc = makeDocWithCanvasOpening(true);
    const resolved = resolveDocument(doc, {}, { name: "Bapak Joko & Keluarga" });

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Bapak Joko & Keluarga" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.getByTestId("opening-cover-canvas")).toBeInTheDocument();
    expect(screen.getByText("The Wedding of Romeo & Juliet")).toBeInTheDocument();
    expect(screen.getByText("Klik di mana saja untuk membuka undangan")).toBeInTheDocument();
  });

  it("clicking the screen triggers exit animation, audio gesture dispatch, and Section 1 entrance animation", async () => {
    vi.useFakeTimers();
    const doc = makeDocWithCanvasOpening(true);
    const resolved = resolveDocument(doc, {}, { name: "Tamu Kehormatan" });

    const openListener = vi.fn();
    const replayAnimListener = vi.fn();
    window.addEventListener("dib:open-invitation", openListener);
    window.addEventListener("dib:replay-animation", replayAnimListener);

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Tamu Kehormatan" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    const cover = screen.getByTestId("opening-cover-canvas");
    expect(cover).toBeInTheDocument();

    // Click anywhere on cover canvas
    act(() => {
      fireEvent.click(cover);
    });

    expect(openListener).toHaveBeenCalledTimes(1);
    expect(replayAnimListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { sectionId: "sec_1_content" },
      }),
    );

    // Fast-forward exit transition timer (700ms)
    act(() => {
      vi.advanceTimersByTime(750);
    });

    // Opening screen overlay should now be dismissed
    expect(screen.queryByTestId("opening-cover-canvas")).toBeNull();
    // Section 1 content should now be visible
    expect(screen.getByText("Assalamu'alaikum Warahmatullahi Wabarakatuh")).toBeInTheDocument();

    window.removeEventListener("dib:open-invitation", openListener);
    window.removeEventListener("dib:replay-animation", replayAnimListener);
    vi.useRealTimers();
  });

  it("pressing Enter or Space key on opening cover opens the invitation", async () => {
    vi.useFakeTimers();
    const doc = makeDocWithCanvasOpening(true);
    const resolved = resolveDocument(doc);

    render(
      <PublicContextProvider value={{ slug: "test-slug" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    const cover = screen.getByTestId("opening-cover-canvas");
    act(() => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    act(() => {
      vi.advanceTimersByTime(750);
    });

    expect(screen.queryByTestId("opening-cover-canvas")).toBeNull();
    vi.useRealTimers();
  });

  it("does not render opening cover overlay when showOpeningScreen=false or isOpening is false", () => {
    const doc = makeDocWithCanvasOpening(false);
    const resolved = resolveDocument(doc);

    render(
      <PublicContextProvider value={{ slug: "test-slug" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.queryByTestId("opening-cover-canvas")).toBeNull();
    expect(screen.getByText("The Wedding of Romeo & Juliet")).toBeInTheDocument();
    expect(screen.getByText("Assalamu'alaikum Warahmatullahi Wabarakatuh")).toBeInTheDocument();
  });
});

describe("Editor Artboard & Store Section 0 Opening Integration", () => {
  it("displays #0 OPENING badge for opening section and #1 for next section in Artboard", () => {
    const doc = makeDocWithCanvasOpening(true);
    const store = createEditorStore({ document: doc, revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Artboard />
      </EditorProvider>,
    );

    const badge0 = screen.getByTestId("section-badge-sec_0_opening");
    const badge1 = screen.getByTestId("section-badge-sec_1_content");

    expect(badge0).toHaveTextContent("#0 OPENING");
    expect(badge1).toHaveTextContent("#1");
  });

  it("allows toggling section opening status in store and Inspector", () => {
    const doc = makeDocWithCanvasOpening(false);
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().setActiveSection("sec_0_opening");

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Inspector />
      </EditorProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^umum$/i }));

    const toggle = screen.getByTestId("section-opening-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    // Toggle on
    act(() => {
      fireEvent.click(toggle);
    });

    expect(store.getState().history.present.sections[0]?.isOpening).toBe(true);
  });

  it("addOpeningSection creates a new Section 0 at index 0", () => {
    const doc = makeDocWithCanvasOpening(false);
    const store = createEditorStore({ document: doc, revision: 1 });

    act(() => {
      store.getState().addOpeningSection();
    });

    const sections = store.getState().history.present.sections;
    expect(sections[0]?.isOpening).toBe(true);
    expect(sections[0]?.name).toBe("Opening");
  });
});
