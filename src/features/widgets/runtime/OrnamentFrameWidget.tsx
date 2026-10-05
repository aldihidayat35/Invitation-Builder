"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getOrnamentShape } from "../ornament-shapes";
import { parseFrameImage } from "./PhotoFrameWidget";
import type { WidgetStyleProps } from "./WidgetFrame";
import styles from "./OrnamentFrameWidget.module.css";

export interface OrnamentFrameWidgetProps {
  readonly shape?: string;
  readonly innerGap?: number;
  readonly fillOpacity?: number;
  readonly image?: unknown;
  readonly imageOpacity?: number;
  readonly strokeWidth?: number;
  readonly strokeColor?: string;
  readonly fillColor?: string;
  readonly doubleBorder?: boolean;
  readonly animationMode?: "once" | "scroll" | "loop" | "none";
  readonly animationSpeed?: "slow" | "normal" | "fast";
  readonly style?: WidgetStyleProps;
}

export function OrnamentFrameWidget({
  shape,
  innerGap = 12,
  fillOpacity = 100,
  image,
  imageOpacity = 100,
  strokeWidth = 2,
  strokeColor,
  fillColor,
  doubleBorder = true,
  animationMode = "once",
  animationSpeed = "normal",
  style,
}: OrnamentFrameWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPathRef = useRef<SVGPathElement>(null);
  const rawId = useId();
  const clipId = `ornament-clip-${rawId.replace(/[^a-zA-Z0-9-_]/g, "")}`;

  const [dimensions, setDimensions] = useState<{ w: number; h: number }>({ w: 400, h: 260 });
  const [pathLength, setPathLength] = useState<number>(650);

  const activeShapeId = shape || style?.variant || "arch-window";

  // Dynamic responsive path generation for container dimensions and innerGap
  const shapeData = useMemo(
    () => getOrnamentShape(activeShapeId, dimensions.w, dimensions.h, innerGap),
    [activeShapeId, dimensions.w, dimensions.h, innerGap],
  );

  const resolvedStroke = strokeColor || style?.color || "#b4833e";
  const resolvedFill = fillColor || style?.background || "transparent";
  const resolvedImageUrl = useMemo(() => parseFrameImage(image), [image]);

  const [isActive, setIsActive] = useState<boolean>(() => animationMode === "none");

  // Track real container width & height to scale geometry flexibly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w > 20 && h > 20) {
        setDimensions((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 20 && height > 20) {
            const rw = Math.round(width);
            const rh = Math.round(height);
            setDimensions((prev) => (prev.w === rw && prev.h === rh ? prev : { w: rw, h: rh }));
          }
        }
      });
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, []);

  // Measure path length dynamically to ensure 100% stroke coverage at ANY height
  useEffect(() => {
    if (leftPathRef.current && typeof leftPathRef.current.getTotalLength === "function") {
      try {
        const len = leftPathRef.current.getTotalLength();
        if (len > 0) {
          setPathLength(Math.ceil(len));
        }
      } catch {
        // Fallback for jsdom
      }
    }
  }, [shapeData]);

  // IntersectionObserver-driven reveal (once, scroll, or none)
  useEffect(() => {
    if (animationMode === "none" || animationMode === "loop" || typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = setTimeout(() => {
        setIsActive(true);
      }, 0);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsActive(true);
            if (animationMode === "once") {
              observer.disconnect();
            }
          } else if (animationMode === "scroll") {
            setIsActive(false);
          }
        }
      },
      {
        threshold: 0.1,
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [animationMode]);

  const durationStr = useMemo(() => {
    if (animationSpeed === "slow") return "3.6s";
    if (animationSpeed === "fast") return "1.5s";
    return "2.2s";
  }, [animationSpeed]);

  const dashOffset = useMemo(() => {
    if (animationMode === "none") return 0;
    if (animationMode === "loop") return undefined;
    return isActive ? 0 : pathLength;
  }, [animationMode, isActive, pathLength]);

  const normalizedFillOpacity = Math.max(0, Math.min(100, fillOpacity)) / 100;
  const normalizedImageOpacity = Math.max(0, Math.min(100, imageOpacity)) / 100;

  return (
    <div
      ref={containerRef}
      className={styles.container}
      data-widget="ornamentFrame"
      data-variant={shapeData.id}
      data-testid={`ornament-frame-${shapeData.id}`}
      style={{
        ["--frame-text" as string]: resolvedStroke,
        ["--dash-len" as string]: `${pathLength}px`,
        ["--anim-duration" as string]: durationStr,
      }}
    >
      <svg
        viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
        className={styles.svg}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={shapeData.fullPath} />
          </clipPath>
        </defs>

        {/* 1. Base Fill & Outer Card Boundary */}
        <path
          d={shapeData.fullPath}
          fill={resolvedFill}
          fillOpacity={resolvedFill === "transparent" ? 1 : normalizedFillOpacity}
          stroke={doubleBorder ? resolvedStroke : "none"}
          strokeWidth={strokeWidth}
          className={styles.outerBorder}
        />

        {/* 2. Optional Photo clipped inside shape with opacity control */}
        {resolvedImageUrl && (
          <image
            href={resolvedImageUrl}
            x={0}
            y={0}
            width={dimensions.w}
            height={dimensions.h}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            opacity={normalizedImageOpacity}
          />
        )}

        {/* 3. Inner Outline Faint Track (guide line inside the shape) */}
        {doubleBorder && (
          <path
            d={shapeData.innerFullPath}
            fill="none"
            stroke={resolvedStroke}
            strokeWidth={Math.max(1, strokeWidth * 0.7)}
            opacity={0.25}
            className={styles.innerTrack}
          />
        )}

        {/* 4. Left Animated Moving Line (Traces along INNER outline from top to bottom) */}
        <path
          ref={leftPathRef}
          d={doubleBorder ? shapeData.innerLeftPath : shapeData.leftPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${pathLength} ${pathLength * 2}`}
          strokeDashoffset={dashOffset}
          className={`${styles.animatedStroke} ${
            animationMode === "loop" ? styles.loopActiveLeft : ""
          }`}
        />

        {/* 5. Right Animated Moving Line (Traces along INNER outline from top to bottom) */}
        <path
          d={doubleBorder ? shapeData.innerRightPath : shapeData.rightPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${pathLength} ${pathLength * 2}`}
          strokeDashoffset={dashOffset}
          className={`${styles.animatedStroke} ${
            animationMode === "loop" ? styles.loopActiveRight : ""
          }`}
        />
      </svg>
    </div>
  );
}
