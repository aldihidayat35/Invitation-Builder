import { describe, expect, it } from "vitest";
import { ASSET_LIMITS, assetUploadInitSchema } from "@/lib/schema";

const ok = { filename: "photo.jpg", mimeType: "image/jpeg", bytes: 1000 };

describe("assetUploadInitSchema (FR-AST-001)", () => {
  it("accepts a valid image and audio upload", () => {
    expect(assetUploadInitSchema.safeParse(ok).success).toBe(true);
    expect(
      assetUploadInitSchema.safeParse({ filename: "a.mp3", mimeType: "audio/mpeg", bytes: 5 })
        .success,
    ).toBe(true);
  });

  it("rejects SVG and unknown MIME types", () => {
    expect(
      assetUploadInitSchema.safeParse({ ...ok, filename: "a.svg", mimeType: "image/svg+xml" })
        .success,
    ).toBe(false);
    expect(assetUploadInitSchema.safeParse({ ...ok, mimeType: "text/html" }).success).toBe(false);
  });

  it("rejects extension / MIME mismatch", () => {
    expect(assetUploadInitSchema.safeParse({ ...ok, filename: "x.png" }).success).toBe(false);
    expect(assetUploadInitSchema.safeParse({ ...ok, filename: "noext" }).success).toBe(false);
  });

  it("enforces size limits", () => {
    expect(
      assetUploadInitSchema.safeParse({ ...ok, bytes: ASSET_LIMITS.imageMaxBytes + 1 }).success,
    ).toBe(false);
    expect(assetUploadInitSchema.safeParse({ ...ok, bytes: 0 }).success).toBe(false);
    expect(assetUploadInitSchema.safeParse({ ...ok, bytes: 1.5 }).success).toBe(false);
  });

  it("rejects path separators and unknown keys", () => {
    expect(assetUploadInitSchema.safeParse({ ...ok, filename: "../a.jpg" }).success).toBe(false);
    expect(assetUploadInitSchema.safeParse({ ...ok, filename: "a\\b.jpg" }).success).toBe(false);
    expect(assetUploadInitSchema.safeParse({ ...ok, url: "https://x" }).success).toBe(false);
  });
});
