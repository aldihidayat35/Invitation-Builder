/**
 * Motion Path Animation Engine (FR-ANM-Motion, PRD §12).
 *
 * Provides declarative waypoint motion path generation, Catmull-Rom spline
 * interpolation with curvature control, GSAP runtime execution, and Konva replay.
 */
import gsap from "gsap";
import {
  ANIMATION_LIMITS,
  type MotionPathShape,
  type MotionPoint,
  type MotionPreset,
  type MotionTrack,
  motionTrackSchema,
} from "@/lib/schema";
import { isPrefersReducedMotion } from "./reduced-motion";
import type { AnimationCleanup } from "./runtime";
import type { PlayAnimationOptions } from "./types";

export interface MotionPresetDefinition {
  readonly id: MotionPreset;
  readonly label: string;
  readonly description: string;
  readonly pathShape: MotionPathShape;
  readonly points: readonly MotionPoint[];
  readonly curviness: number;
  readonly defaultDurationMs: number;
  readonly yoyo?: boolean;
  readonly repeat?: number;
}

export const MOTION_PRESET_CONFIGS: readonly MotionPresetDefinition[] = [
  {
    id: "leftToRight",
    label: "Kiri ke Kanan",
    description: "Objek bergerak lurus mendatar dari arah kiri menuju kanan.",
    pathShape: "linear",
    points: [
      { x: -140, y: 0 },
      { x: 140, y: 0 },
    ],
    curviness: 0,
    defaultDurationMs: 2000,
  },
  {
    id: "rightToLeft",
    label: "Kanan ke Kiri",
    description: "Objek bergerak lurus mendatar dari arah kanan menuju kiri.",
    pathShape: "linear",
    points: [
      { x: 140, y: 0 },
      { x: -140, y: 0 },
    ],
    curviness: 0,
    defaultDurationMs: 2000,
  },
  {
    id: "topToBottom",
    label: "Atas ke Bawah",
    description: "Objek bergerak meluncur turun dari atas ke bawah.",
    pathShape: "linear",
    points: [
      { x: 0, y: -140 },
      { x: 0, y: 140 },
    ],
    curviness: 0,
    defaultDurationMs: 2000,
  },
  {
    id: "bottomToTop",
    label: "Bawah ke Atas",
    description: "Objek meluncur naik dari bawah ke atas.",
    pathShape: "linear",
    points: [
      { x: 0, y: 140 },
      { x: 0, y: -140 },
    ],
    curviness: 0,
    defaultDurationMs: 2000,
  },
  {
    id: "diagonalDownRight",
    label: "Diagonal Kanan Bawah",
    description: "Objek meluncur miring dari kiri atas ke kanan bawah.",
    pathShape: "linear",
    points: [
      { x: -120, y: -100 },
      { x: 120, y: 100 },
    ],
    curviness: 0,
    defaultDurationMs: 2200,
  },
  {
    id: "diagonalUpRight",
    label: "Diagonal Kanan Atas",
    description: "Objek meluncur miring dari kiri bawah ke kanan atas.",
    pathShape: "linear",
    points: [
      { x: -120, y: 100 },
      { x: 120, y: -100 },
    ],
    curviness: 0,
    defaultDurationMs: 2200,
  },
  {
    id: "arcUp",
    label: "Melengkung ke Atas (Busur)",
    description: "Objek melintas membentuk lengkungan busur ke arah atas.",
    pathShape: "arcUp",
    points: [
      { x: -140, y: 40 },
      { x: 0, y: -70 },
      { x: 140, y: 40 },
    ],
    curviness: 1.2,
    defaultDurationMs: 2400,
  },
  {
    id: "arcDown",
    label: "Melengkung ke Bawah (Ayunan)",
    description: "Objek melintas melengkung ke bawah seperti ayunan.",
    pathShape: "arcDown",
    points: [
      { x: -140, y: -40 },
      { x: 0, y: 70 },
      { x: 140, y: -40 },
    ],
    curviness: 1.2,
    defaultDurationMs: 2400,
  },
  {
    id: "waveHorizontal",
    label: "Gelombang Berayun (Wave)",
    description: "Objek bergerak menyusuri gelombang berayun naik-turun.",
    pathShape: "wave",
    points: [
      { x: -150, y: 0 },
      { x: -75, y: -45 },
      { x: 0, y: 0 },
      { x: 75, y: 45 },
      { x: 150, y: 0 },
    ],
    curviness: 1.4,
    defaultDurationMs: 2800,
  },
  {
    id: "circleOrbit",
    label: "Melingkar / Mengorbit (Orbit)",
    description: "Objek berputar mengitari poros membentuk jalur oval melingkar.",
    pathShape: "circle",
    points: [
      { x: 0, y: -60 },
      { x: 70, y: 0 },
      { x: 0, y: 60 },
      { x: -70, y: 0 },
      { x: 0, y: -60 },
    ],
    curviness: 1.5,
    defaultDurationMs: 3000,
    repeat: -1,
  },
  {
    id: "custom",
    label: "Kustom (Titik-Titik Bebas)",
    description: "Atur titik-titik koordinat jalur gerakan secara manual sesuai keinginan.",
    pathShape: "curved",
    points: [
      { x: -100, y: 50 },
      { x: 0, y: -60 },
      { x: 100, y: 50 },
    ],
    curviness: 1.0,
    defaultDurationMs: 2500,
  },
];

