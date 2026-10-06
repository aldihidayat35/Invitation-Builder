/**
 * Animation configuration (data only — GSAP implementation arrives in Fase 7).
 *
 * PRD refs: FR-ANM-001..006, §12.1. `presetId` is an open identifier so the
 * preset registry (Fase 7) can grow without schema migrations; the preset
 * must exist in that registry at validation time (Lampiran C).
 */
import { z } from "zod";

export const ANIMATION_TRIGGERS = [
  "onLoad",
  "onEnterViewport",
  "onClick",
  "afterEnter",
  "whileVisible",
  "onExitViewport",
  "explicit",
] as const;
export type AnimationTrigger = (typeof ANIMATION_TRIGGERS)[number];

/** Whitelisted easing names; never free-form expressions. */
export const ANIMATION_EASINGS = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "power1.out",
  "power2.out",
  "power3.out",
  "back.out",
  "expo.out",
] as const;
export type AnimationEasing = (typeof ANIMATION_EASINGS)[number];

export const STAGGER_UNITS = ["none", "char", "word"] as const;

export const ANIMATION_LIMITS = {
  maxDurationMs: 10_000,
  maxDelayMs: 30_000,
  maxStaggerMs: 1_000,
  maxRepeat: 100,
} as const;

export const animationTrackSchema = z.strictObject({
  presetId: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/, "Invalid preset id"),
  trigger: z.enum(ANIMATION_TRIGGERS),
  durationMs: z.number().min(0).max(ANIMATION_LIMITS.maxDurationMs).default(600),
  delayMs: z.number().min(0).max(ANIMATION_LIMITS.maxDelayMs).default(0),
  easing: z.enum(ANIMATION_EASINGS).default("power2.out"),
  /** -1 = infinite (attention/loop presets only). */
  repeat: z.int().min(-1).max(ANIMATION_LIMITS.maxRepeat).default(0),
  yoyo: z.boolean().default(false),
  staggerUnit: z.enum(STAGGER_UNITS).default("none"),
  staggerAmountMs: z.number().min(0).max(ANIMATION_LIMITS.maxStaggerMs).default(0),
  once: z.boolean().default(true),
});
export type AnimationTrack = z.infer<typeof animationTrackSchema>;

// ----------------------------------------------------------------------- Motion Path
export const motionPointSchema = z.strictObject({
  x: z.number().min(-5000).max(5000),
  y: z.number().min(-5000).max(5000),
});
export type MotionPoint = z.infer<typeof motionPointSchema>;

export const MOTION_PATH_SHAPES = [
  "linear",
  "curved",
  "arcUp",
  "arcDown",
  "wave",
  "zigzag",
  "circle",
  "custom",
] as const;
export type MotionPathShape = (typeof MOTION_PATH_SHAPES)[number];

export const MOTION_PRESETS = [
  "leftToRight",
  "rightToLeft",
  "topToBottom",
  "bottomToTop",
  "diagonalDownRight",
  "diagonalUpRight",
  "arcUp",
  "arcDown",
  "waveHorizontal",
  "circleOrbit",
  "custom",
] as const;
export type MotionPreset = (typeof MOTION_PRESETS)[number];

export const motionTrackSchema = z.strictObject({
  enabled: z.boolean().default(true),
  preset: z.enum(MOTION_PRESETS).default("leftToRight"),
  pathShape: z.enum(MOTION_PATH_SHAPES).default("curved"),
  points: z.array(motionPointSchema).min(2).max(20).default([
    { x: -120, y: 0 },
    { x: 120, y: 0 },
  ]),
  curviness: z.number().min(0).max(3).default(1),
  durationMs: z.number().min(100).max(30_000).default(2000),
  delayMs: z.number().min(0).max(30_000).default(0),
  easing: z.enum(ANIMATION_EASINGS).default("ease-in-out"),
  repeat: z.int().min(-1).max(ANIMATION_LIMITS.maxRepeat).default(0),
  yoyo: z.boolean().default(false),
  autoRotate: z.boolean().default(false),
  trigger: z.enum(ANIMATION_TRIGGERS).default("onEnterViewport"),
  once: z.boolean().default(true),
});
export type MotionTrack = z.infer<typeof motionTrackSchema>;

export const animationConfigSchema = z.strictObject({
  enter: animationTrackSchema.optional(),
  attention: animationTrackSchema.optional(),
  exit: animationTrackSchema.optional(),
  motion: motionTrackSchema.optional(),
});
export type AnimationConfig = z.infer<typeof animationConfigSchema>;
