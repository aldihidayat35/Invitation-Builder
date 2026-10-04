"use client";

import { useEffect, useState } from "react";
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from "react-konva";
import type { Element, ThemeTokens } from "@/lib/schema";
import { assetUrl } from "@/features/assets/urls";
import { defaultWidgetRegistry } from "@/features/widgets";
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

type ImageElement = Extract<Element, { type: "image" }>;
type WidgetElement = Extract<Element, { type: "widget" }>;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image failed to load"));
      img.src = url;
    });
    pending.catch(() => imageCache.delete(url));
    imageCache.set(url, pending);
  }
  return pending;
}

/** Loads (and caches) an asset image; returns null until ready or when it fails. */
function useAssetImage(assetId: string | null): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ assetId: string; image: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    loadImage(assetUrl(assetId)).then(
      (image) => {
        if (!cancelled) setLoaded({ assetId, image });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [assetId]);
  return loaded && loaded.assetId === assetId ? loaded.image : null;
}

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

export function ImageVisual({ element }: { element: ImageElement }) {
  const { w, h } = element.frame;
  const assetId = "assetId" in element.source ? element.source.assetId : null;
  const image = useAssetImage(assetId);

  if (!assetId) {
    const key = "bind" in element.source ? element.source.bind : "";
    return <Placeholder w={w} h={h} title="Gambar" subtitle={key ? `{${key}}` : undefined} />;
  }
  if (!image) return <Placeholder w={w} h={h} title="Memuat gambar..." />;

  const { fit, focal, radius } = element.style;
  const { crop, dest } = fitImage({
    boxWidth: w,
    boxHeight: h,
    imageWidth: image.naturalWidth || image.width,
    imageHeight: image.naturalHeight || image.height,
    fit,
    focal,
  });
  const r = Math.min(radius, w / 2, h / 2);

  return (
    <Group
      listening={false}
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
      <KonvaImage
        image={image}
        x={dest.x}
        y={dest.y}
        width={dest.width}
        height={dest.height}
        crop={crop}
        listening={false}
      />
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
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant = element.style.variant ?? "outlined";

  const btnH = Math.min(44, Math.max(30, h * 0.44));
  const btnW = Math.min(w - 28, Math.max(140, w * 0.75));
  const btnX = (w - btnW) / 2;
  const labelH = 18;
  const gap = 8;
  const totalH = labelH + gap + btnH;
  const startY = Math.max(6, (h - totalH) / 2);
  const btnY = startY + labelH + gap;

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {/* Card container */}
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

      {/* Luxury double frame */}
      {variant === "luxury" && (
        <Group>
          <Rect width={w} height={h} cornerRadius={radius || 12} stroke={color} strokeWidth={1} />
          <Rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            cornerRadius={Math.max(0, (radius || 12) - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* Label */}
      <Text
        x={14}
        y={startY}
        width={w - 28}
        text={label}
        fontSize={15}
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
            x={btnX + 8}
            y={btnY + (btnH - 14) / 2}
            width={btnW - 16}
            text={buttonText}
            fontSize={14}
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
            y={btnY + (btnH - 14) / 2}
            width={btnW}
            text={`📍 ${buttonText} ↗`}
            fontSize={14}
            fontStyle="600"
            fill={color}
            align="center"
            ellipsis
          />
          <Line
            points={[btnX + 16, btnY + btnH - 6, btnX + btnW - 16, btnY + btnH - 6]}
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
            x={btnX + 8}
            y={btnY + (btnH - 14) / 2}
            width={btnW - 16}
            text={buttonText}
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
            points={[24, startY + prefixSize + 16, Math.max(30, w * 0.22), startY + prefixSize + 16]}
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
            text={`🎵 ${title}`}
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
            text={`🎵 ${title}`}
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
            text={`🎵 ${title}`}
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
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() !== "" ? props.title.trim() : "Galeri";
  const layout = props.layout === "slider" ? "slider" : "grid";
  const images = parseGalleryItems(props.items);

  const color = getWidgetColor(element, tokens);
  const background = getWidgetBackground(element, tokens);
  const radius = typeof element.style.radius === "number" ? element.style.radius : 0;
  const variant =
    element.style.variant ?? (layout === "slider" ? "slider-classic" : "grid-rounded");

  const padX = 14;
  const contentW = w - padX * 2;
  const headingH = 22;

  const isSlider = layout === "slider" || variant.startsWith("slider-");

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}

      {/* Heading */}
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

      {isSlider ? (
        /* Slider preview */
        <Group y={10 + headingH + 6}>
          {(() => {
            const availH = Math.max(40, h - (10 + headingH + 6) - 48);
            const sliderW = Math.min(contentW, availH);
            const sliderX = (w - sliderW) / 2;
            const navY = availH + 8;
            return (
              <Group>
                {/* Photo frame */}
                <Rect
                  x={sliderX}
                  width={sliderW}
                  height={availH}
                  cornerRadius={6}
                  stroke={color}
                  strokeWidth={1}
                  fill={color}
                  opacity={0.06}
                />
                <Text
                  x={sliderX}
                  y={availH / 2 - 8}
                  width={sliderW}
                  text="📷 Foto Slider"
                  fontSize={12}
                  fill={color}
                  align="center"
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
        <Group y={10 + headingH + 6}>
          {(() => {
            const gap = 6;
            const cols = 3;
            const tileW = (contentW - gap * (cols - 1)) / cols;
            const tileH = tileW; // aspect ratio 1:1
            const count = Math.max(3, Math.min(6, images.length || 3));
            const isCircle = variant === "circle";
            const isBorder = variant === "grid-border";

            return Array.from({ length: count }).map((_, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const x = padX + col * (tileW + gap);
              const y = row * (tileH + gap);
              if (10 + headingH + 6 + y + tileH > h) return null;

              return (
                <Group key={idx}>
                  <Rect
                    x={x}
                    y={y}
                    width={tileW}
                    height={tileH}
                    cornerRadius={isCircle ? tileW / 2 : radius || 6}
                    stroke={color}
                    strokeWidth={isBorder ? 2 : 1}
                    fill={color}
                    opacity={0.08}
                  />
                  <Text
                    x={x}
                    y={y + tileH / 2 - 7}
                    width={tileW}
                    text="📷"
                    fontSize={14}
                    align="center"
                  />
                </Group>
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
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  switch (element.widgetType) {
    case "countdown":
      return <CountdownWidgetVisual element={element} tokens={tokens} />;
    case "map":
      return <MapWidgetVisual element={element} tokens={tokens} />;
    case "guestGreeting":
      return <GuestGreetingWidgetVisual element={element} tokens={tokens} />;
    case "rsvp":
      return <RsvpWidgetVisual element={element} tokens={tokens} />;
    case "gallery":
      return <GalleryWidgetVisual element={element} tokens={tokens} />;
    case "music":
      return <MusicWidgetVisual element={element} tokens={tokens} />;
    case "gift":
      return <GiftWidgetVisual element={element} tokens={tokens} />;
    default: {
      const { w, h } = element.frame;
      const resolved = defaultWidgetRegistry.resolve(element.widgetType);
      const title = resolved.kind !== "unknown" ? resolved.definition.label : element.widgetType;
      return <Placeholder w={w} h={h} title={title} subtitle="Widget" />;
    }
  }
}
