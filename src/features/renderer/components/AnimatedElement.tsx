"use client";

import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { playAnimation, playMotionAnimation } from "@/features/animations";
import type { Element } from "@/lib/schema";

export interface AnimatedElementProps {
  /** Canonical or resolved element: only `id` and `animations` are read. */
  readonly element: Element | { readonly id: string; readonly animations?: Element["animations"] };
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly "data-testid"?: string;
  readonly "data-element-type"?: string;
}

/**
 * Wraps an element for the HTML renderer and applies its enter/motion/attention/exit
 * animation track using the GSAP runtime (FR-ANM-001..006, AC-07, AC-11).
 */
export function AnimatedElement({
  element,
  children,
  className,
  style,
  "data-testid": testId,
  "data-element-type": elementType,
}: AnimatedElementProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const enterTrack = element.animations?.enter;
  const attentionTrack = element.animations?.attention;
  const exitTrack = element.animations?.exit;
  const motionTrack = element.animations?.motion;

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;

    let cleanupEnter: (() => void) | null = null;
    let cleanupAttention: (() => void) | null = null;
    let cleanupExit: (() => void) | null = null;
    let cleanupMotion: (() => void) | null = null;

    const play = () => {
      cleanupEnter?.();
      cleanupAttention?.();
      cleanupExit?.();
      cleanupMotion?.();

      if (motionTrack && motionTrack.enabled) {
        cleanupMotion = playMotionAnimation(el, motionTrack);
      }

      if (enterTrack) {
        cleanupEnter = playAnimation(el, enterTrack, {
          onComplete: () => {
            if (attentionTrack && rootRef.current) {
              cleanupAttention = playAnimation(rootRef.current, attentionTrack);
            }
          },
        });
      } else if (attentionTrack) {
        cleanupAttention = playAnimation(el, attentionTrack);
      }

      if (exitTrack) {
        cleanupExit = playAnimation(el, exitTrack);
      }
    };

    play();

    const handleReplay = (e: Event) => {
      const custom = e as CustomEvent<{ elementId?: string; sectionId?: string }>;
      if (!custom.detail || (!custom.detail.elementId && !custom.detail.sectionId)) {
        play();
        return;
      }
      if (custom.detail.elementId === element.id) {
        play();
        return;
      }
      if (custom.detail.sectionId && el.closest(`[data-section-id="${custom.detail.sectionId}"]`)) {
        play();
      }
    };

    window.addEventListener("dib:replay-animation", handleReplay);

    return () => {
      window.removeEventListener("dib:replay-animation", handleReplay);
      cleanupEnter?.();
      cleanupAttention?.();
      cleanupExit?.();
      cleanupMotion?.();
    };
  }, [element.id, enterTrack, attentionTrack, exitTrack, motionTrack]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={style}
      data-element-id={element.id}
      data-element-type={elementType}
      data-animation-preset={
        enterTrack?.presetId ??
        (motionTrack?.enabled ? `motion-${motionTrack.preset}` : undefined) ??
        attentionTrack?.presetId ??
        exitTrack?.presetId
      }
      data-testid={testId}
    >
      {children}
    </div>
  );
}
