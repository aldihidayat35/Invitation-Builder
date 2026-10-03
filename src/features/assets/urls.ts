/** Client-safe URL helpers for assets (no server imports). */

/** Upload target for the local storage driver. */
export const assetContentUrl = (assetId: string): string => `/api/assets/${assetId}/content`;

/**
 * Delivery URL. `width` is accepted now so callers are already written against
 * the future optimized-variants API; today every width maps to the original.
 */
export function assetUrl(assetId: string, options: { readonly width?: number } = {}): string {
  void options;
  return `/api/assets/${assetId}/file`;
}
