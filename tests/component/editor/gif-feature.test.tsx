import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { GifLibrary } from "@/features/editor/components/gif/GifLibrary";
import { LeftPanel } from "@/features/editor/components/LeftPanel";
import { createEditorStore } from "@/features/editor/core/store";
import { createImageElement } from "@/features/editor/core/ops";
import { resolveDocument } from "@/lib/engine/resolve-document";
import type { CanonicalDocument } from "@/lib/schema";

const mockSavedGifs = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    filename: "cinta-abadi.gif",
    mimeType: "image/gif",
    bytes: 2048,
    width: 250,
    height: 250,
    createdAt: new Date("2026-03-01T00:00:00Z"),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    filename: "sparkles.gif",
    mimeType: "image/gif",
    bytes: 4096,
    width: 300,
    height: 300,
    createdAt: new Date("2026-03-02T00:00:00Z"),
  },
];

const mockPhotos = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    filename: "prewedding.jpg",
    mimeType: "image/jpeg",
    bytes: 50000,
    width: 1200,
    height: 800,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
];

vi.mock("@/features/assets/actions", () => ({
  listAssetsAction: vi.fn(async () => ({
    ok: true,
    data: [...mockPhotos, ...mockSavedGifs],
  })),
  initUploadAction: vi.fn(),
  finalizeUploadAction: vi.fn(),
  saveAssetFromUrlAction: vi.fn(async (_ws: string, _url: string, filename?: string) => ({
    ok: true,
    data: {
      id: "55555555-5555-4555-8555-555555555555",
      filename: filename || "imported.gif",
      mimeType: "image/gif",
      bytes: 8192,
      width: 240,
      height: 240,
      createdAt: new Date(),
    },
  })),
}));

vi.mock("@/features/assets/upload", () => ({
  uploadAssetFile: vi.fn(async (_ws: string, file: File) => ({
    ok: true,
    asset: {
      id: "66666666-6666-4666-8666-666666666666",
      filename: file.name,
      mimeType: "image/gif",
      bytes: file.size,
      width: 280,
      height: 280,
      createdAt: new Date(),
    },
  })),
}));

function createTestDoc(): CanonicalDocument {
  return {
    schemaVersion: 1,
    design: { baseWidth: 390, tokens: { colors: {}, fonts: {}, spacing: {} } },
    variables: [],
    sections: [
      {
        id: "sec_1",
        name: "Cover",
        baseHeight: 600,
        overflow: "hidden",
        visible: true,
        background: { fit: "cover" },
        elements: [],
      },
    ],
  };
}

function setupStore() {
  const store = createEditorStore({
    document: createTestDoc(),
    revision: 1,
  });
  store.setState({ activeSectionId: "sec_1" });
  return store;
}