export function getMotionPresetConfig(presetId: MotionPreset): MotionPresetDefinition {
  const found = MOTION_PRESET_CONFIGS.find((p) => p.id === presetId);
  return found ?? (MOTION_PRESET_CONFIGS[0] as MotionPresetDefinition);
}

export function buildDefaultMotionTrack(options: Partial<MotionTrack> = {}): MotionTrack {
  const presetId = options.preset ?? "leftToRight";
  const presetDef = getMotionPresetConfig(presetId);

  const durationMs = options.durationMs ?? presetDef.defaultDurationMs;
  const delayMs = options.delayMs ?? 0;
  const curviness = options.curviness ?? presetDef.curviness;
  const pathShape = options.pathShape ?? presetDef.pathShape;
  const points = options.points ?? [...presetDef.points];
  const repeat = options.repeat ?? presetDef.repeat ?? 0;
  const yoyo = options.yoyo ?? presetDef.yoyo ?? false;

  const candidate = {
    enabled: options.enabled ?? true,
    preset: presetId,
    pathShape,
    points,
    curviness,
    durationMs: Math.max(100, Math.min(ANIMATION_LIMITS.maxDurationMs, durationMs)),
    delayMs: Math.max(0, Math.min(ANIMATION_LIMITS.maxDelayMs, delayMs)),
    easing: options.easing ?? "ease-in-out",
    repeat: Math.max(-1, Math.min(ANIMATION_LIMITS.maxRepeat, repeat)),
    yoyo,
    autoRotate: options.autoRotate ?? false,
    trigger: options.trigger ?? "onEnterViewport",
    once: options.once ?? repeat === 0,
  };

  return motionTrackSchema.parse(candidate);
}

/**
 * Evaluates Catmull-Rom cubic spline interpolation through a series of points.
 */
function interpolateCatmullRom(
  points: readonly MotionPoint[],
  t: number,
  curviness = 1.0,
): { x: number; y: number } {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  const firstPt = points[0] ?? { x: 0, y: 0 };
  if (n === 1) return { x: firstPt.x, y: firstPt.y };
  if (n === 2 || curviness <= 0.01) {
    // Linear blend across 2 points or when curviness is zero
    const segT = t * (n - 1);
    const idx = Math.min(Math.floor(segT), n - 2);
    const u = segT - idx;
    const p0 = points[idx] ?? firstPt;
    const p1 = points[idx + 1] ?? p0;
    return {
      x: p0.x + (p1.x - p0.x) * u,
      y: p0.y + (p1.y - p0.y) * u,
    };
  }

  // Multiply clamped t by number of segments
  const totalSegments = n - 1;
  const scaledT = Math.max(0, Math.min(0.999999, t)) * totalSegments;
  const segment = Math.floor(scaledT);
  const u = scaledT - segment;

  const p0 = points[Math.max(0, segment - 1)] ?? firstPt;
  const p1 = points[segment] ?? firstPt;
  const p2 = points[Math.min(n - 1, segment + 1)] ?? p1;
  const p3 = points[Math.min(n - 1, segment + 2)] ?? p2;

  // Scale tangent vectors by curviness (0.5 is standard Catmull-Rom)
  const factor = 0.5 * curviness;
  const m1x = factor * (p2.x - p0.x);
  const m1y = factor * (p2.y - p0.y);
  const m2x = factor * (p3.x - p1.x);
  const m2y = factor * (p3.y - p1.y);

  const u2 = u * u;
  const u3 = u2 * u;

  // Hermite basis functions
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  return {
    x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x,
    y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y,
  };
}

