/**
 * Server-side audio sniffing (NFR-SEC-002, FR-AST-001). Pure.
 * Derives true MIME type from magic bytes in headers for MP3, OGG, and MP4/M4A audio.
 */
import type { AllowedMimeType } from "@/lib/schema";

export interface SniffedAudio {
  readonly mime: AllowedMimeType;
}

const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...b.subarray(o, o + n));

function isMpegAudioFrame(b0: number, b1: number): boolean {
  if (b0 !== 0xff) return false;
  if ((b1 & 0xe0) !== 0xe0) return false;
  const layer = (b1 >> 1) & 0x03;
  // Layer 0 is reserved for ADTS (AAC), MPEG-1/2 Audio uses layer 1, 2, or 3
  return layer !== 0;
}

function sniffMp3(b: Uint8Array): SniffedAudio | null {
  if (b.length < 3) return null;

  // ID3v2 tag begins with 'ID3' (0x49, 0x44, 0x33)
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) {
    return { mime: "audio/mpeg" };
  }

  // MPEG audio frame sync: 11 bits set and non-zero layer
  if (b.length >= 2 && isMpegAudioFrame(b[0]!, b[1]!)) {
    return { mime: "audio/mpeg" };
  }

  // Some MP3s have small metadata padding before the ID3 or frame sync
  const scanLimit = Math.min(b.length - 3, 1024);
  for (let i = 0; i < scanLimit; i++) {
    if (b[i] === 0x49 && b[i + 1] === 0x44 && b[i + 2] === 0x33) {
      return { mime: "audio/mpeg" };
    }
    if (isMpegAudioFrame(b[i]!, b[i + 1]!)) {
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

  return { mime: "audio/mp4" };
}

function sniffWavAudio(b: Uint8Array): SniffedAudio | null {
  // RIFF header with WAVE format
  if (b.length < 12) return null;
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WAVE") {
    return { mime: "audio/wav" };
  }
  return null;
}

function sniffFlacAudio(b: Uint8Array): SniffedAudio | null {
  // FLAC stream begins with 'fLaC' marker
  if (b.length < 4) return null;
  if (ascii(b, 0, 4) === "fLaC") {
    return { mime: "audio/flac" };
  }
  return null;
}

function sniffAacAudio(b: Uint8Array): SniffedAudio | null {
  // ADTS syncword (12 bits set 0xFF 0xF0)
  if (b.length < 2) return null;
  if (b[0] === 0xff && (b[1]! & 0xf0) === 0xf0) {
    return { mime: "audio/aac" };
  }
  return null;
}

function sniffWebmAudio(b: Uint8Array): SniffedAudio | null {
  // Matroska / WebM EBML element identifier (0x1A 0x45 0xDF 0xA3)
  if (b.length < 4) return null;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return { mime: "audio/webm" };
  }
  return null;
}

export function sniffAudio(bytes: Uint8Array): SniffedAudio | null {
  const ogg = sniffOggAudio(bytes);
  if (ogg) return ogg;

  const wav = sniffWavAudio(bytes);
  if (wav) return wav;

  const flac = sniffFlacAudio(bytes);
  if (flac) return flac;

  const mp3 = sniffMp3(bytes);
  if (mp3) return mp3;

  const mp4 = sniffMp4Audio(bytes);
  if (mp4) return mp4;

  const aac = sniffAacAudio(bytes);
  if (aac) return aac;

  const webm = sniffWebmAudio(bytes);
  if (webm) return webm;

  return null;
}
