import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadPortalAudioClient } from "@/app/(public)/c/[code]/components/portal-audio-uploader";
import { uploadPortalAudioAssetAction } from "@/app/(public)/c/[code]/actions";

vi.mock("@/app/(public)/c/[code]/actions", () => ({
  uploadPortalAudioAssetAction: vi.fn().mockResolvedValue({
    ok: false,
    error: "Minified React error #441",
  }),
}));

describe("uploadPortalAudioClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uploads audio file via /api/portal/upload-audio route handler", async () => {
    const mockFile = new File(["dummy audio content"], "wedding_song.mp3", {
      type: "audio/mpeg",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          assetId: "mock-asset-123",
          url: "/api/assets/mock-asset-123/file",
          filename: "wedding_song.mp3",
        },
      }),
    });

    const result = await uploadPortalAudioClient("token_abc123", mockFile);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/portal/upload-audio",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.data?.url).toBe("/api/assets/mock-asset-123/file");
  });

  it("handles 413 Payload Too Large gracefully with friendly Indonesian message", async () => {
    const largeFile = new File([new ArrayBuffer(100)], "heavy_track.mp3", {
      type: "audio/mpeg",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ ok: false, error: "Payload Too Large" }),
    });

    const result = await uploadPortalAudioClient("token_abc123", largeFile);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("20MB");
  });

  it("sanitizes Minified React error messages into human-friendly Indonesian text", async () => {
    const testFile = new File(["dummy content"], "track.mp3", { type: "audio/mpeg" });

    // Mock fetch failure that throws Minified React error
    global.fetch = vi.fn().mockRejectedValue(
      new Error("Minified React error #441; visit https://react.dev/errors/441..."),
    );

    const result = await uploadPortalAudioClient("token_abc123", testFile);
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain("Minified React error");
    expect(result.error).toContain("Gagal mengunggah berkas musik");
  });
});