/**
 * Computes exact position (x, y) and rotation angle in degrees along the motion path at progress t (0..1).
 */
export function getPointOnMotionPath(
  track: MotionTrack,
  rawT: number,
): { x: number; y: number; rotation: number } {
  const t = Math.max(0, Math.min(1, rawT));
  const points = track.points;
  if (!points || points.length === 0) {
    return { x: 0, y: 0, rotation: 0 };
  }
  const firstPt = points[0]!;
  if (points.length === 1) {
    return { x: firstPt.x, y: firstPt.y, rotation: 0 };
  }
  const lastPt = points[points.length - 1]!;

  const computePos = (fraction: number): { x: number; y: number } => {
    const f = Math.max(0, Math.min(1, fraction));
    switch (track.pathShape) {
      case "linear": {
        const segTotal = points.length - 1;
        const segFrac = f * segTotal;
        const idx = Math.min(Math.floor(segFrac), segTotal - 1);
        const u = segFrac - idx;
        const p0 = points[idx] ?? firstPt;
        const p1 = points[idx + 1] ?? lastPt;
        return {
          x: p0.x + (p1.x - p0.x) * u,
          y: p0.y + (p1.y - p0.y) * u,
        };
      }

      case "arcUp":
      case "arcDown": {
        if (points.length >= 3) {
          return interpolateCatmullRom(points, f, Math.max(0.5, track.curviness));
        }
        // If 2 points, construct parabolic arc bulge
        const p0 = firstPt;
        const p1 = lastPt;
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // Perpendicular vector
        const nx = -dy / dist;
        const ny = dx / dist;
        const direction = track.pathShape === "arcUp" ? -1 : 1;
        const bulge = Math.sin(f * Math.PI) * dist * 0.45 * track.curviness * direction;
        return {
          x: p0.x + dx * f + nx * bulge,
          y: p0.y + dy * f + ny * bulge,
        };
      }

      case "wave": {
        if (points.length >= 4) {
          return interpolateCatmullRom(points, f, Math.max(0.6, track.curviness));
        }
        const p0 = firstPt;
        const p1 = lastPt;
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const amplitude = 40 * track.curviness;
        const waveOffset = Math.sin(f * Math.PI * 2) * amplitude;
        return {
          x: p0.x + dx * f + nx * waveOffset,
          y: p0.y + dy * f + ny * waveOffset,
        };
      }

      case "circle": {
        if (points.length >= 5) {
          return interpolateCatmullRom(points, f, Math.max(1, track.curviness));
        }
        const angle = f * Math.PI * 2 - Math.PI / 2;
        const rx = 70 * (track.curviness || 1);
        const ry = 60 * (track.curviness || 1);
        return {
          x: Math.cos(angle) * rx,
          y: Math.sin(angle) * ry,
        };
      }

      case "zigzag": {
        const segTotal = points.length - 1;
        const segFrac = f * segTotal;
        const idx = Math.min(Math.floor(segFrac), segTotal - 1);
        const u = segFrac - idx;
        const p0 = points[idx] ?? firstPt;
        const p1 = points[idx + 1] ?? lastPt;
        return {
          x: p0.x + (p1.x - p0.x) * u,
          y: p0.y + (p1.y - p0.y) * u,
        };
      }

      case "curved":
      case "custom":
      default: {
        return interpolateCatmullRom(points, f, track.curviness);
      }
    }
  };

  const current = computePos(t);

  let rotation = 0;
  if (track.autoRotate) {
    const delta = 0.005;
    const forward = computePos(Math.min(1, t + delta));
    const backward = computePos(Math.max(0, t - delta));
    const dx = forward.x - backward.x;
    const dy = forward.y - backward.y;
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      rotation = Math.atan2(dy, dx) * (180 / Math.PI);
    }
  }

  const cleanZero = (n: number) => {
    const rounded = Math.round(n * 100) / 100;
    return Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
  };

  return {
    x: cleanZero(current.x),
    y: cleanZero(current.y),
    rotation: cleanZero(rotation),
  };
}

