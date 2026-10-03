"use client";

import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { playAnimation } from "@/features/animations";
import type { Element } from "@/lib/schema";

export interface AnimatedElementProps {
  readonly element: Element;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly "data-testid"?: string;
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
}: AnimatedElementProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const track = element.animations?.enter;

  useEffect(() => {
    if (!track || !rootRef.current) return;
    const cleanup = playAnimation(rootRef.current, track);
    return cleanup;
  }, [track]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={style}
      data-element-id={element.id}
      data-animation-preset={track?.presetId}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
