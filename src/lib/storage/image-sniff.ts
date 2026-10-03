/**
 * Server-side image sniffing (NFR-SEC-002, FR-AST-001). Pure.
 *
 * The client's declared MIME/extension/dimensions are never trusted: the real
 * type is derived from magic bytes and the dimensions from the file header.
 * Supported: JPEG, PNG, WebP, AVIF. SVG is intentionally unsupported (script).
 */
import type { AllowedMimeType } from "@/lib/schema";

export interface SniffedImage {
  readonly mime: Extract<AllowedMimeType, "image/jpeg" | "image/png" | "image/webp" | "image/avif">;
  readonly width: number;
  readonly height: number;
}

const u32be = (b: Uint8Array, o: number) =>
  ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
const u16be = (b: Uint8Array, o: number) => (b[o]! << 8) | b[o + 1]!;
const u24le = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);
const ascii = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));

function sniffPng(b: Uint8Array): SniffedImage | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || !sig.every((v, i) => b[i] === v)) return null;
  if (ascii(b, 12, 4) !== "IHDR") return null;
  return { mime: "image/png", width: u32be(b, 16), height: u32be(b, 20) };
}

function sniffJpeg(b: Uint8Array): SniffedImage | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o += 1;
      continue;
    }
    const marker = b[o + 1]!;
    if (marker === 0xff) {
      o += 1;
      continue;
    }
    // Standalone markers without a length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      o += 2;
      continue;
    }
    const length = u16be(b, o + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { mime: "image/jpeg", height: u16be(b, o + 5), width: u16be(b, o + 7) };
    }
    if (length < 2) return null;
    o += 2 + length;
  }
  return null;
}

function sniffWebp(b: Uint8Array): SniffedImage | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") {
    return { mime: "image/webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = (b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)) >>> 0;
    return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return {
      mime: "image/webp",
      width: (b[26]! | (b[27]! << 8)) & 0x3fff,
      height: (b[28]! | (b[29]! << 8)) & 0x3fff,
    };
  }
  return null;
}

/** AVIF = ISO-BMFF with an `ftyp` brand of avif/avis and an `ispe` property box. */
function sniffAvif(b: Uint8Array): SniffedImage | null {
  if (b.length < 16 || ascii(b, 4, 4) !== "ftyp") return null;
  const brand = ascii(b, 8, 4);
  const compatible = ascii(b, 16, Math.max(0, Math.min(u32be(b, 0) - 16, 64)));
  if (!["avif", "avis"].includes(brand) && !/avif|avis/.test(compatible)) return null;
  const limit = Math.min(b.length - 20, 64 * 1024);
  for (let o = 0; o < limit; o++) {
    if (b[o] === 0x69 && b[o + 1] === 0x73 && b[o + 2] === 0x70 && b[o + 3] === 0x65) {
      // "ispe": version/flags(4) then width(4) height(4)
      return { mime: "image/avif", width: u32be(b, o + 8), height: u32be(b, o + 12) };
    }
  }
  return null;
}

/** Returns the real image type and dimensions, or null when the bytes are not a supported image. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const found = sniffPng(bytes) ?? sniffJpeg(bytes) ?? sniffWebp(bytes) ?? sniffAvif(bytes);
  if (!found) return null;
  if (!Number.isInteger(found.width) || !Number.isInteger(found.height)) return null;
  if (found.width < 1 || found.height < 1) return null;
  return found;
}
