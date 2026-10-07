import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { LeftPanel } from "@/features/editor/components/LeftPanel";
import { WidgetPanel } from "@/features/editor/components/WidgetPanel";
import { AssetLibrary } from "@/features/editor/components/AssetLibrary";
import { createEditorStore, selectDocument } from "@/features/editor/core/store";
import type { CanonicalDocument, WidgetElement } from "@/lib/schema";

const mockVideoAsset = {
  id: "99999999-9999-4999-8999-999999999999",
  filename: "wedding-teaser.mp4",
  mimeType: "video/mp4",
  bytes: 5242880,
  width: null,
  height: null,
  createdAt: new Date("2026-03-01T00:00:00Z"),
};

const mockGifAsset = {
  id: "88888888-8888-4888-8888-888888888888",
  filename: "animated-ring.gif",
  mimeType: "image/gif",
  bytes: 20480,
  width: 200,
  height: 200,
  createdAt: new Date("2026-03-02T00:00:00Z"),
};

const mockPhotoAsset = {
  id: "77777777-7777-4777-8777-777777777777",
  filename: "portrait.jpg",
  mimeType: "image/jpeg",
  bytes: 65536,
  width: 800,
  height: 1200,
  createdAt: new Date("2026-03-03T00:00:00Z"),
};

vi.mock("@/features/assets/actions", () => ({
  listAssetsAction: vi.fn(async () => ({
    ok: true,
    data: [mockPhotoAsset, mockVideoAsset, mockGifAsset],
  })),
  initUploadAction: vi.fn(),
  finalizeUploadAction: vi.fn(),
  saveAssetFromUrlAction: vi.fn(),
}));

vi.mock("@/features/assets/upload", () => ({
  uploadAssetFile: vi.fn(async (_ws: string, file: File) => ({
    ok: true,
    asset: {
      id: "12345678-1234-4234-8234-123456789abc",
      filename: file.name,
      mimeType: file.type || "video/mp4",
      bytes: file.size,
      width: null,
      height: null,
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

describe("Media Gallery (Unified Photo, Video & GIF Storage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders AssetLibrary with video and gif badges and filters by tabs", async () => {
    const onPick = vi.fn();
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <AssetLibrary onPick={onPick} pickLabel="Pilih media" />
      </EditorProvider>,
    );

    // Initial state: 'Semua' tab displays all items
    await waitFor(() => {
      expect(screen.getByText("portrait.jpg")).toBeInTheDocument();
      expect(screen.getByText("wedding-teaser.mp4")).toBeInTheDocument();
      expect(screen.getByText("animated-ring.gif")).toBeInTheDocument();
    });

    // Check badges
    expect(screen.getByText("VIDEO")).toBeInTheDocument();
    expect(screen.getAllByText("GIF").length).toBeGreaterThanOrEqual(1);

    // Click 'Video' tab: only video is visible
    fireEvent.click(screen.getByTestId("asset-tab-video"));
    expect(screen.getByText("wedding-teaser.mp4")).toBeInTheDocument();
    expect(screen.queryByText("portrait.jpg")).not.toBeInTheDocument();
    expect(screen.queryByText("animated-ring.gif")).not.toBeInTheDocument();

    // Picking video invokes onPick with the video asset
    fireEvent.click(screen.getByText("wedding-teaser.mp4"));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockVideoAsset.id,
        mimeType: "video/mp4",
      }),
    );
  });

  it("adds Video widget to artboard when clicking video in LeftPanel gallery", async () => {
    const store = setupStore();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <LeftPanel />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByText("Galeri Foto & Media"));

    await waitFor(() => {
      expect(screen.getByText("wedding-teaser.mp4")).toBeInTheDocument();
    });

    // Click on video
    fireEvent.click(screen.getByText("wedding-teaser.mp4"));

    // Check store state: widget of type 'video' added to sec_1
    const elements = selectDocument(store.getState()).sections[0]!.elements;
    expect(elements).toHaveLength(1);
    const added = elements[0] as WidgetElement;
    expect(added.type).toBe("widget");
    expect(added.widgetType).toBe("video");
    expect((added.props as Record<string, unknown>).url).toBe(
      `/api/assets/${mockVideoAsset.id}/file`,
    );
  });

  it("selects video from gallery inside VideoPropsControl inspector", async () => {
    const videoElement: WidgetElement = {
      id: "el_vid_1",
      type: "widget",
      widgetType: "video",
      widgetVersion: 1,
      frame: { x: 30, y: 30, w: 326, h: 220, rotation: 0 },
      props: {
        sourceType: "upload",
        url: "",
      },
      style: { variant: "default" },
      visible: true,
      locked: false,
    };

    const doc = createTestDoc();
    doc.sections[0]!.elements = [videoElement];

    const store = createEditorStore({ document: doc, revision: 1 });
    store.setState({ activeSectionId: "sec_1", selectedIds: ["el_vid_1"] });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <WidgetPanel element={videoElement} readOnly={false} tokens={doc.design.tokens} />
      </EditorProvider>,
    );

    // Open gallery picker
    expect(screen.getByTestId("video-open-gallery-btn")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("video-open-gallery-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("video-asset-library-container")).toBeInTheDocument();
    });

    // Pick video from the gallery
    await waitFor(() => {
      expect(screen.getByText("wedding-teaser.mp4")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("wedding-teaser.mp4"));

    // Check that element url in store was updated with asset url
    const updated = selectDocument(store.getState()).sections[0]!.elements[0] as WidgetElement;
    expect((updated.props as Record<string, unknown>).url).toBe(
      `/api/assets/${mockVideoAsset.id}/file`,
    );
    expect((updated.props as Record<string, unknown>).sourceType).toBe("upload");
  });

  it("uploads video file in VideoPropsControl and stores in workspace assets", async () => {
    const videoElement: WidgetElement = {
      id: "el_vid_1",
      type: "widget",
      widgetType: "video",
      widgetVersion: 1,
      frame: { x: 30, y: 30, w: 326, h: 220, rotation: 0 },
      props: {
        sourceType: "upload",
        url: "",
      },
      style: { variant: "default" },
      visible: true,
      locked: false,
    };

    const doc = createTestDoc();
    doc.sections[0]!.elements = [videoElement];

    const store = createEditorStore({ document: doc, revision: 1 });
    store.setState({ activeSectionId: "sec_1", selectedIds: ["el_vid_1"] });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-123">
        <WidgetPanel element={videoElement} readOnly={false} tokens={doc.design.tokens} />
      </EditorProvider>,
    );

    const uploadBtn = screen.getByTestId("video-upload-file-btn");
    expect(uploadBtn).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"][accept*="video"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const fakeVideoFile = new File(["fake video content"], "highlight-reels.mp4", {
      type: "video/mp4",
    });

    fireEvent.change(fileInput, { target: { files: [fakeVideoFile] } });

    await waitFor(() => {
      const updated = selectDocument(store.getState()).sections[0]!.elements[0] as WidgetElement;
      expect((updated.props as Record<string, unknown>).url).toBe(
        "/api/assets/12345678-1234-4234-8234-123456789abc/file",
      );
      expect((updated.props as Record<string, unknown>).caption).toBe("highlight-reels");
    });
  });
});
