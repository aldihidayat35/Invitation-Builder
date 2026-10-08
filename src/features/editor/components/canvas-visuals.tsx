"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from "react-konva";
import type { Element, ImageFade, ThemeTokens, VariableDefinition } from "@/lib/schema";
import { assetUrl } from "@/features/assets/urls";
import { defaultWidgetRegistry, resolveWidgetStyleVariant } from "@/features/widgets";
import {
  DEFAULT_COUNTDOWN_LABELS,
  computeCountdown,
  greetingParts,
  type CountdownUnit,
} from "@/features/widgets/logic";
import { fitImage } from "@/lib/image-fit";
import { resolveColor } from "../core/display";
import { parseGiftAccounts } from "@/features/widgets/runtime/GiftWidget";
import { parseGalleryItems } from "@/features/widgets/runtime/GalleryWidget";
import { CanvasGalleryPhoto, CurrentWidgetVisual } from "./canvas-widget-variants";
import { useCanvasImage } from "./use-canvas-image";
import { konvaShadowProps } from "../core/shadow";

type ImageElement = Extract<Element, { type: "image" }>;
type WidgetElement = Extract<Element, { type: "widget" }>;

function Placeholder({
  w,
  h,
  title,
  subtitle,
}: {
  w: number;
  h: number;
  title: string;
  subtitle?: string | undefined;
}) {
  return (
    <>
      <Rect
        width={w}
        height={h}
        fill="#ece6dc"
        stroke="#b8a999"
        strokeWidth={1}
        dash={[6, 4]}
        listening={false}
      />
      <Text
        width={w}
        height={h}
        text={subtitle ? `${title}\n${subtitle}` : title}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        lineHeight={1.4}
        padding={6}
        fill="#6f6254"
        listening={false}
      />
    </>
  );
}

function hasActiveFade(fade?: ImageFade): boolean {
  if (!fade) return false;
  if (fade.mode === "radial") return (fade.radial ?? 0) > 0;
  return (
    (fade.top ?? 0) > 0 ||
    (fade.bottom ?? 0) > 0 ||
    (fade.left ?? 0) > 0 ||
    (fade.right ?? 0) > 0
  );
}

function createMaskedImageCanvas({
  image,
  crop,
  dest,
  w,
  h,
  fade,
}: {
  image: CanvasImageSource;
  crop: { x: number; y: number; width: number; height: number };
  dest: { x: number; y: number; width: number; height: number };
  w: number;
  h: number;
  fade: ImageFade;
}): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Draw source image inside destination area
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    dest.x,
    dest.y,
    dest.width,
    dest.height,
  );

  // 2. Alpha mask using destination-in
  ctx.globalCompositeOperation = "destination-in";

  if (fade.mode === "radial") {
    const rad = fade.radial ?? 0;
    if (rad > 0) {
      const inner = Math.max(0, 100 - rad) / 100;
      const stop1 = Math.min(1, (Math.max(0, 100 - rad) + rad * 0.35) / 100);
      const stop2 = Math.min(1, (Math.max(0, 100 - rad) + rad * 0.7) / 100);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(w / 2, h / 2);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, "rgba(0, 0, 0, 1)");
      grad.addColorStop(inner, "rgba(0, 0, 0, 1)");
      grad.addColorStop(stop1, "rgba(0, 0, 0, 0.8)");
      grad.addColorStop(stop2, "rgba(0, 0, 0, 0.3)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    return canvas;
  }

  // Linear mode: vertical (top/bottom) and horizontal (left/right)
  const top = fade.top ?? 0;
  const bottom = fade.bottom ?? 0;
  const left = fade.left ?? 0;
  const right = fade.right ?? 0;

  if (top > 0 || bottom > 0) {
    const vGrad = ctx.createLinearGradient(0, 0, 0, h);
    let last = 0;
    const addStop = (offset: number, col: string) => {
      const clamped = Math.max(last, Math.min(1, Math.max(0, offset)));
      vGrad.addColorStop(clamped, col);
      last = clamped;
    };

    if (top > 0) {
      addStop(0, "rgba(0, 0, 0, 0)");
      addStop((top * 0.3) / 100, "rgba(0, 0, 0, 0.3)");
      addStop((top * 0.65) / 100, "rgba(0, 0, 0, 0.65)");
      addStop(top / 100, "rgba(0, 0, 0, 1)");
    } else {
      addStop(0, "rgba(0, 0, 0, 1)");
    }

    if (bottom > 0) {
      const bStart = Math.max(top, 100 - bottom) / 100;
      addStop(bStart, "rgba(0, 0, 0, 1)");
      addStop((100 - bottom * 0.65) / 100, "rgba(0, 0, 0, 0.65)");
      addStop((100 - bottom * 0.3) / 100, "rgba(0, 0, 0, 0.3)");
      addStop(1, "rgba(0, 0, 0, 0)");
    } else {
      addStop(1, "rgba(0, 0, 0, 1)");
    }

    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
  }

  if (left > 0 || right > 0) {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    let last = 0;
    const addStop = (offset: number, col: string) => {
      const clamped = Math.max(last, Math.min(1, Math.max(0, offset)));
      hGrad.addColorStop(clamped, col);
      last = clamped;
    };

    if (left > 0) {
      addStop(0, "rgba(0, 0, 0, 0)");
      addStop((left * 0.3) / 100, "rgba(0, 0, 0, 0.3)");
      addStop((left * 0.65) / 100, "rgba(0, 0, 0, 0.65)");
      addStop(left / 100, "rgba(0, 0, 0, 1)");
    } else {
      addStop(0, "rgba(0, 0, 0, 1)");
    }

    if (right > 0) {
      const rStart = Math.max(left, 100 - right) / 100;
      addStop(rStart, "rgba(0, 0, 0, 1)");
      addStop((100 - right * 0.65) / 100, "rgba(0, 0, 0, 0.65)");
      addStop((100 - right * 0.3) / 100, "rgba(0, 0, 0, 0.3)");
      addStop(1, "rgba(0, 0, 0, 0)");
    } else {
      addStop(1, "rgba(0, 0, 0, 1)");
    }

    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);
  }

  return canvas;
}

