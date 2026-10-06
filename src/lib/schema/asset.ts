/**
 * Asset upload contract (server re-validates; never trust client metadata).
 *
 * PRD refs: FR-AST-001, NFR-SEC-002, Lampiran B (asset states).
 * SVG is deliberately excluded: it can embed script.
 */
import { z } from "zod";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;
export const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp4", "audio/ogg"] as const;
export const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...AUDIO_MIME_TYPES] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type AssetKind = "image" | "audio";

export const ASSET_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024,
  audioMaxBytes: 15 * 1024 * 1024,
  imageMaxDimension: 8000,
  filenameMaxLength: 255,
} as const;

/** Extensions that are consistent with each MIME type. */
export const EXTENSIONS_BY_MIME: Readonly<Record<AllowedMimeType, readonly string[]>> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/gif": ["gif"],
  "audio/mpeg": ["mp3"],
  "audio/mp4": ["m4a", "mp4"],
  "audio/ogg": ["ogg", "oga"],
};

export function assetKindFromMime(mime: AllowedMimeType): AssetKind {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime) ? "image" : "audio";
}

export function maxBytesForMime(mime: AllowedMimeType): number {
  return assetKindFromMime(mime) === "image"
    ? ASSET_LIMITS.imageMaxBytes
    : ASSET_LIMITS.audioMaxBytes;
}

export const assetUploadInitSchema = z
  .strictObject({
    filename: z
      .string()
      .min(1)
      .max(ASSET_LIMITS.filenameMaxLength)

      .refine((n) => !/[\\/\u0000-\u001F]/.test(n), "Filename must not contain path separators"),
    mimeType: z.enum(ALLOWED_MIME_TYPES),
    bytes: z.int().positive(),
  })
  .superRefine((upload, ctx) => {
    if (upload.bytes > maxBytesForMime(upload.mimeType)) {
      ctx.addIssue({
        code: "custom",
        path: ["bytes"],
        message: `File exceeds the ${maxBytesForMime(upload.mimeType)} byte limit`,
      });
    }
    const ext = upload.filename.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSIONS_BY_MIME[upload.mimeType].includes(ext)) {
      ctx.addIssue({
        code: "custom",
        path: ["filename"],
        message: `Extension ".${ext}" does not match ${upload.mimeType}`,
      });
    }
  });
export type AssetUploadInit = z.infer<typeof assetUploadInitSchema>;

/** Dimensions measured server-side after upload. */
export const imageDimensionsSchema = z.strictObject({
  width: z.int().min(1).max(ASSET_LIMITS.imageMaxDimension),
  height: z.int().min(1).max(ASSET_LIMITS.imageMaxDimension),
});
