/**
 * Server-side audio sniffing (NFR-SEC-002, FR-AST-001). Pure.
 * Derives true MIME type from magic bytes in headers for MP3, OGG, and MP4/M4A audio.
 */
import type { AllowedMimeType } from "@/lib/schema";

export interface SniffedAudio {
  readonly mime: Extract<AllowedMimeType, "audio/mpeg" | "audio/ogg" | "audio/mp4">;
}

const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...b.subarray(o, o + n));

function sniffMp3(b: Uint8Array): SniffedAudio | null {
  if (b.length < 3) return null;

  // ID3v2 tag begins with 'ID3' (0x49, 0x44, 0x33)
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) {
    return { mime: "audio/mpeg" };
  }

  // MPEG audio frame sync: 11 bits set (0xFF followed by high 3 bits set 0xE0)
  // e.g. 0xFF 0xFB, 0xFF 0xF3, 0xFF 0xF2
  if (b.length >= 2 && b[0] === 0xff && (b[1]! & 0xe0) === 0xe0) {
    return { mime: "audio/mpeg" };
  }

  // Some MP3s have small metadata padding before the ID3 or frame sync
  const scanLimit = Math.min(b.length - 3, 1024);
  for (let i = 0; i < scanLimit; i++) {
    if (b[i] === 0x49 && b[i + 1] === 0x44 && b[i + 2] === 0x33) {
      return { mime: "audio/mpeg" };
    }
    if (b[i] === 0xff && (b[i + 1]! & 0xe0) === 0xe0) {
      return { mime: "audio/mpeg" };
    }
  }

  return null;
}

function sniffOggAudio(b: Uint8Array): SniffedAudio | null {
  // Ogg container starts with 'OggS'
  if (b.length < 4) return null;
  if (ascii(b, 0, 4) === "OggS") {
    return { mime: "audio/ogg" };
  }
  return null;
}

function sniffMp4Audio(b: Uint8Array): SniffedAudio | null {
  // ISO-BMFF starts with 4-byte box size, then 'ftyp' box type
  if (b.length < 12) return null;
  const boxType = ascii(b, 4, 4);
  if (boxType !== "ftyp") return null;

  const brand = ascii(b, 8, 4).toLowerCase();
  // Standard audio brands: M4A, M4B, mp42, isom
  if (
    brand.startsWith("m4a") ||
    brand.startsWith("m4b") ||
    brand.startsWith("mp4") ||
    brand.startsWith("iso")
  ) {
    return { mime: "audio/mp4" };
  }

  return { mime: "audio/mp4" };
}

export function sniffAudio(bytes: Uint8Array): SniffedAudio | null {
  const ogg = sniffOggAudio(bytes);
  if (ogg) return ogg;

  const mp3 = sniffMp3(bytes);
  if (mp3) return mp3;

  const mp4 = sniffMp4Audio(bytes);
  if (mp4) return mp4;

  return null;
}
