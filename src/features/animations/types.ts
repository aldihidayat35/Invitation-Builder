/**
 * Animation System Types (Fase 7, PRD §12, FR-ANM-001..006).
 *
 * Data preset definitions are completely decoupled from runtime GSAP execution (P-09).
 */
import type { AnimationEasing, Element } from "@/lib/schema";

export type AnimationCategory = "enter" | "text" | "attention" | "exit";

export interface TransformProperties {
  readonly opacity?: number;
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly rotation?: number;
  readonly transformOrigin?: string;
}

export interface AnimationKeyframes {
  readonly from: TransformProperties;
  readonly to: TransformProperties;
}

export interface AnimationPreset {
  readonly id: string;
  readonly category: AnimationCategory;
  readonly label: string;
  readonly description: string;
  /** Supported element types for this preset. */
  readonly applicableElements: readonly Element["type"][];
  readonly defaultDurationMs: number;
  readonly defaultDelayMs: number;
  readonly defaultEasing: AnimationEasing;
  readonly defaultStaggerUnit?: "none" | "char" | "word";
  readonly defaultStaggerAmountMs?: number;
  readonly keyframes: AnimationKeyframes;
  /** Whether the animation repeats continuously (e.g. attention/loop). */
  readonly loop?: boolean;
  readonly yoyo?: boolean;
}

export interface PlayAnimationOptions {
  /** Override reduced-motion check (useful for manual preview/replay). */
  readonly forcePlay?: boolean;
  /** Custom root or threshold for IntersectionObserver. */
  readonly observerThreshold?: number;
  /** Callback fired when animation finishes. */
  readonly onComplete?: () => void;
  /** Callback fired when animation starts. */
  readonly onStart?: () => void;
}