/**
 * Samples discrete coordinates along the path (e.g. for canvas guide line drawing).
 */
export function sampleMotionPathPoints(
  track: MotionTrack,
  numSamples = 32,
): readonly { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const count = Math.max(2, numSamples);
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const pt = getPointOnMotionPath(track, t);
    result.push({ x: pt.x, y: pt.y });
  }
  return result;
}

/**
 * Returns an SVG path 'd' string representing the motion curve.
 */
export function buildMotionSvgPath(track: MotionTrack, numSamples = 32): string {
  const samples = sampleMotionPathPoints(track, numSamples);
  const first = samples[0];
  if (!first) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i];
    if (s) {
      d += ` L ${s.x} ${s.y}`;
    }
  }
  return d;
}

/**
 * Plays motion animation on a DOM HTML element using GSAP.
 */
export function playMotionAnimation(
  element: HTMLElement,
  track: MotionTrack,
  options: PlayAnimationOptions = {},
): AnimationCleanup {
  let cleanedUp = false;
  let activeTween: gsap.core.Tween | null = null;
  let observer: IntersectionObserver | null = null;
  let clickHandler: ((e: MouseEvent) => void) | null = null;

  const reducedMotion = !options.forcePlay && isPrefersReducedMotion();

  const execute = () => {
    if (cleanedUp) return;
    options.onStart?.();

    if (reducedMotion) {
      // For reduced motion users, place element at start or destination smoothly without rapid transit
      const finalPt = getPointOnMotionPath(track, 1);
      element.style.transform = `translate3d(${finalPt.x}px, ${finalPt.y}px, 0px)`;
      options.onComplete?.();
      return;
    }

    const state = { progress: 0 };
    const durationSec = Math.max(0.1, track.durationMs / 1000);
    const delaySec = Math.max(0, track.delayMs / 1000);

    // Initial position
    const startPt = getPointOnMotionPath(track, 0);
    element.style.transform = `translate3d(${startPt.x}px, ${startPt.y}px, 0px)${
      track.autoRotate ? ` rotate(${startPt.rotation}deg)` : ""
    }`;

    activeTween = gsap.to(state, {
      progress: 1,
      duration: durationSec,
      delay: delaySec,
      ease: track.easing,
      repeat: track.repeat,
      yoyo: track.yoyo,
      onUpdate: () => {
        if (cleanedUp) return;
        const pt = getPointOnMotionPath(track, state.progress);
        element.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0px)${
          track.autoRotate ? ` rotate(${pt.rotation}deg)` : ""
        }`;
      },
      onComplete: () => {
        options.onComplete?.();
      },
    });
  };

  switch (track.trigger) {
    case "onLoad":
    case "explicit":
    case "afterEnter":
    case "whileVisible": {
      execute();
      break;
    }

    case "onClick": {
      clickHandler = () => {
        execute();
        if (track.once && clickHandler) {
          element.removeEventListener("click", clickHandler);
          clickHandler = null;
        }
      };
      element.addEventListener("click", clickHandler);
      break;
    }

    case "onEnterViewport":
    case "onExitViewport":
    default: {
      if (typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                execute();
                if (track.once && observer) {
                  observer.unobserve(element);
                  observer.disconnect();
                  observer = null;
                }
              }
            }
          },
          { threshold: options.observerThreshold ?? 0.15 },
        );
        observer.observe(element);
      } else {
        execute();
      }
      break;
    }
  }

  return () => {
    cleanedUp = true;
    if (activeTween) {
      activeTween.kill();
      activeTween = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (clickHandler) {
      element.removeEventListener("click", clickHandler);
      clickHandler = null;
    }
  };
}
