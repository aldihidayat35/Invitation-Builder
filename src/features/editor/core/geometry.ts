/**
 * Editor geometry: zoom and coordinate transforms.
 *
 * PRD refs: FR-EDT-001 (zoom 25-200% without changing saved coordinates),
 * FR-EDT-002 (transform persisted), section 9.2 (values stored in the 390 px
 * canonical space, never in zoomed screen space), P-07.
 *
 * Pivot decision (documented in ADR 0005): `frame` is the UNROTATED box
 * (x, y, w, h) and `rotation` (degrees) rotates it around its CENTER. This
 * matches CSS `transform: rotate()` default origin, so the HTML renderer
 * reproduces editor geometry exactly.
 */
import { CANONICAL_BASE_WIDTH, type Frame } from "@/lib/schema";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const DEFAULT_ZOOM = 1;
export const ZOOM_STEPS: readonly number[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 1000) / 1000));
}

/** Next preset step above (or below) the current zoom; stays within 25-200%. */
export function stepZoom(current: number, direction: 1 | -1): number {
  const z = clampZoom(current);
  if (direction === 1) return ZOOM_STEPS.find((s) => s > z + 1e-9) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((s) => s < z - 1e-9) ?? MIN_ZOOM;
}

/** Zoom that makes the 390 px artboard fill `availableWidth` (screen px), clamped. */
export function fitZoom(availableWidth: number): number {
  return clampZoom(availableWidth / CANONICAL_BASE_WIDTH);
}

/** Screen offset (relative to the artboard's top-left) -> canonical coordinate. */
export function screenToCanvas(point: Point, zoom: number): Point {
  const z = clampZoom(zoom);
  return { x: point.x / z, y: point.y / z };
}

