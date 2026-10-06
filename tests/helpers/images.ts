/** Minimal hand-built image headers: just enough bytes for the sniffer (no decoding). */
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];

const pad = (head: number[], total = 64): Uint8Array => {
  const out = new Uint8Array(Math.max(total, head.length));
  out.set(head);
  return out;
};

export function pngBytes(width: number, height: number): Uint8Array {
  return pad([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...be32(13),
    ...ascii("IHDR"),
    ...be32(width),
    ...be32(height),
  ]);
}

export function jpegBytes(width: number, height: number): Uint8Array {
  return pad([0xff, 0xd8, 0xff, 0xc0, ...be16(17), 8, ...be16(height), ...be16(width), 3]);
}

export function webpBytes(width: number, height: number): Uint8Array {
  return pad([
    ...ascii("RIFF"),
    ...be32(0),
    ...ascii("WEBP"),
    ...ascii("VP8X"),
    10,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...le24(width - 1),
    ...le24(height - 1),
  ]);
}

export function avifBytes(width: number, height: number): Uint8Array {
  return pad([
    ...be32(24),
    ...ascii("ftyp"),
    ...ascii("avif"),
    ...be32(0),
    ...ascii("avif"),
    ...be32(20),
    ...ascii("ispe"),
    ...be32(0),
    ...be32(width),
    ...be32(height),
  ]);
}

const le16 = (n: number) => [n & 255, (n >>> 8) & 255];

export function gifBytes(width: number, height: number): Uint8Array {
  return pad([
    ...ascii("GIF89a"),
    ...le16(width),
    ...le16(height),
    0x80,
    0x00,
    0x00,
  ]);
}
