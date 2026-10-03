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

export const animationConfigSchema = z.strictObject({
  enter: animationTrackSchema.optional(),
  attention: animationTrackSchema.optional(),
  exit: animationTrackSchema.optional(),
});
export type AnimationConfig = z.infer<typeof animationConfigSchema>;
