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

  const activeShapeId = shape || style?.variant || "arch-window";
  const shapeData = getOrnamentShape(activeShapeId);

  const resolvedStroke = strokeColor || style?.color || "#b4833e";
  const resolvedFill = fillColor || style?.background || "transparent";

  const [isActive, setIsActive] = useState<boolean>(() => animationMode === "none");

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

  // Using standard SVG pathLength={1000} guarantees 100% stroke completion down to bottom
  const dashOffset = useMemo(() => {
    if (animationMode === "none") return 0;
    if (animationMode === "loop") return undefined;
    return isActive ? 0 : 1000;
  }, [animationMode, isActive]);

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
        ["--anim-duration" as string]: durationStr,
      }}
    >
      <svg
        viewBox="0 0 400 260"
        className={styles.svg}
        preserveAspectRatio="none"
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
          d={doubleBorder ? shapeData.innerLeftPath : shapeData.leftPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          pathLength={1000}
          strokeDasharray={1000}
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
          pathLength={1000}
          strokeDasharray={1000}
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
