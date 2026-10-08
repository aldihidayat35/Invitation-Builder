/**
 * Storage configuration, limits, and byte formatting helpers.
 * Configurable via `STORAGE_LIMIT_MB` or `NEXT_PUBLIC_STORAGE_LIMIT_MB` in .env.
 */

export function getStorageLimitMb(): number {
  const envVal =
    typeof process !== "undefined" && process.env
      ? process.env.STORAGE_LIMIT_MB || process.env.NEXT_PUBLIC_STORAGE_LIMIT_MB
      : undefined;

  if (envVal) {
    const parsed = Number.parseInt(envVal, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 500; // Default 500 MB
}

export function getStorageLimitBytes(): number {
  return getStorageLimitMb() * 1024 * 1024;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}
