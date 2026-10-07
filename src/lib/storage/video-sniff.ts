/**
 * Server-side video sniffing (NFR-SEC-002, FR-AST-001). Pure.
 * Derives true MIME type from magic bytes in headers.
 */
import type { AllowedMimeType } from "@/lib/schema";

export interface SniffedVideo {
  readonly mime: Extract<
    AllowedMimeType,
    "video/mp4" | "video/webm" | "video/ogg" | "video/quicktime"
  >;
  readonly width: number | null;
  readonly height: number | null;
}

const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...b.subarray(o, o + n));

function sniffMp4OrQuicktime(b: Uint8Array): SniffedVideo | null {
  // ISO-BMFF starts with 4-byte box size, then 'ftyp' or 'moov' box type
  if (b.length < 12) return null;
  const boxType = ascii(b, 4, 4);
  if (boxType !== "ftyp" && boxType !== "moov") return null;

  if (boxType === "moov") {
    return { mime: "video/quicktime", width: null, height: null };
  }

  const brand = ascii(b, 8, 4).toLowerCase();
  // QuickTime .mov files often use 'qt  '
  if (brand.startsWith("qt")) {
    return { mime: "video/quicktime", width: null, height: null };
  }

  // Standard MP4 brands: isom, iso2, mp41, mp42, avc1, m4v, dash, etc.
  return { mime: "video/mp4", width: null, height: null };
}

function sniffWebm(b: Uint8Array): SniffedVideo | null {
  // EBML Header: 0x1A, 0x45, 0xDF, 0xA3
  if (b.length < 12) return null;
  if (b[0] !== 0x1a || b[1] !== 0x45 || b[2] !== 0xdf || b[3] !== 0xa3) return null;

  // Search first 128 bytes for "webm" or "matroska"
  const scanLimit = Math.min(b.length, 128);
  const headerSlice = ascii(b, 0, scanLimit).toLowerCase();
  if (headerSlice.includes("webm") || headerSlice.includes("matroska")) {
    return { mime: "video/webm", width: null, height: null };
  }
  return { mime: "video/webm", width: null, height: null };
}

function sniffOggVideo(b: Uint8Array): SniffedVideo | null {
  // Ogg container starts with 'OggS'
  if (b.length < 14) return null;
  if (ascii(b, 0, 4) !== "OggS") return null;
  return { mime: "video/ogg", width: null, height: null };
}

export function sniffVideo(bytes: Uint8Array): SniffedVideo | null {
  return sniffMp4OrQuicktime(bytes) ?? sniffWebm(bytes) ?? sniffOggVideo(bytes);
}
