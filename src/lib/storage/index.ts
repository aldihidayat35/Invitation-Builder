import "server-only";
import { createLocalStorage } from "./local";
import { createS3Storage } from "./s3";
import type { StorageDriver } from "./types";

export { sniffImage, type SniffedImage } from "./image-sniff";
export type { PresignedUpload, StorageDriver } from "./types";

const globalForStorage = globalThis as unknown as { __invitationStorage?: StorageDriver };

/**
 * Process-wide storage. `S3_BUCKET` (+ credentials) selects the S3-compatible
 * driver; otherwise files are kept on disk under `STORAGE_LOCAL_DIR`
 * (default `.data/uploads`).
 */
export function getStorage(): StorageDriver {
  globalForStorage.__invitationStorage ??= create();
  return globalForStorage.__invitationStorage;
}

function create(): StorageDriver {
  const env = process.env;
  if (env.S3_BUCKET) {
    if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3_BUCKET is set but S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing.");
    }
    return createS3Storage({
      bucket: env.S3_BUCKET,
      region: env.S3_REGION ?? "us-east-1",
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      ...(env.S3_FORCE_PATH_STYLE ? { forcePathStyle: env.S3_FORCE_PATH_STYLE === "1" } : {}),
    });
  }
  return createLocalStorage(env.STORAGE_LOCAL_DIR ?? ".data/uploads");
}