export function ImageVisual({
  element,
  tokens,
}: {
  element: ImageElement;
  tokens?: ThemeTokens;
}) {
  const { w, h } = element.frame;
  const assetId = "assetId" in element.source ? element.source.assetId : null;
  const sourceUrl = assetId ? assetUrl(assetId) : null;
  const image = useCanvasImage(sourceUrl);

  const isGif = Boolean(
    sourceUrl &&
      (sourceUrl.toLowerCase().includes(".gif") ||
        (element.name && element.name.toLowerCase().includes("gif"))),
  );

  const [, setFrameTick] = useState(0);
  useEffect(() => {
    if (!isGif || !image) return;
    let animId: number;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= 60) {
        last = now;
        setFrameTick((t) => (t + 1) % 10000);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isGif, image]);

  const { fit, focal, radius, flipH, flipV, fade } = element.style;
  const isFlipH = Boolean(flipH);
  const isFlipV = Boolean(flipV);
  const { crop, dest } = fitImage({
    boxWidth: w,
    boxHeight: h,
    imageWidth: image ? image.naturalWidth || image.width : 1,
    imageHeight: image ? image.naturalHeight || image.height : 1,
    fit,
    focal,
  });

  const isFadeActive = hasActiveFade(fade);
  const maskedCanvas = useMemo(() => {
    if (!isFadeActive || !image || !fade) return null;
    return createMaskedImageCanvas({
      image,
      crop,
      dest,
      w,
      h,
      fade,
    });
  }, [isFadeActive, image, crop, dest, w, h, fade]);

  if (!sourceUrl) {
    const key = "bind" in element.source ? element.source.bind : "";
    return <Placeholder w={w} h={h} title="Gambar" subtitle={key ? `{${key}}` : undefined} />;
  }
  if (!image) return <Placeholder w={w} h={h} title="Memuat gambar..." />;

  const r = Math.min(radius, w / 2, h / 2);
  const shadowProps = tokens ? konvaShadowProps(element.style.shadow, tokens) : {};

  return (
    <Group
      listening={false}
      x={isFlipH ? w : 0}
      y={isFlipV ? h : 0}
      scaleX={isFlipH ? -1 : 1}
      scaleY={isFlipV ? -1 : 1}
      opacity={typeof element.style.opacity === "number" ? element.style.opacity : 1}
      {...(r > 0 && {
        clipFunc: (ctx: {
          beginPath(): void;
          moveTo(x: number, y: number): void;
          arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
          closePath(): void;
        }) => {
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(w, 0, w, h, r);
          ctx.arcTo(w, h, 0, h, r);
          ctx.arcTo(0, h, 0, 0, r);
          ctx.arcTo(0, 0, w, 0, r);
          ctx.closePath();
        },
      })}
    >
      {maskedCanvas ? (
        <KonvaImage
          image={maskedCanvas}
          x={0}
          y={0}
          width={w}
          height={h}
          listening={false}
          {...shadowProps}
        />
      ) : (
        <KonvaImage
          image={image}
          x={dest.x}
          y={dest.y}
          width={dest.width}
          height={dest.height}
          crop={crop}
          listening={false}
          {...shadowProps}
        />
      )}
    </Group>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

function getWidgetColor(element: WidgetElement, tokens?: ThemeTokens): string {
  if (!tokens) {
    if (typeof element.style.color === "string") return element.style.color;
    return "#2b2118";
  }
  return resolveColor(element.style.color, tokens, "#2b2118");
}

function getWidgetBackground(element: WidgetElement, tokens?: ThemeTokens): string {
  if (!tokens) {
    if (typeof element.style.background === "string") return element.style.background;
    return "transparent";
  }
  return resolveColor(element.style.background, tokens, "transparent");
}

// ============================================================================
// CANVAS WIDGET VISUALS (EXACT 1:1 MATCH WITH RUNTIME PREVIEW WIDGETS)
// ============================================================================

function CountdownWidgetVisual({
  element,
  tokens,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant = element.style.variant ?? "minimal";

  // Real-time ticking clock
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const res = computeCountdown(props.targetDateTime, nowMs);
  const isCounting = res.state === "counting";
  const days = isCounting ? res.days : 14;
  const hours = isCounting ? res.hours : 8;
  const minutes = isCounting ? res.minutes : 24;
  const seconds = isCounting ? res.seconds : 50;

  const rawLabels = props.labels as Record<string, string> | undefined;
  const labels: Record<CountdownUnit, string> = {
    days: rawLabels?.days || DEFAULT_COUNTDOWN_LABELS.days,
    hours: rawLabels?.hours || DEFAULT_COUNTDOWN_LABELS.hours,
    minutes: rawLabels?.minutes || DEFAULT_COUNTDOWN_LABELS.minutes,
    seconds: rawLabels?.seconds || DEFAULT_COUNTDOWN_LABELS.seconds,
  };

  const isElapsed = res.state === "elapsed";
  const padX = 14;
  const padY = 10;
  const colW = (w - padX * 2) / 4;
  const innerH = Math.max(20, h - padY * 2);

  const units: Array<{ key: CountdownUnit; val: number }> = [
    { key: "days", val: days },
    { key: "hours", val: hours },
    { key: "minutes", val: minutes },
    { key: "seconds", val: seconds },
  ];

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {/* Luxury double frame */}
      {variant === "luxury" && (
        <Group>
          <Rect width={w} height={h} cornerRadius={radius || 10} stroke={color} strokeWidth={1} />
          <Rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            cornerRadius={Math.max(0, (radius || 10) - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* Pill outline container */}
      {variant === "pill" && (
        <Rect
          width={w}
          height={h}
          cornerRadius={h / 2}
          stroke={color}
          strokeWidth={1.5}
          fill={background}
        />
      )}

      {isElapsed && props.afterState !== "hide" ? (
        <Text
          x={padX}
          y={Math.max(0, h / 2 - 10)}
          width={w - padX * 2}
          text={
            typeof props.afterMessage === "string" && props.afterMessage.trim() !== ""
              ? props.afterMessage.trim()
              : "Acara telah dimulai"
          }
          fontSize={16}
          fontStyle="600"
          fill={color}
          align="center"
        />
      ) : (
        units.map((u, i) => {
          const colX = padX + i * colW;
          const numFontSize = Math.min(30, Math.max(16, innerH * 0.46));
          const lblFontSize = Math.min(11, Math.max(8, innerH * 0.2));
          const numY = padY + (innerH - (numFontSize + lblFontSize + 4)) / 2;
          const lblY = numY + numFontSize + 4;

          return (
            <Group key={u.key}>
              {/* Cards variant: individual rounded box tile */}
              {variant === "cards" && (
                <Rect
                  x={colX + 3}
                  y={padY}
                  width={colW - 6}
                  height={innerH}
                  cornerRadius={radius || 8}
                  stroke={color}
                  strokeWidth={1}
                  fill={color}
                  opacity={0.06}
                />
              )}

              {/* Circle variant: circular background ring */}
              {variant === "circle" && (
                <Circle
                  x={colX + colW / 2}
                  y={padY + innerH / 2}
                  radius={Math.min(colW - 6, innerH) / 2}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={color}
                  opacity={0.05}
                />
              )}

              {/* Pill variant: subtle dividers */}
              {variant === "pill" && i < 3 && (
                <Line
                  points={[colX + colW, padY + 8, colX + colW, padY + innerH - 8]}
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.2}
                />
              )}

              <Text
                x={colX}
                y={numY}
                width={colW}
                text={pad(u.val)}
                fontSize={numFontSize}
                fontStyle="bold"
                fill={color}
                align="center"
              />
              <Text
                x={colX}
                y={lblY}
                width={colW}
                text={labels[u.key].toUpperCase()}
                fontSize={lblFontSize}
                fill={color}
                opacity={0.75}
                align="center"
                letterSpacing={0.6}
              />
            </Group>
          );
        })
      )}
    </Group>
  );
}

function MapWidgetVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const label =
    typeof props.label === "string" && props.label.trim() !== ""
      ? props.label.trim()
      : "Lokasi acara";
  const buttonText =
    typeof props.buttonText === "string" && props.buttonText.trim() !== ""
      ? props.buttonText.trim()
      : "Buka Google Maps";

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 12;
  const variant = element.style.variant ?? "card";

  // Calculate layout: map viewport on top, details & button on bottom
  const pad = 8;
  const detailsH = Math.min(76, Math.max(54, h * 0.36));
  const mapH = Math.max(50, h - detailsH - pad * 2);
  const mapW = w - pad * 2;
  const mapX = pad;
  const mapY = pad;

  // Pin & roads geometry within the map viewport
  const pinX = mapX + mapW / 2;
  const pinY = mapY + mapH / 2 + 6;

  // Button geometry
  const btnH = Math.min(34, Math.max(26, detailsH - 28));
  const btnW = Math.min(w - 32, Math.max(130, w * 0.72));
  const btnX = (w - btnW) / 2;
  const labelY = mapY + mapH + 6;
  const btnY = labelY + 18;

  // Callout bubble width for venue
  const calloutW = Math.min(mapW - 16, Math.max(70, label.length * 7 + 16));
  const calloutX = pinX - calloutW / 2;
  const calloutY = pinY - 34;

  return (
    <Group listening={false}>
      {/* Outer Card Background */}
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {/* Card Border & Shadow styling */}
      {variant === "card" && (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius}
          stroke={color}
          strokeWidth={1}
          fill={color}
          opacity={0.04}
        />
      )}

      {/* Luxury double frame */}
      {variant === "luxury" && (
        <Group>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} strokeWidth={1} />
          <Rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* --- MAP VIEWPORT (REALISTIC GOOGLE MAP PREVIEW) --- */}
      <Group
        clipFunc={(ctx: { rect(x: number, y: number, w: number, h: number): void }) => {
          ctx.rect(mapX, mapY, mapW, mapH);
        }}
      >
        {/* Map Land Background */}
        <Rect x={mapX} y={mapY} width={mapW} height={mapH} fill="#eef3f6" />

        {/* Park / Green Area */}
        <Rect
          x={mapX + mapW * 0.08}
          y={mapY + mapH * 0.15}
          width={mapW * 0.28}
          height={mapH * 0.45}
          cornerRadius={8}
          fill="#d8edd7"
        />
        <Rect
          x={mapX + mapW * 0.65}
          y={mapY + mapH * 0.5}
          width={mapW * 0.28}
          height={mapH * 0.42}
          cornerRadius={6}
          fill="#d8edd7"
        />

        {/* Blue River / Waterway Curve */}
        <Line
          points={[
            mapX - 10,
            mapY + mapH * 0.85,
            mapX + mapW * 0.35,
            mapY + mapH * 0.65,
            mapX + mapW * 0.65,
            mapY + mapH * 0.4,
            mapX + mapW + 10,
            mapY + mapH * 0.2,
          ]}
          stroke="#bcd7ef"
          strokeWidth={14}
          tension={0.4}
        />

        {/* Local Road Grid (White with grey borders) */}
        <Line
          points={[mapX, mapY + mapH * 0.35, mapX + mapW, mapY + mapH * 0.35]}
          stroke="#ffffff"
          strokeWidth={6}
        />
        <Line
          points={[mapX, mapY + mapH * 0.62, mapX + mapW, mapY + mapH * 0.62]}
          stroke="#ffffff"
          strokeWidth={5}
        />
        <Line
          points={[mapX + mapW * 0.3, mapY, mapX + mapW * 0.3, mapY + mapH]}
          stroke="#ffffff"
          strokeWidth={5}
        />
        <Line
          points={[mapX + mapW * 0.72, mapY, mapX + mapW * 0.72, mapY + mapH]}
          stroke="#ffffff"
          strokeWidth={5}
        />

        {/* Major Avenue / Highway (Light orange) */}
        <Line
          points={[
            mapX - 10,
            mapY + mapH * 0.15,
            mapX + mapW * 0.45,
            mapY + mapH * 0.52,
            mapX + mapW + 10,
            mapY + mapH * 0.8,
          ]}
          stroke="#fed7aa"
          strokeWidth={7}
          tension={0.3}
        />
        <Line
          points={[
            mapX - 10,
            mapY + mapH * 0.15,
            mapX + mapW * 0.45,
            mapY + mapH * 0.52,
            mapX + mapW + 10,
            mapY + mapH * 0.8,
          ]}
          stroke="#ffffff"
          strokeWidth={4}
          tension={0.3}
        />

        {/* Pin Radar Wave / Ground shadow */}
        <Circle x={pinX} y={pinY} radius={14} fill="#ea4335" opacity={0.18} />
        <Circle x={pinX} y={pinY} radius={8} fill="#ea4335" opacity={0.28} />
        <Line
          points={[pinX - 6, pinY, pinX + 6, pinY]}
          stroke="#000000"
          strokeWidth={3}
          opacity={0.2}
        />

        {/* Pin Body (Google Maps Red Marker with white inner core) */}
        <Line
          points={[pinX - 8, pinY - 14, pinX, pinY, pinX + 8, pinY - 14]}
          fill="#ea4335"
          closed
        />
        <Circle x={pinX} y={pinY - 14} radius={9} fill="#ea4335" />
        <Circle x={pinX} y={pinY - 14} radius={4} fill="#ffffff" />

        {/* Floating Callout Bubble for Location Label */}
        {calloutY > mapY + 2 && (
          <Group>
            {/* Bubble background */}
            <Rect
              x={calloutX}
              y={calloutY}
              width={calloutW}
              height={18}
              cornerRadius={4}
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            {/* Downward pointer triangle */}
            <Line
              points={[pinX - 4, calloutY + 18, pinX, calloutY + 22, pinX + 4, calloutY + 18]}
              fill="#ffffff"
              closed
            />
            {/* Text inside bubble */}
            <Text
              x={calloutX + 4}
              y={calloutY + 4}
              width={calloutW - 8}
              text={label}
              fontSize={10}
              fontStyle="bold"
              fill="#1e293b"
              align="center"
              ellipsis
            />
          </Group>
        )}

        {/* Top-Left Badge: "📍 Google Maps" */}
        <Group x={mapX + 6} y={mapY + 6}>
          <Rect
            width={82}
            height={18}
            cornerRadius={9}
            fill="#ffffff"
            opacity={0.92}
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
          <Text
            x={6}
            y={4}
            width={70}
            text="Google Maps"
            fontSize={9}
            fontStyle="600"
            fill="#334155"
          />
        </Group>

        {/* Bottom-Right Zoom buttons preview (+ / -) */}
        <Group x={mapX + mapW - 20} y={mapY + mapH - 36}>
          <Rect
            width={16}
            height={30}
            cornerRadius={3}
            fill="#ffffff"
            opacity={0.92}
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
          <Text x={3} y={2} text="+" fontSize={11} fontStyle="bold" fill="#475569" />
          <Line points={[2, 15, 14, 15]} stroke="#e2e8f0" strokeWidth={1} />
          <Text x={4} y={15} text="-" fontSize={13} fontStyle="bold" fill="#475569" />
        </Group>

        {/* Map Viewport Border */}
        <Rect
          x={mapX}
          y={mapY}
          width={mapW}
          height={mapH}
          cornerRadius={Math.max(4, radius - 2)}
          stroke={variant === "outlined" || variant === "luxury" ? color : "rgba(0,0,0,0.1)"}
          strokeWidth={1}
        />
      </Group>

      {/* --- LOCATION DETAILS & ACTION BUTTON --- */}
      {/* Label */}
      <Text
        x={12}
        y={labelY}
        width={w - 24}
        text={label}
        fontSize={13}
        fontStyle="600"
        fill={color}
        align="center"
        ellipsis
      />

      {/* Button per variant */}
      {variant === "solid" ? (
        <Group>
          <Rect x={btnX} y={btnY} width={btnW} height={btnH} cornerRadius={btnH / 2} fill={color} />
          <Text
            x={btnX + 6}
            y={btnY + (btnH - 12) / 2}
            width={btnW - 12}
            text={buttonText}
            fontSize={12}
            fontStyle="600"
            fill="#ffffff"
            align="center"
            ellipsis
          />
        </Group>
      ) : variant === "minimal" ? (
        <Group>
          <Text
            x={btnX}
            y={btnY + (btnH - 12) / 2}
            width={btnW}
            text={`${buttonText} ↗`}
            fontSize={12}
            fontStyle="600"
            fill={color}
            align="center"
            ellipsis
          />
          <Line
            points={[btnX + 10, btnY + btnH - 3, btnX + btnW - 10, btnY + btnH - 3]}
            stroke={color}
            strokeWidth={1.5}
          />
        </Group>
      ) : (
        /* outlined, card, luxury */
        <Group>
          <Rect
            x={btnX}
            y={btnY}
            width={btnW}
            height={btnH}
            cornerRadius={btnH / 2}
            stroke={color}
            strokeWidth={1.5}
            fill="transparent"
          />
          <Text
            x={btnX + 6}
            y={btnY + (btnH - 12) / 2}
            width={btnW - 12}
            text={buttonText}
            fontSize={12}
            fontStyle="600"
            fill={color}
            align="center"
            ellipsis
          />
        </Group>
      )}
    </Group>
  );
}

function GuestGreetingWidgetVisual({
  element,
  tokens,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  const { w, h } = element.frame;
  const parts = greetingParts(element.props as Record<string, unknown>);

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant = element.style.variant ?? "elegant";

  const prefixSize = 13;
  const nameSize = 22;
  const totalH = prefixSize + nameSize + 6;
  const startY = Math.max(6, (h - totalH) / 2);

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {variant === "card" && (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius || 12}
          stroke={color}
          strokeWidth={1}
          fill={color}
          opacity={0.05}
        />
      )}
      {variant === "pill" && (
        <Rect
          width={w}
          height={h}
          cornerRadius={h / 2}
          stroke={color}
          strokeWidth={1.5}
          fill={background}
        />
      )}
      {variant === "frame" && (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius || 8}
          stroke={color}
          strokeWidth={1.5}
          fill={background}
        />
      )}

      <Text
        x={14}
        y={startY}
        width={w - 28}
        text={parts.prefix}
        fontSize={prefixSize}
        fill={color}
        opacity={0.8}
        align="center"
      />

      {variant === "ornament" && (
        <Group>
          <Line
            points={[
              24,
              startY + prefixSize + 16,
              Math.max(30, w * 0.22),
              startY + prefixSize + 16,
            ]}
            stroke={color}
            strokeWidth={1}
            opacity={0.4}
          />
          <Line
            points={[
              w - Math.max(30, w * 0.22),
              startY + prefixSize + 16,
              w - 24,
              startY + prefixSize + 16,
            ]}
            stroke={color}
            strokeWidth={1}
            opacity={0.4}
          />
        </Group>
      )}

      <Text
        x={14}
        y={startY + prefixSize + 6}
        width={w - 28}
        text={parts.name}
        fontSize={nameSize}
        fontStyle="bold"
        fill={color}
        align="center"
        ellipsis
      />
    </Group>
  );
}

function RsvpWidgetVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() !== ""
      ? props.title.trim()
      : "Konfirmasi Kehadiran";
  const withParty = props.enablePartySize !== false;

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant = element.style.variant ?? "standard";

  const padX = 14;
  const fieldW = w - padX * 2;
  const submitBtnH = Math.min(42, Math.max(30, h * 0.14));

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {variant === "card" && (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius || 14}
          stroke={color}
          strokeWidth={1}
          fill={color}
          opacity={0.04}
        />
      )}
      {variant === "luxury" && (
        <Group>
          <Rect width={w} height={h} cornerRadius={radius || 14} stroke={color} strokeWidth={1} />
          <Rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            cornerRadius={Math.max(0, (radius || 14) - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* Title */}
      <Text
        x={padX}
        y={10}
        width={fieldW}
        text={title}
        fontSize={15}
        fontStyle="600"
        fill={color}
        align="center"
      />

      {/* Field: Nama */}
      {h >= 115 && (
        <Group y={36}>
          <Text x={padX} text="Nama" fontSize={13} fill={color} />
          {variant === "minimal" ? (
            <Line points={[padX, 50, w - padX, 50]} stroke={color} strokeWidth={1.2} />
          ) : (
            <Rect
              x={padX}
              y={18}
              width={fieldW}
              height={32}
              cornerRadius={8}
              stroke={color}
              strokeWidth={1}
              fill="transparent"
            />
          )}
          <Text
            x={padX + 10}
            y={27}
            text="Nama tamu undangan"
            fontSize={12}
            fill={color}
            opacity={0.45}
          />
        </Group>
      )}

      {/* Field: Kehadiran Radio / Pills */}
      {h >= 185 && (
        <Group y={94}>
          <Text x={padX} text="Kehadiran" fontSize={13} fill={color} />
          {variant === "pills" ? (
            <Group y={18}>
              <Rect x={padX} width={80} height={26} cornerRadius={13} fill={color} />
              <Text
                x={padX}
                y={6}
                width={80}
                text="✓ Hadir"
                fontSize={12}
                fontStyle="bold"
                fill="#ffffff"
                align="center"
              />
              <Rect
                x={padX + 88}
                width={96}
                height={26}
                cornerRadius={13}
                stroke={color}
                strokeWidth={1}
                fill="transparent"
              />
              <Text
                x={padX + 88}
                y={6}
                width={96}
                text="Tidak hadir"
                fontSize={12}
                fill={color}
                align="center"
              />
            </Group>
          ) : (
            <Group y={18}>
              <Circle
                x={padX + 8}
                y={6}
                radius={6}
                stroke={color}
                strokeWidth={1.5}
                fill="transparent"
              />
              <Circle x={padX + 8} y={6} radius={3.5} fill={color} />
              <Text x={padX + 20} y={0} text="Hadir" fontSize={13} fill={color} />

              <Circle
                x={padX + 90}
                y={6}
                radius={6}
                stroke={color}
                strokeWidth={1.5}
                fill="transparent"
              />
              <Text
                x={padX + 102}
                y={0}
                text="Tidak hadir"
                fontSize={13}
                fill={color}
                opacity={0.8}
              />
            </Group>
          )}
        </Group>
      )}

      {/* Field: Jumlah Tamu */}
      {h >= 255 && withParty && (
        <Group y={144}>
          <Text x={padX} text="Jumlah tamu" fontSize={13} fill={color} />
          <Rect
            x={padX}
            y={18}
            width={Math.min(fieldW, 120)}
            height={30}
            cornerRadius={8}
            stroke={color}
            strokeWidth={1}
            fill="transparent"
          />
          <Text x={padX + 12} y={25} text="1" fontSize={13} fill={color} />
        </Group>
      )}

      {/* Submit Button */}
      <Rect
        x={padX}
        y={Math.max(40, h - submitBtnH - 10)}
        width={fieldW}
        height={submitBtnH}
        cornerRadius={submitBtnH / 2}
        stroke={color}
        strokeWidth={1.5}
        fill={variant === "luxury" ? color : "transparent"}
      />
      <Text
        x={padX}
        y={Math.max(40, h - submitBtnH - 10) + (submitBtnH - 14) / 2}
        width={fieldW}
        text="Kirim Konfirmasi"
        fontSize={14}
        fontStyle="600"
        fill={variant === "luxury" ? "#ffffff" : color}
        align="center"
      />
    </Group>
  );
}

function GiftWidgetVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() !== ""
      ? props.title.trim()
      : "Tanda Kasih";
  const accounts = parseGiftAccounts(props.accounts);

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant = element.style.variant ?? "cards";

  const padX = 14;
  const contentW = w - padX * 2;

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {variant === "luxury" && (
        <Group>
          <Rect width={w} height={h} cornerRadius={radius || 14} stroke={color} strokeWidth={1} />
          <Rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            cornerRadius={Math.max(0, (radius || 14) - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* Title */}
      <Text
        x={padX}
        y={10}
        width={contentW}
        text={title}
        fontSize={15}
        fontStyle="600"
        fill={color}
        align="center"
      />

      {accounts.length === 0 ? (
        <Text
          x={padX}
          y={Math.max(20, h / 2 - 8)}
          width={contentW}
          text="Nomor rekening belum ditambahkan."
          fontSize={14}
          fill={color}
          opacity={0.7}
          align="center"
        />
      ) : (
        /* List accounts */
        accounts.slice(0, 3).map((acc, i) => {
          const itemH = variant === "compact" ? 42 : 56;
          const itemY = 38 + i * itemH;
          if (itemY + 36 > h) return null;
          const copyBtnW = 68;
          const copyBtnH = 30;
          const copyBtnX = w - padX - copyBtnW;
          const copyBtnY = itemY + 4;

          return (
            <Group key={`${acc.accountNumber}-${i}`}>
              {/* Account Card Background if variant is cards or pill */}
              {variant === "cards" && (
                <Rect
                  x={padX}
                  y={itemY - 2}
                  width={contentW}
                  height={itemH - 4}
                  cornerRadius={radius || 10}
                  stroke={color}
                  strokeWidth={1}
                  fill={color}
                  opacity={0.04}
                />
              )}
              {variant === "pill" && (
                <Rect
                  x={padX}
                  y={itemY - 2}
                  width={contentW}
                  height={itemH - 4}
                  cornerRadius={(itemH - 4) / 2}
                  stroke={color}
                  strokeWidth={1.5}
                />
              )}

              {/* Account details */}
              <Text
                x={padX + (variant === "cards" || variant === "pill" ? 10 : 0)}
                y={itemY}
                width={copyBtnX - padX - 16}
                text={acc.bank}
                fontSize={13.5}
                fontStyle="bold"
                fill={color}
              />
              <Text
                x={padX + (variant === "cards" || variant === "pill" ? 10 : 0)}
                y={itemY + 16}
                width={copyBtnX - padX - 16}
                text={acc.accountNumber}
                fontSize={13}
                fontStyle="bold"
                fill={color}
                letterSpacing={0.5}
              />
              {variant !== "compact" && (
                <Text
                  x={padX + (variant === "cards" || variant === "pill" ? 10 : 0)}
                  y={itemY + 32}
                  width={copyBtnX - padX - 16}
                  text={`a.n. ${acc.accountName}`}
                  fontSize={11.5}
                  fill={color}
                  opacity={0.8}
                  ellipsis
                />
              )}

              {/* Salin button */}
              <Rect
                x={copyBtnX - (variant === "cards" || variant === "pill" ? 8 : 0)}
                y={copyBtnY}
                width={copyBtnW}
                height={copyBtnH}
                cornerRadius={copyBtnH / 2}
                stroke={color}
                strokeWidth={1.5}
                fill="transparent"
              />
              <Text
                x={copyBtnX - (variant === "cards" || variant === "pill" ? 8 : 0)}
                y={copyBtnY + (copyBtnH - 13) / 2}
                width={copyBtnW}
                text="Salin"
                fontSize={12.5}
                fontStyle="600"
                fill={color}
                align="center"
              />

              {/* Divider if minimal and not last */}
              {variant === "minimal" && i < accounts.length - 1 && (
                <Line
                  points={[padX, itemY + 48, w - padX, itemY + 48]}
                  stroke={color}
                  strokeWidth={0.8}
                  dash={[3, 3]}
                  opacity={0.25}
                />
              )}
            </Group>
          );
        })
      )}
    </Group>
  );
}

function MusicWidgetVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() !== ""
      ? props.title.trim()
      : "Putar musik";

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant = element.style.variant ?? "pill";

  const btnH = Math.min(44, Math.max(32, h * 0.7));
  const btnW = Math.min(w - 28, Math.max(140, w * 0.8));
  const btnX = (w - btnW) / 2;
  const btnY = (h - btnH) / 2;

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {variant === "solid" ? (
        <Group>
          <Rect x={btnX} y={btnY} width={btnW} height={btnH} cornerRadius={btnH / 2} fill={color} />
          <Text
            x={btnX + 10}
            y={btnY + (btnH - 14) / 2}
            width={btnW - 20}
            text={title}
            fontSize={14}
            fontStyle="600"
            fill="#ffffff"
            align="center"
            ellipsis
          />
        </Group>
      ) : variant === "disc" ? (
        <Group x={w / 2} y={h / 2}>
          <Circle radius={btnH / 2} fill={color} opacity={0.1} />
          <Circle radius={btnH / 2} stroke={color} strokeWidth={2} />
          <Circle radius={btnH * 0.3} stroke={color} strokeWidth={1} opacity={0.6} />
          <Circle radius={btnH * 0.12} fill={color} />
          <Text
            x={-btnH / 2}
            y={btnH / 2 + 4}
            width={btnH}
            text="▶"
            fontSize={11}
            fill={color}
            align="center"
          />
        </Group>
      ) : variant === "minimal" ? (
        <Group>
          <Text
            x={btnX}
            y={btnY + (btnH - 14) / 2}
            width={btnW}
            text={title}
            fontSize={14}
            fontStyle="600"
            fill={color}
            align="center"
            ellipsis
          />
        </Group>
      ) : variant === "bar" ? (
        <Group>
          <Rect
            x={btnX}
            y={btnY}
            width={btnW}
            height={btnH}
            cornerRadius={radius || 10}
            stroke={color}
            strokeWidth={1.5}
            fill={background}
          />
          <Circle x={btnX + 22} y={btnY + btnH / 2} radius={11} fill={color} />
          <Text x={btnX + 17} y={btnY + btnH / 2 - 6} text="▶" fontSize={9} fill="#ffffff" />
          <Text
            x={btnX + 40}
            y={btnY + (btnH - 14) / 2}
            width={btnW - 48}
            text={title}
            fontSize={13}
            fontStyle="600"
            fill={color}
            ellipsis
          />
        </Group>
      ) : (
        /* default pill */
        <Group>
          <Rect
            x={btnX}
            y={btnY}
            width={btnW}
            height={btnH}
            cornerRadius={btnH / 2}
            stroke={color}
            strokeWidth={1.5}
            fill="transparent"
          />
          <Text
            x={btnX + 10}
            y={btnY + (btnH - 14) / 2}
            width={btnW - 20}
            text={title}
            fontSize={14}
            fontStyle="600"
            fill={color}
            align="center"
            ellipsis
          />
        </Group>
      )}
    </Group>
  );
}

function GalleryWidgetVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const layout = props.layout === "slider" ? "slider" : "grid";
  const images = parseGalleryItems(props.items, variables);

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant =
    element.style.variant ?? (layout === "slider" ? "slider-classic" : "grid-rounded");

  const padX = 14;
  const contentW = w - padX * 2;
  const top = 10;

  const isSlider = layout === "slider" || variant.startsWith("slider-");

  if (images.length === 0) {
    return (
      <Group listening={false}>
        {background !== "transparent" && (
          <Rect width={w} height={h} cornerRadius={radius} fill={background} />
        )}
        <Rect
          x={padX}
          y={top}
          width={contentW}
          height={h - top * 2}
          cornerRadius={radius || 6}
          stroke={color}
          strokeWidth={1.5}
          dash={[4, 4]}
          opacity={0.35}
          fill={color}
          fillOpacity={0.06}
        />
        <Text
          x={padX}
          y={h / 2 - 8}
          width={contentW}
          text="Belum ada foto galeri"
          fontSize={11}
          fill={color}
          opacity={0.45}
          align="center"
        />
      </Group>
    );
  }

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {isSlider ? (
        /* Slider preview */
        <Group y={top}>
          {(() => {
            const availH = Math.max(40, h - top - 48);
            const sliderW = Math.min(contentW, availH);
            const sliderX = (w - sliderW) / 2;
            const navY = availH + 8;
            return (
              <Group>
                <CanvasGalleryPhoto
                  x={sliderX}
                  y={0}
                  width={sliderW}
                  height={availH}
                  radius={6}
                  color={color}
                  strokeWidth={1}
                  src={images[0]?.src}
                />

                {/* Nav buttons */}
                <Group y={navY}>
                  <Rect
                    x={sliderX}
                    width={40}
                    height={28}
                    cornerRadius={variant === "slider-pill" ? 14 : 6}
                    stroke={color}
                    strokeWidth={1.5}
                    fill={variant === "slider-pill" ? color : "transparent"}
                  />
                  <Text
                    x={sliderX}
                    y={6}
                    width={40}
                    text="‹"
                    fontSize={16}
                    fontStyle="bold"
                    fill={variant === "slider-pill" ? "#ffffff" : color}
                    align="center"
                  />

                  <Text
                    x={sliderX + 44}
                    y={6}
                    width={sliderW - 88}
                    text={`1 / ${Math.max(1, images.length)}`}
                    fontSize={12}
                    fill={color}
                    align="center"
                  />

                  <Rect
                    x={sliderX + sliderW - 40}
                    width={40}
                    height={28}
                    cornerRadius={variant === "slider-pill" ? 14 : 6}
                    stroke={color}
                    strokeWidth={1.5}
                    fill={variant === "slider-pill" ? color : "transparent"}
                  />
                  <Text
                    x={sliderX + sliderW - 40}
                    y={6}
                    width={40}
                    text="›"
                    fontSize={16}
                    fontStyle="bold"
                    fill={variant === "slider-pill" ? "#ffffff" : color}
                    align="center"
                  />
                </Group>
              </Group>
            );
          })()}
        </Group>
      ) : (
        /* 3-Column Grid preview matching .galleryGrid */
        <Group y={top}>
          {(() => {
            const gap = 6;
            const cols = images.length <= 2 ? images.length : 3;
            const tileW = (contentW - gap * (cols - 1)) / cols;
            const tileH = tileW;
            const count = Math.min(6, images.length);
            const isCircle = variant === "circle";
            const isBorder = variant === "grid-border";

            return Array.from({ length: count }).map((_, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const x = padX + col * (tileW + gap);
              const y = row * (tileH + gap);
              if (top + y + tileH > h) return null;

              return (
                <CanvasGalleryPhoto
                  key={idx}
                  x={x}
                  y={y}
                  width={tileW}
                  height={tileH}
                  radius={isCircle ? tileW / 2 : radius || 6}
                  color={color}
                  strokeWidth={isBorder ? 2 : 1}
                  src={images[idx]?.src}
                />
              );
            });
          })()}
        </Group>
      )}
    </Group>
  );
}

