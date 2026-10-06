/**
 * Animation Configuration Normalization (FR-ANM-005, §12.1).
 *
 * Ensures values adhere to limits and fallback defaults are cleanly resolved.
 */
import {
  ANIMATION_LIMITS,
  type AnimationConfig,
  type AnimationTrack,
  animationTrackSchema,
} from "@/lib/schema";
import { animationPresetRegistry } from "./registry";

export interface CreateTrackOptions {
  readonly presetId: string;
  readonly trigger?: AnimationTrack["trigger"];
  readonly durationMs?: number;
  readonly delayMs?: number;
  readonly easing?: AnimationTrack["easing"];
  readonly staggerUnit?: AnimationTrack["staggerUnit"];
  readonly staggerAmountMs?: number;
  readonly repeat?: number;
  readonly yoyo?: boolean;
  readonly once?: boolean;
}

export function buildDefaultTrack(options: CreateTrackOptions): AnimationTrack {
  const preset = animationPresetRegistry.get(options.presetId);

  const durationMs = options.durationMs ?? preset?.defaultDurationMs ?? 600;
  const delayMs = options.delayMs ?? preset?.defaultDelayMs ?? 0;
  const easing = options.easing ?? preset?.defaultEasing ?? "power2.out";
  const staggerUnit = options.staggerUnit ?? preset?.defaultStaggerUnit ?? "none";
  const staggerAmountMs = options.staggerAmountMs ?? preset?.defaultStaggerAmountMs ?? 0;
  const repeat = options.repeat ?? (preset?.loop ? -1 : 0);
  const yoyo = options.yoyo ?? preset?.yoyo ?? false;
  const trigger =
    options.trigger ?? (preset?.category === "exit" ? "onExitViewport" : "onEnterViewport");
  const once = options.once ?? repeat === 0;

  const candidate = {
    presetId: options.presetId,
    trigger,
    durationMs: Math.max(0, Math.min(ANIMATION_LIMITS.maxDurationMs, durationMs)),
    delayMs: Math.max(0, Math.min(ANIMATION_LIMITS.maxDelayMs, delayMs)),
    easing,
    repeat: Math.max(-1, Math.min(ANIMATION_LIMITS.maxRepeat, repeat)),
    yoyo,
    staggerUnit,
    staggerAmountMs: Math.max(0, Math.min(ANIMATION_LIMITS.maxStaggerMs, staggerAmountMs)),
    once,
  };

  return animationTrackSchema.parse(candidate);
}

export function normalizeAnimationTrack(input: unknown): AnimationTrack {
  const parsed = animationTrackSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  // If parsing fails, extract presetId or fallback to fadeIn
  const presetId =
    typeof input === "object" &&
    input !== null &&
    "presetId" in input &&
    typeof input.presetId === "string"
      ? input.presetId
      : "fadeIn";

  return buildDefaultTrack({ presetId });
}

export function hasActiveAnimations(config?: AnimationConfig): boolean {
  if (!config) return false;
  return Boolean(
    config.enter ||
      config.attention ||
      config.exit ||
      (config.motion && config.motion.enabled),
  );
}