describe("GIF Feature (Dedicated Animation & Sticker Library)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders GifLibrary with categories and displays presets and saved system GIFs", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <GifLibrary onPick={onPick} />
      </EditorProvider>,
    );

    // Verify category tabs exist
    expect(screen.getByTestId("gif-cat-all")).toBeInTheDocument();
    expect(screen.getByTestId("gif-cat-saved")).toBeInTheDocument();
    expect(screen.getByTestId("gif-cat-love")).toBeInTheDocument();
    expect(screen.getByTestId("gif-cat-flowers")).toBeInTheDocument();
    expect(screen.getByTestId("gif-cat-celebration")).toBeInTheDocument();

    // Verify presets are displayed
    await waitFor(() => {
      expect(screen.getByText("Detak Jantung Cinta")).toBeInTheDocument();
    });

    // Verify saved system GIFs are also listed
    expect(screen.getByText("cinta-abadi.gif")).toBeInTheDocument();
    expect(screen.getByText("sparkles.gif")).toBeInTheDocument();
  });

  it("filters GIFs when clicking category tabs", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <GifLibrary onPick={onPick} />
      </EditorProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("cinta-abadi.gif")).toBeInTheDocument();
    });

    // Click 'Koleksi Tersimpan' tab
    fireEvent.click(screen.getByTestId("gif-cat-saved"));

    // Presets should be hidden, only saved GIFs shown
    expect(screen.queryByText("Mawar Mekar Merah")).not.toBeInTheDocument();
    expect(screen.getByText("cinta-abadi.gif")).toBeInTheDocument();
    expect(screen.getByText("sparkles.gif")).toBeInTheDocument();

    // Click 'Bunga & Daun' tab
    fireEvent.click(screen.getByTestId("gif-cat-flowers"));
    expect(screen.getByText("Mawar Mekar Merah")).toBeInTheDocument();
    expect(screen.queryByText("cinta-abadi.gif")).not.toBeInTheDocument();
  });

  it("searches GIFs by keywords", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <GifLibrary onPick={onPick} />
      </EditorProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Detak Jantung Cinta")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("gif-search-input");
    fireEvent.change(searchInput, { target: { value: "cincin" } });

    expect(screen.getByText("Sepasang Cincin Emas")).toBeInTheDocument();
    expect(screen.queryByText("Mawar Mekar Merah")).not.toBeInTheDocument();
  });

  it("picks a preset and saves it to system then triggers onPick", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <GifLibrary onPick={onPick} />
      </EditorProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Detak Jantung Cinta")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("gif-pick-gif-love-heart-pulse"));
    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: "55555555-5555-4555-8555-555555555555",
        }),
      );
    });
  });

  it("uploads local .gif file, saves to system assets, and calls onPick with assetId", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <GifLibrary onPick={onPick} />
      </EditorProvider>,
    );

    const fileInput = screen.getByTestId("gif-file-input");
    const fakeGifFile = new File(["GIF89a..."], "kembang-api.gif", { type: "image/gif" });

    fireEvent.change(fileInput, { target: { files: [fakeGifFile] } });

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: "66666666-6666-4666-8666-666666666666",
          name: "kembang-api.gif",
        }),
      );
    });
  });

  it("saves GIF from URL into system and inserts it", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <GifLibrary onPick={onPick} />
      </EditorProvider>,
    );

    // Toggle URL form
    fireEvent.click(screen.getByTestId("gif-toggle-url-btn"));
    expect(screen.getByTestId("gif-url-card")).toBeInTheDocument();

    const urlInput = screen.getByTestId("gif-url-input");
    fireEvent.change(urlInput, { target: { value: "https://example.com/magic.gif" } });

    fireEvent.click(screen.getByTestId("gif-submit-url-btn"));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: "55555555-5555-4555-8555-555555555555",
        }),
      );
    });
  });

  it("differentiates GIF from gallery in LeftPanel", async () => {
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <LeftPanel />
      </EditorProvider>,
    );

    // Both sections must exist separately
    expect(screen.getByText("Galeri Foto")).toBeInTheDocument();
    expect(screen.getByText("GIF Animasi & Stiker")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^galeri foto$/i }));

    // Gallery should display only standard photo and exclude gifs
    await waitFor(() => {
      expect(screen.getByText("prewedding.jpg")).toBeInTheDocument();
    });
    // In photo gallery, GIF files should be excluded
    const galleryItems = screen.getByTestId("asset-list");
    expect(galleryItems).not.toHaveTextContent("cinta-abadi.gif");
  });

  it("creates image element with assetId via createImageElement", () => {
    const doc = createTestDoc();
    const resAsset = createImageElement(doc, "sec_1", {
      assetId: "33333333-3333-4333-8333-333333333333",
      width: 250,
      height: 250,
      name: "Saved GIF",
    });
    expect(resAsset.elementId).toBeTruthy();
    const createdElAsset = resAsset.document.sections[0]!.elements[0]!;
    expect(createdElAsset.type).toBe("image");
    expect((createdElAsset as any).source).toEqual({
      assetId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("resolves document image elements with gif assetId source", () => {
    const doc: CanonicalDocument = {
      ...createTestDoc(),
      sections: [
        {
          id: "sec_1",
          baseHeight: 600,
          overflow: "hidden",
          visible: true,
          background: { fit: "cover" },
          elements: [
            {
              id: "el_gif_1",
              type: "image",
              frame: { x: 50, y: 50, w: 200, h: 200, rotation: 0 },
              source: { assetId: "33333333-3333-4333-8333-333333333333" },
              style: {
                fit: "contain",
                focal: { x: 0.5, y: 0.5 },
                radius: 0,
                opacity: 1,
                flipH: false,
                flipV: false,
              },
              visible: true,
              locked: false,
            },
          ],
        },
      ],
    };

    const resolved = resolveDocument(doc);
    expect(resolved.ok).toBe(true);
    const resolvedEl = resolved.sections[0]!.elements[0]!;
    expect(resolvedEl.type).toBe("image");
    expect((resolvedEl as any).image).toEqual({
      assetId: "33333333-3333-4333-8333-333333333333",
    });
  });
});
