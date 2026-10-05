"use client";

import { useEffect, useRef, useState } from "react";
import { getOrnamentShape } from "../ornament-shapes";
import type { WidgetStyleProps } from "./WidgetFrame";
import styles from "./OrnamentFrameWidget.module.css";

export interface OrnamentFrameWidgetProps {
  readonly shape?: string;
  readonly title?: string;
  readonly subtitle?: string;
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

function findScrollContainer(element: HTMLElement | null): HTMLElement | Window {
  if (!element || typeof window === "undefined") return window;
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
}

export function OrnamentFrameWidget({
  shape,
  title,
  subtitle,
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
  const rightPathRef = useRef<SVGPathElement>(null);

  const activeShapeId = shape || style?.variant || "notched-bracket";
  const shapeData = getOrnamentShape(activeShapeId);

  const resolvedStroke = strokeColor || style?.color || "#b4833e";
  const resolvedFill = fillColor || style?.background || "transparent";
  const resolvedGlow = glowColor || "#fbbf24";

  const [pathLength, setPathLength] = useState<number>(550);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [leftTip, setLeftTip] = useState<{ x: number; y: number }>({ x: 200, y: 10 });
  const [rightTip, setRightTip] = useState<{ x: number; y: number }>({ x: 200, y: 10 });
  const [isMet, setIsMet] = useState(false);

  const isNone = animationMode === "none";
  const effectiveProgress = isNone ? 1 : scrollProgress;
  const isEffectiveMet = isNone ? true : isMet;

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

  // Handle scroll animation
  useEffect(() => {
    if (animationMode !== "scroll" || typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const scrollTarget = findScrollContainer(container);

    let rafId: number | null = null;
    let targetProgress = 0;
    let currentProgress = 0;

    const updateTips = (progress: number) => {
      if (leftPathRef.current && typeof leftPathRef.current.getPointAtLength === "function") {
        try {
          const ptL = leftPathRef.current.getPointAtLength(progress * pathLength);
          setLeftTip({ x: ptL.x, y: ptL.y });
        } catch {
          // ignore in testing
        }
      }
      if (rightPathRef.current && typeof rightPathRef.current.getPointAtLength === "function") {
        try {
          const ptR = rightPathRef.current.getPointAtLength(progress * pathLength);
          setRightTip({ x: ptR.x, y: ptR.y });
        } catch {
          // ignore in testing
        }
      }
    };

    const animate = () => {
      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) > 0.002) {
        currentProgress += diff * 0.18;
        setScrollProgress(currentProgress);
        updateTips(currentProgress);
        setIsMet(currentProgress >= 0.96);
        rafId = requestAnimationFrame(animate);
      } else {
        currentProgress = targetProgress;
        setScrollProgress(currentProgress);
        updateTips(currentProgress);
        setIsMet(currentProgress >= 0.96);
        rafId = null;
      }
    };

    const handleScroll = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const viewportH =
        scrollTarget instanceof HTMLElement
          ? scrollTarget.getBoundingClientRect().height
          : window.innerHeight;

      const viewportTop =
        scrollTarget instanceof HTMLElement
          ? scrollTarget.getBoundingClientRect().top
          : 0;

      const elemRelativeTop = rect.top - viewportTop;
      // Start when element enters from bottom, complete when it reaches upper-middle
      const enterThreshold = viewportH * 0.95;
      const completeThreshold = viewportH * 0.35;

      const progress = (enterThreshold - elemRelativeTop) / (enterThreshold - completeThreshold);
      targetProgress = Math.max(0, Math.min(1, progress));

      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    };

    handleScroll();

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [animationMode, pathLength]);

  const dashOffset =
    animationMode === "scroll"
      ? pathLength * (1 - effectiveProgress)
      : animationMode === "none"
        ? 0
        : undefined;

  const durationStyle =
    animationSpeed === "slow"
      ? { animationDuration: "4.5s" }
      : animationSpeed === "fast"
        ? { animationDuration: "1.8s" }
        : { animationDuration: "3s" };

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
      }}
    >
      <svg
        viewBox="0 0 400 260"
        className={styles.svg}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`ornament-glow-${shapeData.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Fill */}
        <path d={shapeData.fullPath} fill={resolvedFill} stroke="none" />

        {/* 2. Track Stroke (Light background outline) */}
        <path
          d={shapeData.fullPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={Math.max(1, strokeWidth - 0.5)}
          opacity={animationMode === "none" ? 0 : 0.25}
          className={styles.baseTrack}
        />

        {/* 3. Inner Double-Border (if enabled) */}
        {doubleBorder && (
          <path
            d={shapeData.innerFullPath}
            fill="none"
            stroke={resolvedStroke}
            strokeWidth={Math.max(0.75, strokeWidth * 0.65)}
            opacity={0.45}
            className={styles.innerTrack}
          />
        )}

        {/* 4. Left Animated Path */}
        <path
          ref={leftPathRef}
          d={shapeData.leftPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
          className={`${styles.activeStroke} ${
            animationMode === "loop" ? styles.loopActiveLeft : ""
          }`}
          style={animationMode === "loop" ? durationStyle : undefined}
        />

        {/* 5. Right Animated Path */}
        <path
          ref={rightPathRef}
          d={shapeData.rightPath}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
          className={`${styles.activeStroke} ${
            animationMode === "loop" ? styles.loopActiveRight : ""
          }`}
          style={animationMode === "loop" ? durationStyle : undefined}
        />

        {/* 6. Glowing Comet Head at Leading Edge (Top to Bottom Meeting Effect) */}
        {showGlow && animationMode === "scroll" && effectiveProgress > 0.02 && (
          <>
            <circle
              cx={leftTip.x}
              cy={leftTip.y}
              r={strokeWidth * 1.5 + 1.5}
              fill={resolvedGlow}
              opacity={effectiveProgress > 0.05 ? 0.95 : 0}
              filter={`url(#ornament-glow-${shapeData.id})`}
              className={styles.cometGlow}
            />
            <circle
              cx={rightTip.x}
              cy={rightTip.y}
              r={strokeWidth * 1.5 + 1.5}
              fill={resolvedGlow}
              opacity={effectiveProgress > 0.05 ? 0.95 : 0}
              filter={`url(#ornament-glow-${shapeData.id})`}
              className={styles.cometGlow}
            />
          </>
        )}

        {/* 7. Meeting Pulse Shimmer when both ends meet at bottom */}
        {showGlow && isEffectiveMet && (
          <circle
            cx={200}
            cy={250}
            r={strokeWidth * 2.2 + 2}
            fill={resolvedGlow}
            filter={`url(#ornament-glow-${shapeData.id})`}
            className={styles.shimmerPulse}
          />
        )}
      </svg>

      {/* Optional Inner Typography */}
      {(title || subtitle) && (
        <div className={styles.innerContent}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
