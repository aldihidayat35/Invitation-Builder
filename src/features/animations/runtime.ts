/**
 * GSAP Animation Runtime Engine (FR-ANM-001..006, AC-07, AC-13).
 *
 * Executes declarative animation tracks via GSAP with transform/opacity-first
 * acceleration, IntersectionObserver for onEnterViewport, and full respect for
 * prefers-reduced-motion.
 */
import gsap from "gsap";
import type { AnimationTrack } from "@/lib/schema";
import { animationPresetRegistry } from "./registry";
import { isPrefersReducedMotion, resolveReducedMotionBehavior } from "./reduced-motion";
import type { PlayAnimationOptions, TransformProperties } from "./types";

function toGsapVars(props: TransformProperties): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  if (props.opacity !== undefined) vars.opacity = props.opacity;
  if (props.x !== undefined) vars.x = props.x;
  if (props.y !== undefined) vars.y = props.y;
  if (props.scale !== undefined) vars.scale = props.scale;
  if (props.scaleX !== undefined) vars.scaleX = props.scaleX;
  if (props.scaleY !== undefined) vars.scaleY = props.scaleY;
  if (props.rotation !== undefined) vars.rotation = props.rotation;
  if (props.transformOrigin !== undefined) vars.transformOrigin = props.transformOrigin;
  return vars;
}

export type AnimationCleanup = () => void;

/**
 * Executes an animation on an HTML DOM node.
 * Returns an idempotent cleanup function.
 */
export function playAnimation(
  element: HTMLElement,
  rawTrack: AnimationTrack,
  options: PlayAnimationOptions = {},
): AnimationCleanup {
  let cleanedUp = false;
  let activeTween: gsap.core.Tween | gsap.core.Timeline | null = null;
  let observer: IntersectionObserver | null = null;
  let clickHandler: ((e: MouseEvent) => void) | null = null;

  const reducedMotion = !options.forcePlay && isPrefersReducedMotion();
  const track = resolveReducedMotionBehavior(rawTrack, reducedMotion);

  const preset =
    animationPresetRegistry.get(track.presetId) ?? animationPresetRegistry.get("fadeIn")!;

  // Resolve target elements (either child chars/words or the element itself)
  const charElements = element.querySelectorAll<HTMLElement>("[data-anim-char]");
  const wordElements = element.querySelectorAll<HTMLElement>("[data-anim-word]");

  let targets: HTMLElement | HTMLElement[];
  let isStaggered = false;

  if (track.staggerUnit === "char" && charElements.length > 0) {
    targets = Array.from(charElements);
    isStaggered = true;
  } else if (track.staggerUnit === "word" && wordElements.length > 0) {
    targets = Array.from(wordElements);
    isStaggered = true;
  } else {
    targets = element;
  }

  const fromVars = toGsapVars(preset.keyframes.from);
  const toVars = toGsapVars(preset.keyframes.to);

  const execute = () => {
    if (cleanedUp) return;
    options.onStart?.();

    if (reducedMotion) {
      // Instant reveal for reduced-motion users (AC-13, NFR-A11Y-001)
      gsap.set(targets, { ...toVars, clearProps: "transform" });
      options.onComplete?.();
      return;
    }

    const durationSec = track.durationMs / 1000;
    const delaySec = track.delayMs / 1000;
    const staggerSec = isStaggered
      ? (track.staggerAmountMs || preset.defaultStaggerAmountMs || 40) / 1000
      : 0;

    const tweenVars: gsap.TweenVars = {
      ...toVars,
      duration: durationSec,
      delay: delaySec,
      ease: track.easing,
      repeat: track.repeat,
      yoyo: track.yoyo,
      onComplete: () => {
        options.onComplete?.();
      },
    };

    if (isStaggered && staggerSec > 0) {
      tweenVars.stagger = staggerSec;
    }

    activeTween = gsap.fromTo(targets, fromVars, tweenVars);
  };

  // Trigger dispatching
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
        // Fallback when IntersectionObserver is unavailable
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
