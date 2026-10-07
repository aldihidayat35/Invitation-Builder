import { describe, expect, it } from "vitest";
import { sniffVideo } from "@/lib/storage/video-sniff";
import { assetKindFromMime, maxBytesForMime, ASSET_LIMITS } from "@/lib/schema";

describe("video-sniff and video asset limits", () => {
  it("recognizes MP4 video container", () => {
    // 4 bytes length, 'ftyp', 'isom'
    const mp4Bytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x69, 0x73, 0x6f, 0x6d, // isom
      0x00, 0x00, 0x02, 0x00,
    ]);
    const res = sniffVideo(mp4Bytes);
    expect(res).not.toBeNull();
    expect(res?.mime).toBe("video/mp4");
  });

  it("recognizes QuickTime / MOV container", () => {
    const movBytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x14,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x71, 0x74, 0x20, 0x20, // qt  
    ]);
    const res = sniffVideo(movBytes);
    expect(res).not.toBeNull();
    expect(res?.mime).toBe("video/quicktime");
  });

  it("recognizes WebM container", () => {
    // EBML header 0x1a 0x45 0xdf 0xa3 followed by 'webm' string
    const webmBytes = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3,
      0x9f, 0x42, 0x86, 0x81,
      0x01, 0x42, 0xf7, 0x81,
      0x01, 0x42, 0xf2, 0x81,
      0x04, 0x42, 0x82, 0x84,
      0x77, 0x65, 0x62, 0x6d, // webm
    ]);
    const res = sniffVideo(webmBytes);
    expect(res).not.toBeNull();
    expect(res?.mime).toBe("video/webm");
  });

  it("rejects non-video files", () => {
    const invalid = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    expect(sniffVideo(invalid)).toBeNull();
  });

  it("derives correct asset kind and max bytes for video", () => {
    expect(assetKindFromMime("video/mp4")).toBe("video");
    expect(assetKindFromMime("video/webm")).toBe("video");
    expect(assetKindFromMime("image/jpeg")).toBe("image");
    expect(assetKindFromMime("image/gif")).toBe("image");
    expect(maxBytesForMime("video/mp4")).toBe(ASSET_LIMITS.videoMaxBytes);
    expect(maxBytesForMime("image/png")).toBe(ASSET_LIMITS.imageMaxBytes);
  });
});
