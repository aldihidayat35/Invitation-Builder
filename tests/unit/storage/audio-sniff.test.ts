import { describe, it, expect } from "vitest";
import { sniffAudio } from "@/lib/storage/audio-sniff";

describe("Server-Side Audio Sniffing", () => {
  it("detects MP3 files with ID3v2 header", () => {
    // 'ID3' followed by version bytes
    const header = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
    const result = sniffAudio(header);
    expect(result).not.toBeNull();
    expect(result?.mime).toBe("audio/mpeg");
  });

  it("detects MP3 files with MPEG frame sync bytes (0xFF 0xFB)", () => {
    // 0xFF 0xFB is standard MPEG-1 Layer 3 sync word
    const header = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
    const result = sniffAudio(header);
    expect(result).not.toBeNull();
    expect(result?.mime).toBe("audio/mpeg");
  });

  it("detects Ogg audio files with 'OggS' signature", () => {
    // 'OggS' magic bytes: 0x4F, 0x67, 0x67, 0x53
    const header = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00]);
    const result = sniffAudio(header);
    expect(result).not.toBeNull();
    expect(result?.mime).toBe("audio/ogg");
  });

  it("detects MP4 / M4A audio files with ISO BMFF 'ftyp' and audio brand", () => {
    // [0, 0, 0, 32, 'f', 't', 'y', 'p', 'M', '4', 'A', ' ']
    const boxSize = 32;
    const header = new Uint8Array(boxSize);
    header[0] = 0;
    header[1] = 0;
    header[2] = 0;
    header[3] = boxSize;
    header[4] = "f".charCodeAt(0);
    header[5] = "t".charCodeAt(0);
    header[6] = "y".charCodeAt(0);
    header[7] = "p".charCodeAt(0);
    header[8] = "M".charCodeAt(0);
    header[9] = "4".charCodeAt(0);
    header[10] = "A".charCodeAt(0);
    header[11] = " ".charCodeAt(0);

    const result = sniffAudio(header);
    expect(result).not.toBeNull();
    expect(result?.mime).toBe("audio/mp4");
  });

  it("rejects non-audio / garbage bytes", () => {
    const garbage = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    const result = sniffAudio(garbage);
    expect(result).toBeNull();
  });
});
