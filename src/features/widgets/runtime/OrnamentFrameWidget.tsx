"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getOrnamentShape } from "../ornament-shapes";
import { parseFrameImage } from "./PhotoFrameWidget";
import type { WidgetStyleProps } from "./WidgetFrame";
import styles from "./OrnamentFrameWidget.module.css";

export interface OrnamentFrameWidgetProps {
  readonly shape?: string;
  readonly image?: unknown;
  readonly title?: string;
  readonly subtitle?: string;
  readonly caption?: string;
  readonly strokeWidth?: number;
  readonly strokeColor?: string;
  readonly fillColor?: string;
  readonly glowColor?: string;
  readonly doubleBorder?: boolean;
  readonly animationMode?: "scroll" | "loop" | "none";
  readonly animationSpeed?: "slow" | "normal" | "fast";
  readonly showGlow?: boolean;
  readonly style?: WidgetStyleProps;
}

export function OrnamentFrameWidget({
  shape,
  image,
  title,
  subtitle,
  caption,
  strokeWidth = 2,
  strokeColor,
  fillColor,
  glowColor,
  doubleBorder = true,
  animationMode = "scroll",
  animationSpeed = "normal",
  showGlow = true,
  style,
}: OrnamentFrameWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPathRef = useRef<SVGPathElement>(null);
  const rawId = useId();
  const clipId = `ornament-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const filterId = `ornament-glow-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const activeShapeId = shape || style?.variant || "arch-window";
  const shapeData = getOrnamentShape(activeShapeId);

  const resolvedStroke = strokeColor || style?.color || "#b4833e";
  const resolvedFill = fillColor || style?.background || "transparent";
  const resolvedGlow = glowColor || "#fbbf24";
  const imgSrc = parseFrameImage(image);

  const [pathLength, setPathLength] = useState<number>(600);
  const [isActive, setIsActive] = useState<boolean>(() => animationMode === "none");
  const [isMet, setIsMet] = useState<boolean>(() => animationMode === "none");

  // Measure path length on mount & shape switch
  useEffect(() => {
    if (leftPathRef.current && typeof leftPathRef.current.getTotalLength === "function") {
      try {
        const len = leftPathRef.current.getTotalLength();
        if (len > 0) setPathLength(Math.ceil(len));
      } catch {
        // Fallback for jsdom
      }
    }
  }, [shapeData.id]);

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
        setIsMet(true);
      }, 0);
      return () => clearTimeout(fallbackTimer);
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsActive(true);
            const animDurationMs =
              animationSpeed === "slow" ? 3600 : animationSpeed === "fast" ? 1500 : 2200;
            timer = setTimeout(() => {
              setIsMet(true);
            }, animDurationMs);
          } else {
            // Reset when scrolled far away so it can re-trigger gracefully
            if (entry.intersectionRatio <= 0.05) {
              setIsActive(false);
              setIsMet(false);
              if (timer) clearTimeout(timer);
            }
          }
        }
      },
      {
        threshold: [0, 0.15, 0.3],
        rootMargin: "0px 0px -8% 0px",
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [animationMode, animationSpeed]);

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

  const hasPhoto = Boolean(imgSrc);
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
        viewBox="0 0 400 260"
        className={styles.svg}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {hasPhoto && (
            <clipPath id={clipId}>
              <path d={doubleBorder ? shapeData.innerFullPath : shapeData.fullPath} />
            </clipPath>
          )}
        </defs>

        {/* 1. Base Fill */}
        <path d={shapeData.fullPath} fill={resolvedFill} stroke="none" />

        {/* 2. Photo inside the shape (clipped to contour) */}
        {hasPhoto && imgSrc && (
          <image
            href={imgSrc}
            x="0"
            y="0"
            width="400"
            height="260"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        )}

        {/* 3. Track Stroke (Light background outline track) */}
        <path
          d={shapeData.fullPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={Math.max(1, strokeWidth - 0.5)}
          opacity={animationMode === "none" ? 0 : 0.22}
          className={styles.baseTrack}
        />

        {/* 4. Inner Double-Border (if enabled) */}
        {doubleBorder && (
          <path
            d={shapeData.innerFullPath}
            fill="none"
            stroke={resolvedStroke}
            strokeWidth={Math.max(0.75, strokeWidth * 0.65)}
            opacity={0.4}
            className={styles.innerTrack}
          />
        )}

        {/* 5. Left Animated Path (Starts top-center, flows down left edge) */}
        <path
          ref={leftPathRef}
          d={shapeData.leftPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
          className={`${styles.animatedStroke} ${
            animationMode === "loop" ? styles.loopActiveLeft : ""
          }`}
        />

        {/* 6. Right Animated Path (Starts top-center, flows down right edge) */}
        <path
          d={shapeData.rightPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
          className={`${styles.animatedStroke} ${
            animationMode === "loop" ? styles.loopActiveRight : ""
          }`}
        />

        {/* 7. Meeting Pulse Shimmer when lines meet at the bottom */}
        {showGlow && isMet && (
          <circle
            cx={200}
            cy={250}
            r={strokeWidth * 2.2 + 2}
            fill={resolvedGlow}
            filter={`url(#${filterId})`}
            className={styles.shimmerPulse}
          />
        )}
      </svg>

      {/* 8. Text & Labels (Optional) */}
      {hasText && (
        <div
          className={`${styles.innerContent} ${hasPhoto ? "" : styles.contentCenter}`}
        >
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