export function WidgetVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const styleResolution = resolveWidgetStyleVariant(element.widgetType, element.style.variant);
  if (styleResolution.kind === "current") {
    return (
      <CurrentWidgetVisual
        element={{
          ...element,
          style: { ...element.style, variant: styleResolution.variant.id },
        }}
        tokens={tokens}
        variables={variables}
      />
    );
  }

  const legacyElement =
    element.style.variant === styleResolution.variant.id
      ? element
      : { ...element, style: { ...element.style, variant: styleResolution.variant.id } };
  switch (element.widgetType) {
    case "countdown":
      return <CountdownWidgetVisual element={legacyElement} tokens={tokens} />;
    case "map":
      return <MapWidgetVisual element={legacyElement} tokens={tokens} />;
    case "guestGreeting":
      return <GuestGreetingWidgetVisual element={legacyElement} tokens={tokens} />;
    case "rsvp":
      return <RsvpWidgetVisual element={legacyElement} tokens={tokens} />;
    case "gallery":
      return <GalleryWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "music":
      return <MusicWidgetVisual element={legacyElement} tokens={tokens} />;
    case "gift":
      return <GiftWidgetVisual element={legacyElement} tokens={tokens} />;
    case "photoFrame":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "timeline":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "wishes":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "coupleProfile":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "ornamentFrame":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "video":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    case "gif":
      return <CurrentWidgetVisual element={legacyElement} tokens={tokens} variables={variables} />;
    default: {
      const { w, h } = element.frame;
      const resolved = defaultWidgetRegistry.resolve(element.widgetType);
      const title = resolved.kind !== "unknown" ? resolved.definition.label : element.widgetType;
      return <Placeholder w={w} h={h} title={title} subtitle="Widget" />;
    }
  }
}
