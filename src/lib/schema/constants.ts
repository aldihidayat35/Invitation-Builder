/**
 * Canonical layout constants — single source of truth.
 *
 * PRD refs: P-07 (mobile-first, base 390 px, target 320–430 px),
 * §9.3 Section Model (default section height 844 px), §13 Renderer.
 * ADR: docs/decisions/0001-architecture-baseline.md (keputusan #4).
 *
 * Semua koordinat elemen disimpan relatif terhadap CANONICAL_BASE_WIDTH,
 * bukan koordinat layar editor setelah zoom.
 */

/** Lebar artboard kanonik dalam px (P-07). */
export const CANONICAL_BASE_WIDTH = 390 as const;

/** Tinggi default section baru dalam px (PRD §9.3). */
export const DEFAULT_SECTION_HEIGHT = 844 as const;

/** Rentang viewport target utama output publik (P-07, AC-12). */
export const TARGET_VIEWPORT_MIN = 320 as const;
export const TARGET_VIEWPORT_MAX = 430 as const;

/** Viewport yang wajib diverifikasi visual regression (AC-12, PRD §21). */
export const REGRESSION_VIEWPORTS = [320, 375, 390, 414, 430] as const;

export type RegressionViewport = (typeof REGRESSION_VIEWPORTS)[number];
