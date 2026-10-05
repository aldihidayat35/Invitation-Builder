"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getOrnamentShape } from "../ornament-shapes";
import type { WidgetStyleProps } from "./WidgetFrame";
import styles from "./OrnamentFrameWidget.module.css";

export interface OrnamentFrameWidgetProps {
  readonly shape?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly caption?: string;
  readonly strokeWidth?: number;
  readonly strokeColor?: string;
  readonly fillColor?: string;
  readonly doubleBorder?: boolean;
  readonly animationMode?: "scroll" | "loop" | "none";
  readonly animationSpeed?: "slow" | "normal" | "fast";
  readonly style?: WidgetStyleProps;
}

export function OrnamentFrameWidget({
  shape,
  title,
  subtitle,
  caption,
  strokeWidth = 2,
  strokeColor,
  fillColor,
  doubleBorder = true,
  animationMode = "scroll",
  animationSpeed = "normal",
  style,
}: OrnamentFrameWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPathRef = useRef<SVGPathElement>(null);

  const [dimensions, setDimensions] = useState<{ w: number; h: number }>({ w: 400, h: 260 });
  const [pathLength, setPathLength] = useState<number>(650);

  const activeShapeId = shape || style?.variant || "arch-window";

  // Dynamic responsive path generation for container dimensions
  const shapeData = useMemo(
    () => getOrnamentShape(activeShapeId, dimensions.w, dimensions.h),
    [activeShapeId, dimensions.w, dimensions.h],
  );

  const resolvedStroke = strokeColor || style?.color || "#b4833e";
  const resolvedFill = fillColor || style?.background || "transparent";

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

  // Smooth IntersectionObserver-driven scroll reveal
  useEffect(() => {
    if (animationMode !== "scroll" || typeof window === "undefined") {
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

  // Dash is exact pathLength, gap is 2x pathLength so it NEVER wraps around or shows a gap
  const dashOffset = useMemo(() => {
    if (animationMode === "none") return 0;
    if (animationMode === "loop") return undefined;
    return isActive ? 0 : pathLength;
  }, [animationMode, isActive, pathLength]);

  const hasText = Boolean(title || subtitle || caption);

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
        {/* 1. Base Fill & Outer Card Boundary */}
        <path
          d={shapeData.fullPath}
          fill={resolvedFill}
          stroke={doubleBorder ? resolvedStroke : "none"}
          strokeWidth={strokeWidth}
          className={styles.outerBorder}
        />

        {/* 2. Inner Outline Faint Track (guide line inside the shape) */}
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

        {/* 3. Left Animated Moving Line (Traces along INNER outline from top to bottom) */}
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

        {/* 4. Right Animated Moving Line (Traces along INNER outline from top to bottom) */}
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

      {/* 5. Typography / Text (Optional) */}
      {hasText && (
        <div className={styles.innerContent}>
          {title && <p className={styles.topBadge}>{title}</p>}
          {(subtitle || caption) && (
            <div className={styles.bottomGroup}>
              {subtitle && <h3 className={styles.title}>{subtitle}</h3>}
              {caption && <p className={styles.caption}>{caption}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
