/**
 * Component test: Editor Real Preview Button & TemplateRealPreview page.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TopBar } from "@/features/editor/components/TopBar";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { TemplateRealPreview } from "@/features/editor/components/TemplateRealPreview";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

describe("Editor Header Real Preview Feature", () => {
  function renderTopBar(doc: CanonicalDocument, templateId = "tmpl_123") {
    const store = createEditorStore({ document: doc, revision: 1 });
    const currentRevision = vi.fn().mockResolvedValue(1);

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <TopBar
          templateId={templateId}
          templateName="Rustic Floral Wedding"
          currentRevision={currentRevision}
        />
      </EditorProvider>,
    );

    return { ...utils, store };
  }

  it("renders the preview button next to save status in TopBar", () => {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);

    renderTopBar(doc);

    const saveStatus = screen.getByTestId("save-status");
    const previewBtn = screen.getByTestId("editor-preview-btn");

    expect(saveStatus).toBeInTheDocument();
    expect(previewBtn).toBeInTheDocument();
    expect(previewBtn).toHaveTextContent("Preview");
  });

  it("clicks preview button, caches draft in localStorage, and opens preview in new tab", () => {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    renderTopBar(doc, "tmpl_romantic");

    const previewBtn = screen.getByTestId("editor-preview-btn");
    fireEvent.click(previewBtn);

    expect(setItemSpy).toHaveBeenCalledWith(
      "dib_preview_doc_tmpl_romantic",
      expect.any(String),
    );
    expect(openSpy).toHaveBeenCalledWith("/editor/tmpl_romantic/preview", "_blank");

    openSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("renders TemplateRealPreview stage with back link, controls, and DocumentRenderer", () => {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);

    render(
      <TemplateRealPreview
        templateId="tmpl_romantic"
        templateName="Rustic Floral Wedding"
        initialDocument={doc}
      />,
    );

    // Header elements
    expect(screen.getByTestId("preview-back-editor")).toBeInTheDocument();
    expect(screen.getByText("Rustic Floral Wedding")).toBeInTheDocument();
    expect(screen.getByTestId("preview-view-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("preview-view-full")).toBeInTheDocument();
    expect(screen.getByTestId("preview-replay-btn")).toBeInTheDocument();

    // Device shell & Renderer root
    const deviceShell = screen.getByTestId("preview-device-shell");
    expect(deviceShell).toBeInTheDocument();
    expect(deviceShell).toHaveAttribute("data-view", "mobile");

    // Switch view mode
    fireEvent.click(screen.getByTestId("preview-view-full"));
    expect(deviceShell).toHaveAttribute("data-view", "full");

    // Replay click
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    fireEvent.click(screen.getByTestId("preview-replay-btn"));
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    scrollSpy.mockRestore();
  });

  it("hides navbar by default and toggles visibility via floating trigger and close button", () => {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);

    render(
      <TemplateRealPreview
        templateId="tmpl_romantic"
        templateName="Rustic Floral Wedding"
        initialDocument={doc}
      />,
    );

    // Default: floating trigger visible
    const openBtn = screen.getByTestId("preview-open-navbar-btn");
    expect(openBtn).toBeInTheDocument();
    expect(openBtn).toHaveTextContent("Kontrol Preview");

    // Klik tombol trigger -> navbar terbuka, tombol tutup muncul
    fireEvent.click(openBtn);
    const closeBtn = screen.getByTestId("preview-close-navbar-btn");
    expect(closeBtn).toBeInTheDocument();

    // Klik tombol tutup -> navbar tertutup dan tombol open muncul kembali
    fireEvent.click(closeBtn);
    expect(screen.getByTestId("preview-open-navbar-btn")).toBeInTheDocument();
  });

  it("locks opening cover inside device shell in preview and provides replay cover button", () => {
    const rawDoc = fullDocument();
    const docWithOpening: CanonicalDocument = canonicalDocumentSchema.parse({
      ...rawDoc,
      sections: [
        {
          id: "sec_0_opening",
          name: "Cover",
          baseHeight: 844,
          overflow: "hidden",
          visible: true,
          isOpening: true,
          elements: [
            {
              id: "el_cov_txt",
              type: "text",
              frame: { x: 0, y: 100, w: 300, h: 50, rotation: 0 },
              visible: true,
              locked: false,
              content: { segments: [{ text: "Undangan Spesial" }] },
              style: {
                fontSize: 20,
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: 0,
                textAlign: "center",
                color: "#000000",
                opacity: 1,
              },
            },
          ],
        },
        ...(rawDoc.sections as any[]),
      ],
    });

    render(
      <TemplateRealPreview
        templateId="tmpl_with_cover"
        templateName="Wedding Invitation"
        initialDocument={docWithOpening}
      />,
    );

    const deviceShell = screen.getByTestId("preview-device-shell");
    expect(deviceShell).toBeInTheDocument();
    // Device shell locks scroll while cover is active
    expect(deviceShell).toHaveAttribute("data-opening-active", "true");

    // Opening cover canvas should be rendered in preview mode
    const openingCover = screen.getByTestId("opening-cover-canvas");
    expect(openingCover).toBeInTheDocument();
    expect(openingCover).toHaveAttribute("data-runtime-mode", "preview");

    // Replay cover button should be present in toolbar
    const replayCoverBtn = screen.getByTestId("preview-replay-cover");
    expect(replayCoverBtn).toBeInTheDocument();
    expect(replayCoverBtn).toHaveTextContent("Ulangi Cover");

    // Replay cover button click dispatches dib:replay-opening
    const replayOpeningSpy = vi.fn();
    window.addEventListener("dib:replay-opening", replayOpeningSpy);
    fireEvent.click(replayCoverBtn);
    expect(replayOpeningSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener("dib:replay-opening", replayOpeningSpy);
  });
});
