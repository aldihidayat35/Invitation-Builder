"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { getSectionTransitionStyles } from "@/features/animations/section-transitions";
import type { ResolvedSection } from "@/lib/engine";

export interface AnimatedSectionProps {
  readonly section: ResolvedSection;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly first?: boolean;
}

export function AnimatedSection({
  section,
  children,
  className,
  style,
  first = false,
}: AnimatedSectionProps): ReactElement {
  const sectionRef = useRef<HTMLElement>(null);
  const transition = section.transition;
  const hasTransition = Boolean(transition && transition.type !== "none");

  // First section defaults to visible so above-the-fold content appears immediately.
  // Must be identical on both server and client to avoid SSR hydration mismatch.
  const [isVisible, setIsVisible] = useState<boolean>(!hasTransition || first);

  useEffect(() => {
    if (!hasTransition || !sectionRef.current) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const node = sectionRef.current;

    let observer: IntersectionObserver | null = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsVisible(true);
          if (transition?.once) {
            observer?.disconnect();
            observer = null;
          }
        } else if (!transition?.once) {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer?.disconnect();
    };
  }, [hasTransition, transition?.once, transition?.type]);

  useEffect(() => {
    if (!hasTransition) return;
    const handleReplay = (e: Event) => {
      const custom = e as CustomEvent<{ sectionId?: string }>;
      if (!custom.detail?.sectionId || custom.detail.sectionId === section.id) {
        setIsVisible(false);
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }
    };
    window.addEventListener("dib:replay-animation", handleReplay);
    return () => window.removeEventListener("dib:replay-animation", handleReplay);
  }, [hasTransition, section.id]);

  const dynamicTransitionStyle = hasTransition
    ? getSectionTransitionStyles(transition, isVisible)
    : {};

  const mergedStyle: CSSProperties = {
    ...style,
    ...dynamicTransitionStyle,
  };

  return (
    <section
      ref={sectionRef}
      className={className}
      data-section-id={section.id}
      aria-label={section.name}
      data-section-transition={transition?.type ?? "none"}
      data-section-transition-state={isVisible ? "visible" : "hidden"}
      style={mergedStyle}
      suppressHydrationWarning
    >
      {children}
    </section>
  );
}