export function canvasToScreen(point: Point, zoom: number): Point {
  const z = clampZoom(zoom);
  return { x: point.x * z, y: point.y * z };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Normalizes degrees into (-180, 180]. */
export function normalizeRotation(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let r = ((((deg + 180) % 360) + 360) % 360) - 180;
  if (r === -180) r = 180;
  return round2(r);
}

/** Konva node attributes that render `frame` with a center pivot. */
export interface NodeAttrs {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly rotation: number;
}

export function nodeAttrsFromFrame(frame: Frame): NodeAttrs {
  return {
    x: frame.x + frame.w / 2,
    y: frame.y + frame.h / 2,
    width: frame.w,
    height: frame.h,
    offsetX: frame.w / 2,
    offsetY: frame.h / 2,
    rotation: frame.rotation,
  };
}

export interface NodeTransformState {
  /** Pivot position in section space (Konva `x`/`y` with a center offset). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
}

export const MIN_ELEMENT_SIZE = 1;

/**
 * Commits a (possibly scaled) Konva node back to a canonical frame. Scale is
 * folded into width/height so the stored model never contains scale factors,
 * and values are rounded so pointer noise does not leak into the document.
 */
export function frameFromNodeAttrs(node: NodeTransformState): Frame {
  const w = Math.max(MIN_ELEMENT_SIZE, Math.abs(node.width * node.scaleX));
  const h = Math.max(MIN_ELEMENT_SIZE, Math.abs(node.height * node.scaleY));
  return {
    x: round2(node.x - w / 2),
    y: round2(node.y - h / 2),
    w: round2(w),
    h: round2(h),
    rotation: normalizeRotation(node.rotation),
  };
}

/** Bounding box of a rotated frame (used for snapping and hit math). */
export function rotatedBounds(frame: Frame): { x: number; y: number; w: number; h: number } {
  const rad = (frame.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = frame.w * cos + frame.h * sin;
  const h = frame.w * sin + frame.h * cos;
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

// ------------------------------------------------------------------- snapping

export interface SnapResult {
  /** Offset to add to the frame position so it lines up. */
  readonly dx: number;
  readonly dy: number;
  /** Guide positions (section space) that were matched. */
  readonly guides: { readonly vertical: number[]; readonly horizontal: number[] };
}

export const SNAP_THRESHOLD = 6;

/**
 * Snaps a frame's edges and center to the section boundaries/center AND neighbour elements
 * (FR-EDT-005: Snap to Guides / Perataan Otomatis).
 */
export function snapToGuides(
  frame: Frame,
  section: { readonly width: number; readonly height: number },
  otherElements: readonly Frame[] = [],
  threshold: number = SNAP_THRESHOLD,
): SnapResult {
  const b = rotatedBounds(frame);

  // Dragged element candidates: left edge, center, right edge
  const myX = [
    { edge: b.x, isCenter: false },
    { edge: b.x + b.w / 2, isCenter: true },
    { edge: b.x + b.w, isCenter: false },
  ];

  // Dragged element candidates: top edge, center, bottom edge
  const myY = [
    { edge: b.y, isCenter: false },
    { edge: b.y + b.h / 2, isCenter: true },
    { edge: b.y + b.h, isCenter: false },
  ];

  // Target lines: Section boundaries & center
  const targetsX: { target: number; isCenter: boolean }[] = [
    { target: 0, isCenter: false },
    { target: section.width / 2, isCenter: true },
    { target: section.width, isCenter: false },
  ];

  const targetsY: { target: number; isCenter: boolean }[] = [
    { target: 0, isCenter: false },
    { target: section.height / 2, isCenter: true },
    { target: section.height, isCenter: false },
  ];

  // Target lines: Neighbor elements (tetangga) in the section
  for (const other of otherElements) {
    const ob = rotatedBounds(other);
    targetsX.push(
      { target: ob.x, isCenter: false },
      { target: ob.x + ob.w / 2, isCenter: true },
      { target: ob.x + ob.w, isCenter: false },
    );

    targetsY.push(
      { target: ob.y, isCenter: false },
      { target: ob.y + ob.h / 2, isCenter: true },
      { target: ob.y + ob.h, isCenter: false },
    );
  }

  // Find best candidate for X
  let bestX: { delta: number; target: number } | null = null;
  for (const m of myX) {
    for (const t of targetsX) {
      const delta = t.target - m.edge;
      const absDelta = Math.abs(delta);
      if (absDelta <= threshold) {
        if (
          !bestX ||
          absDelta < Math.abs(bestX.delta) ||
          (absDelta === Math.abs(bestX.delta) && m.isCenter === t.isCenter)
        ) {
          bestX = { delta, target: t.target };
        }
      }
    }
  }

  // Find best candidate for Y
  let bestY: { delta: number; target: number } | null = null;
  for (const m of myY) {
    for (const t of targetsY) {
      const delta = t.target - m.edge;
      const absDelta = Math.abs(delta);
      if (absDelta <= threshold) {
        if (
          !bestY ||
          absDelta < Math.abs(bestY.delta) ||
          (absDelta === Math.abs(bestY.delta) && m.isCenter === t.isCenter)
        ) {
          bestY = { delta, target: t.target };
        }
      }
    }
  }

  const dx = bestX ? round2(bestX.delta) : 0;
  const dy = bestY ? round2(bestY.delta) : 0;

  // After applying snap dx & dy, collect all matching guide lines
  const guidesX = new Set<number>();
  if (bestX) {
    const snappedX = [
      round2(b.x + dx),
      round2(b.x + b.w / 2 + dx),
      round2(b.x + b.w + dx),
    ];
    for (const t of targetsX) {
      const roundedT = round2(t.target);
      if (snappedX.some((sx) => Math.abs(sx - roundedT) < 0.01)) {
        guidesX.add(roundedT);
      }
    }
  }

  const guidesY = new Set<number>();
  if (bestY) {
    const snappedY = [
      round2(b.y + dy),
      round2(b.y + b.h / 2 + dy),
      round2(b.y + b.h + dy),
    ];
    for (const t of targetsY) {
      const roundedT = round2(t.target);
      if (snappedY.some((sy) => Math.abs(sy - roundedT) < 0.01)) {
        guidesY.add(roundedT);
      }
    }
  }

  return {
    dx,
    dy,
    guides: {
      vertical: Array.from(guidesX),
      horizontal: Array.from(guidesY),
    },
  };
}

/**
 * Snaps the frame's edges/center to the section's edges/center (FR-EDT-005).
 */
export function snapToSection(
  frame: Frame,
  section: { readonly width: number; readonly height: number },
  threshold: number = SNAP_THRESHOLD,
): SnapResult {
  return snapToGuides(frame, section, [], threshold);
}

