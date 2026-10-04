import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { Inspector } from "@/features/editor/components/Inspector";
import { createEditorStore } from "@/features/editor/core/store";
import type { CanonicalDocument, Element } from "@/lib/schema";

const { assets } = vi.hoisted(() => ({
  assets: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      filename: "momen-pertama.jpg",
      mimeType: "image/jpeg",
      bytes: 1200,
      width: 800,
      height: 600,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      filename: "momen-kedua.png",
      mimeType: "image/png",
      bytes: 1400,
      width: 600,
      height: 800,
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
  ],
}));

vi.mock("@/features/assets/actions", () => ({
  listAssetsAction: vi.fn(async () => ({ ok: true, data: assets })),
  initUploadAction: vi.fn(),
  finalizeUploadAction: vi.fn(),
}));

vi.mock("@/features/assets/upload", () => ({
  uploadAssetFile: vi.fn(async (_workspaceId: string, file: File) => ({
    ok: true,
    asset: file.name.includes("kedua") ? assets[1] : assets[0],
  })),
}));

function setupGallery(items: readonly Record<string, string>[] = []) {
  const element: Element = {
    id: "el_gallery_1",
    type: "widget",
    name: "Galeri",
    frame: { x: 20, y: 30, w: 326, h: 320, rotation: 0 },
    visible: true,
    locked: false,
    widgetType: "gallery",
    widgetVersion: 1,
    style: { variant: "editorial-collage" },
    props: { title: "Galeri", layout: "grid", items: [...items] },
  };
  const document: CanonicalDocument = {
    schemaVersion: 1,
    design: { baseWidth: 390, tokens: { colors: {}, fonts: {}, spacing: {} } },
    variables: [],
    sections: [
      {
        id: "sec_1",
        name: "Galeri",
        baseHeight: 844,
        background: { color: "#ffffff", fit: "cover" },
        overflow: "hidden",
        visible: true,
        elements: [element],
      },
    ],
  };
  const store = createEditorStore({ document, revision: 1 });
  store.getState().selectElements([element.id]);
  render(
    <EditorProvider store={store} autosaver={null} workspaceId="ws_gallery">
      <Inspector />
    </EditorProvider>,
  );
  return store;
}

function galleryItems(store: ReturnType<typeof createEditorStore>) {
  const element = store.getState().history.present.sections[0]?.elements[0];
  if (!element || element.type !== "widget") throw new Error("Gallery widget missing");
  return element.props.items as Record<string, unknown>[];
}

describe("gallery inspector items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds an asset from the right panel and keeps the change undoable", async () => {
    const store = setupGallery();

    expect(screen.getByTestId("gallery-items-control")).toHaveTextContent("Galeri masih kosong");
    fireEvent.click(screen.getByTestId("gallery-add-images"));

    const choices = await screen.findAllByTestId("gallery-el_gallery_1-item");
    fireEvent.click(choices[0]!);

    expect(galleryItems(store)).toEqual([
      {
        assetId: assets[0]!.id,
        alt: "momen pertama",
      },
    ]);
    expect(screen.getByLabelText("Teks alternatif foto 1")).toHaveValue("momen pertama");

    store.getState().undo();
    await waitFor(() => expect(galleryItems(store)).toEqual([]));
  });

  it("edits alt text, reorders, and removes gallery images", () => {
    const store = setupGallery([
      { assetId: assets[0]!.id, alt: "Pertama" },
      { assetId: assets[1]!.id, alt: "Kedua" },
    ]);

    fireEvent.change(screen.getByLabelText("Teks alternatif foto 1"), {
      target: { value: "Foto pembuka" },
    });
    fireEvent.blur(screen.getByLabelText("Teks alternatif foto 1"));
    expect(galleryItems(store)[0]?.alt).toBe("Foto pembuka");

    fireEvent.click(screen.getByRole("button", { name: "Turunkan foto 1" }));
    expect(galleryItems(store).map((item) => item.assetId)).toEqual([assets[1]!.id, assets[0]!.id]);

    fireEvent.click(screen.getByRole("button", { name: "Hapus foto 1" }));
    expect(galleryItems(store)).toHaveLength(1);
    expect(galleryItems(store)[0]?.assetId).toBe(assets[0]!.id);
  });

  it("adds every file from one multiple upload", async () => {
    const store = setupGallery();
    fireEvent.click(screen.getByTestId("gallery-add-images"));

    const input = await screen.findByTestId("gallery-el_gallery_1-file");
    fireEvent.change(input, {
      target: {
        files: [
          new File(["first"], "momen-pertama.jpg", { type: "image/jpeg" }),
          new File(["second"], "momen-kedua.png", { type: "image/png" }),
        ],
      },
    });

    await waitFor(() => expect(galleryItems(store)).toHaveLength(2));
    expect(galleryItems(store).map((item) => item.assetId)).toEqual([assets[0]!.id, assets[1]!.id]);
  });
});
