"use client";

import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { playAnimation } from "@/features/animations";
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
 * Wraps an element for the HTML renderer and applies its enter/attention/exit
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

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;

    let cleanupEnter: (() => void) | null = null;
    let cleanupAttention: (() => void) | null = null;
    let cleanupExit: (() => void) | null = null;

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

    return () => {
      cleanupEnter?.();
      cleanupAttention?.();
      cleanupExit?.();
    };
  }, [enterTrack, attentionTrack, exitTrack]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={style}
      data-element-id={element.id}
      data-element-type={elementType}
      data-animation-preset={
        enterTrack?.presetId ?? attentionTrack?.presetId ?? exitTrack?.presetId
      }
      data-testid={testId}
    >
      {children}
    </div>
  );
}
