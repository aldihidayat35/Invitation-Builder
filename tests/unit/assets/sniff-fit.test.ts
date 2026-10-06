/**
 * PRD refs: FR-AST-001 (type/dimension derived from bytes), NFR-SEC-002, FR-EDT-008.
 */
import { avifBytes, gifBytes, jpegBytes, pngBytes, webpBytes } from "../../helpers/images";
import { sniffImage } from "@/lib/storage/image-sniff";
import { fitImage, focalToObjectPosition } from "@/lib/image-fit";
import { assetUrl } from "@/features/assets/urls";

describe("sniffImage (FR-AST-001)", () => {
  it.each([
    ["png", pngBytes(640, 480), "image/png"],
    ["jpeg", jpegBytes(640, 480), "image/jpeg"],
    ["webp", webpBytes(640, 480), "image/webp"],
    ["avif", avifBytes(640, 480), "image/avif"],
    ["gif", gifBytes(640, 480), "image/gif"],
  ])("detects %s and reads its dimensions", (_name, bytes, mime) => {
    expect(sniffImage(bytes)).toEqual({ mime, width: 640, height: 480 });
  });

  it("rejects non-images, truncated files and spoofed content", () => {
    expect(sniffImage(new Uint8Array())).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("MZ\u0090\u0000 executable"))).toBeNull();
    expect(sniffImage(pngBytes(10, 10).subarray(0, 12))).toBeNull();
    expect(sniffImage(pngBytes(0, 10))).toBeNull();
  });
});

describe("fitImage / focalToObjectPosition (FR-EDT-008)", () => {
  const focal = { x: 0.5, y: 0.5 };

  it("contain letterboxes and centers", () => {
    const r = fitImage({
      boxWidth: 200,
      boxHeight: 200,
      imageWidth: 400,
      imageHeight: 200,
      fit: "contain",
      focal,
    });
    expect(r.dest).toEqual({ x: 0, y: 50, width: 200, height: 100 });
    expect(r.crop).toEqual({ x: 0, y: 0, width: 400, height: 200 });
  });

  it("cover crops to the box ratio around the focal point, clamped to the image", () => {
    const r = fitImage({
      boxWidth: 100,
      boxHeight: 100,
      imageWidth: 400,
      imageHeight: 200,
      fit: "cover",
      focal: { x: 0, y: 0.5 },
    });
    expect(r.crop).toEqual({ x: 0, y: 0, width: 200, height: 200 });
    const right = fitImage({
      boxWidth: 100,
      boxHeight: 100,
      imageWidth: 400,
      imageHeight: 200,
      fit: "cover",
      focal: { x: 1, y: 0.5 },
    });
    expect(right.crop.x).toBe(200);
  });

  it("is safe for degenerate sizes", () => {
    const r = fitImage({
      boxWidth: 0,
      boxHeight: 0,
      imageWidth: 0,
      imageHeight: 0,
      fit: "cover",
      focal,
    });
    expect(Number.isFinite(r.crop.width)).toBe(true);
  });

  it("maps focal points to CSS object-position", () => {
    expect(focalToObjectPosition({ x: 0.25, y: 1 })).toBe("25% 100%");
    expect(focalToObjectPosition({ x: -1, y: 2 })).toBe("0% 100%");
  });

  it("builds delivery urls only from the asset id", () => {
    expect(assetUrl("abc", { width: 100 })).toBe("/api/assets/abc/file");
  });
});
