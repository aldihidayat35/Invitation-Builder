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

  const btnH = Math.min(44, Math.max(30, h * 0.44));
  const btnW = Math.min(w - 28, Math.max(140, w * 0.75));
  const btnX = (w - btnW) / 2;
  const labelH = 18;
  const gap = 8;
  const totalH = labelH + gap + btnH;
  const startY = Math.max(6, (h - totalH) / 2);

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}
      {/* Label matching .label in MapWidget.tsx */}
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
      {/* Outlined Pill Button matching .button in MapWidget.tsx */}
      <Rect
        x={btnX}
        y={startY + labelH + gap}
        width={btnW}
        height={btnH}
        cornerRadius={btnH / 2}
        stroke={color}
        strokeWidth={1.5}
        fill="transparent"
      />
      <Text
        x={btnX + 8}
        y={startY + labelH + gap + (btnH - 14) / 2}
        width={btnW - 16}
        text={buttonText}
        fontSize={14}
        fontStyle="600"
        fill={color}
        align="center"
        ellipsis
      />
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

  const prefixSize = 13;
  const nameSize = 22;
  const totalH = prefixSize + nameSize + 4;
  const startY = Math.max(6, (h - totalH) / 2);

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
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
      <Text
        x={14}
        y={startY + prefixSize + 4}
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

  const padX = 14;
  const fieldW = w - padX * 2;
  const submitBtnH = Math.min(42, Math.max(30, h * 0.14));

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
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

      {/* Field: Kehadiran Radio Options */}
      {h >= 185 && (
        <Group y={94}>
          <Text x={padX} text="Kehadiran" fontSize={13} fill={color} />
          {/* Radio 1: Hadir (Checked) */}
          <Circle x={padX + 8} y={24} radius={6} stroke={color} strokeWidth={1.5} fill="transparent" />
          <Circle x={padX + 8} y={24} radius={3.5} fill={color} />
          <Text x={padX + 20} y={18} text="Hadir" fontSize={13} fill={color} />

          {/* Radio 2: Tidak Hadir */}
          <Circle x={padX + 90} y={24} radius={6} stroke={color} strokeWidth={1.5} fill="transparent" />
          <Text x={padX + 102} y={18} text="Tidak hadir" fontSize={13} fill={color} opacity={0.8} />
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

      {/* Submit Button (Pill with border 1.5px solid currentColor) */}
      <Rect
        x={padX}
        y={Math.max(40, h - submitBtnH - 10)}
        width={fieldW}
        height={submitBtnH}
        cornerRadius={submitBtnH / 2}
        stroke={color}
        strokeWidth={1.5}
        fill="transparent"
      />
      <Text
        x={padX}
        y={Math.max(40, h - submitBtnH - 10) + (submitBtnH - 14) / 2}
        width={fieldW}
        text="Kirim Konfirmasi"
        fontSize={14}
        fontStyle="600"
        fill={color}
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

  const padX = 14;
  const contentW = w - padX * 2;

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
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
          const itemY = 38 + i * 56;
          if (itemY + 44 > h) return null;
          const copyBtnW = 68;
          const copyBtnH = 32;
          const copyBtnX = w - padX - copyBtnW;
          const copyBtnY = itemY + 4;

          return (
            <Group key={`${acc.accountNumber}-${i}`}>
              {/* Account details */}
              <Text
                x={padX}
                y={itemY}
                width={copyBtnX - padX - 8}
                text={acc.bank}
                fontSize={14}
                fontStyle="bold"
                fill={color}
              />
              <Text
                x={padX}
                y={itemY + 16}
                width={copyBtnX - padX - 8}
                text={acc.accountNumber}
                fontSize={13.5}
                fontStyle="bold"
                fill={color}
                letterSpacing={0.5}
              />
              <Text
                x={padX}
                y={itemY + 32}
                width={copyBtnX - padX - 8}
                text={`a.n. ${acc.accountName}`}
                fontSize={12}
                fill={color}
                opacity={0.8}
                ellipsis
              />

              {/* Salin button */}
              <Rect
                x={copyBtnX}
                y={copyBtnY}
                width={copyBtnW}
                height={copyBtnH}
                cornerRadius={copyBtnH / 2}
                stroke={color}
                strokeWidth={1.5}
                fill="transparent"
              />
              <Text
                x={copyBtnX}
                y={copyBtnY + (copyBtnH - 13) / 2}
                width={copyBtnW}
                text="Salin"
                fontSize={13}
                fontStyle="600"
                fill={color}
                align="center"
              />

              {/* Divider if not last */}
              {i < accounts.length - 1 && (
                <Line
                  points={[padX, itemY + 50, w - padX, itemY + 50]}
                  stroke={color}
                  strokeWidth={0.8}
                  opacity={0.15}
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

  const btnH = Math.min(44, Math.max(32, h * 0.7));
  const btnW = Math.min(w - 28, Math.max(140, w * 0.8));
  const btnX = (w - btnW) / 2;
  const btnY = (h - btnH) / 2;

  return (
    <Group listening={false}>
      {background !== "transparent" && (
        <Rect width={w} height={h} cornerRadius={radius} fill={background} />
      )}
      {/* Pill button matching .button in MusicWidget.tsx */}
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

  const padX = 14;
  const contentW = w - padX * 2;
  const headingH = 22;

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

      {layout === "slider" ? (
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
                    cornerRadius={14}
                    stroke={color}
                    strokeWidth={1.5}
                    fill="transparent"
                  />
                  <Text
                    x={sliderX}
                    y={6}
                    width={40}
                    text="‹"
                    fontSize={16}
                    fontStyle="bold"
                    fill={color}
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
                    cornerRadius={14}
                    stroke={color}
                    strokeWidth={1.5}
                    fill="transparent"
                  />
                  <Text
                    x={sliderX + sliderW - 40}
                    y={6}
                    width={40}
                    text="›"
                    fontSize={16}
                    fontStyle="bold"
                    fill={color}
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
                    cornerRadius={6}
                    stroke={color}
                    strokeWidth={1}
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
