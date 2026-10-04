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
});
