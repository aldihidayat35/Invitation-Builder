/**
 * Accessibility: prefers-reduced-motion adapter (NFR-A11Y-001, AC-13).
 *
 * Ensures that users with vestibular disorders or reduced motion preferences
 * receive immediately accessible, non-blocking content without gratuitous movement.
 */
import type { AnimationTrack } from "@/lib/schema";

/**
 * Returns true if the client environment explicitly requests reduced motion.
 * Always returns false in SSR / non-browser environments.
 */
export function isPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Normalizes an animation track according to reduced-motion rules.
 * When reduced motion is preferred:
 * - Durations and delays are clamped to 0.
 * - Stagger amounts are eliminated.
 * - Loops/repeats are cancelled so nothing oscillates continuously.
 */
export function resolveReducedMotionBehavior(
  track: AnimationTrack,
  reducedMotionPreferred: boolean = isPrefersReducedMotion(),
): AnimationTrack {
  if (!reducedMotionPreferred) {
    return track;
  }

  return {
    ...track,
    durationMs: 0,
    delayMs: 0,
    staggerAmountMs: 0,
    repeat: 0,
    yoyo: false,
  };
}
