"use client";

import { useEffect, useState } from "react";
import { Circle, Ellipse, Group, Image as KonvaImage, Line, Path, Rect, Text } from "react-konva";
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

// ============================================================================
// RICH REALISTIC WIDGET PREVIEWS ON CANVAS
// ============================================================================

function CountdownWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;

  // Compute countdown or provide realistic wedding preview numbers
  const [nowMs] = useState(() => Date.now());
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

  const padX = 8;
  const padY = 8;
  const gap = 6;
  const boxW = Math.max(20, (w - padX * 2 - gap * 3) / 4);
  const boxH = Math.max(20, h - padY * 2);

  const units: Array<{ key: CountdownUnit; val: number }> = [
    { key: "days", val: days },
    { key: "hours", val: hours },
    { key: "minutes", val: minutes },
    { key: "seconds", val: seconds },
  ];

  return (
    <Group listening={false}>
      {/* Outer Card */}
      <Rect
        width={w}
        height={h}
        cornerRadius={12}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.05)"
        shadowBlur={8}
        shadowOffsetY={2}
      />

      {/* 4 Countdown Boxes */}
      {units.map((u, i) => {
        const x = padX + i * (boxW + gap);
        const y = padY;
        const numFontSize = Math.min(24, Math.max(12, boxH * 0.42));
        const lblFontSize = Math.min(10, Math.max(8, boxH * 0.2));

        return (
          <Group key={u.key}>
            {/* Box tile */}
            <Rect
              x={x}
              y={y}
              width={boxW}
              height={boxH}
              cornerRadius={8}
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth={1}
            />

            {/* Digits */}
            <Text
              x={x}
              y={y + boxH * 0.14}
              width={boxW}
              text={pad(u.val)}
              fontSize={numFontSize}
              fontStyle="bold"
              fill="#0f172a"
              align="center"
            />

            {/* Label */}
            <Text
              x={x}
              y={y + boxH * 0.62}
              width={boxW}
              text={labels[u.key].toUpperCase()}
              fontSize={lblFontSize}
              fontStyle="bold"
              fill="#64748b"
              align="center"
            />

            {/* Separator colon dots between boxes */}
            {i < 3 && boxH > 25 && (
              <Group x={x + boxW + gap / 2} y={y + boxH / 2}>
                <Circle y={-4} radius={1.6} fill="#94a3b8" />
                <Circle y={4} radius={1.6} fill="#94a3b8" />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
}

function MapWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const venueLabel = typeof props.label === "string" ? props.label : "Lokasi Acara";
  const buttonText = typeof props.buttonText === "string" ? props.buttonText : "Buka Google Maps";

  return (
    <Group listening={false}>
      {/* Outer Card with Rounded Clipping */}
      <Rect
        width={w}
        height={h}
        cornerRadius={12}
        fill="#eef2f6"
        stroke="#cbd5e1"
        strokeWidth={1}
      />

      {/* Map Terrain: River / Water Channel */}
      <Line
        points={[0, h * 0.78, w * 0.35, h * 0.65, w * 0.65, h * 0.72, w, h * 0.55]}
        stroke="#bfdbfe"
        strokeWidth={Math.min(18, h * 0.16)}
        lineCap="round"
        lineJoin="round"
      />

      {/* Map Greenery / Park Polygons */}
      <Rect
        x={w * 0.05}
        y={h * 0.08}
        width={w * 0.28}
        height={Math.max(10, h * 0.32)}
        cornerRadius={6}
        fill="#dcfce7"
      />
      <Rect
        x={w * 0.68}
        y={h * 0.42}
        width={w * 0.26}
        height={Math.max(10, h * 0.42)}
        cornerRadius={6}
        fill="#dcfce7"
      />

      {/* Street & Road Network */}
      {/* Highway */}
      <Line
        points={[0, h * 0.38, w * 0.48, h * 0.45, w, h * 0.26]}
        stroke="#ffffff"
        strokeWidth={Math.min(9, h * 0.1)}
        lineCap="round"
      />
      <Line
        points={[0, h * 0.38, w * 0.48, h * 0.45, w, h * 0.26]}
        stroke="#fef08a"
        strokeWidth={Math.min(5, h * 0.06)}
        lineCap="round"
      />

      {/* Secondary Streets */}
      <Line points={[w * 0.48, 0, w * 0.48, h]} stroke="#ffffff" strokeWidth={5} />
      <Line points={[w * 0.22, 0, w * 0.22, h]} stroke="#ffffff" strokeWidth={3.5} />
      <Line points={[w * 0.78, 0, w * 0.78, h]} stroke="#ffffff" strokeWidth={3.5} />
      <Line points={[0, h * 0.68, w, h * 0.68]} stroke="#ffffff" strokeWidth={3.5} />

      {/* Building Footprint Blocks */}
      <Rect x={w * 0.27} y={h * 0.14} width={18} height={12} fill="#cbd5e1" cornerRadius={2} />
      <Rect x={w * 0.34} y={h * 0.18} width={22} height={14} fill="#cbd5e1" cornerRadius={2} />
      <Rect x={w * 0.54} y={h * 0.25} width={20} height={16} fill="#cbd5e1" cornerRadius={2} />

      {/* Prominent 3D Location Pin Marker in Center */}
      <Group x={w / 2} y={Math.max(18, h * 0.38)}>
        {/* Pin Ground Shadow */}
        <Ellipse radiusX={9} radiusY={3.5} y={13} fill="rgba(0,0,0,0.22)" />
        {/* Red Teardrop Pin */}
        <Path
          data="M0 -14 C-7 -14 -11 -9 -11 -3 C-11 5 0 13 0 13 C0 13 11 5 11 -3 C11 -9 7 -14 0 -14 Z"
          fill="#ef4444"
          stroke="#b91c1c"
          strokeWidth={1}
        />
        {/* Inner White Pin Center */}
        <Circle y={-5} radius={3.5} fill="#ffffff" />
      </Group>

      {/* Venue Info Card Floating at Bottom */}
      {h >= 60 && (
        <Group y={Math.max(10, h - 46)}>
          <Rect
            x={8}
            width={w - 16}
            height={38}
            cornerRadius={8}
            fill="#ffffff"
            shadowColor="rgba(0,0,0,0.12)"
            shadowBlur={6}
            shadowOffsetY={2}
          />
          <Text
            x={18}
            y={6}
            width={w - 130}
            text={venueLabel}
            fontSize={11}
            fontStyle="bold"
            fill="#0f172a"
            ellipsis
          />
          <Text
            x={18}
            y={22}
            width={w - 130}
            text="Lihat rute navigasi lokasi"
            fontSize={9}
            fill="#64748b"
            ellipsis
          />
          {/* Button */}
          <Rect x={w - 116} y={6} width={98} height={26} cornerRadius={6} fill="#2563eb" />
          <Text
            x={w - 116}
            y={12}
            width={98}
            text={buttonText}
            fontSize={9.5}
            fontStyle="bold"
            fill="#ffffff"
            align="center"
          />
        </Group>
      )}
    </Group>
  );
}

function GuestGreetingWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const parts = greetingParts(element.props as Record<string, unknown>);

  return (
    <Group listening={false}>
      {/* Card */}
      <Rect
        width={w}
        height={h}
        cornerRadius={12}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.04)"
        shadowBlur={6}
        shadowOffsetY={2}
      />
      {/* Top Gold Accent Bar */}
      <Rect x={w / 2 - 24} y={6} width={48} height={2.5} cornerRadius={2} fill="#e2b36f" />
      {/* Prefix */}
      <Text
        x={12}
        y={14}
        width={w - 24}
        text={parts.prefix.toUpperCase()}
        fontSize={Math.min(10, Math.max(8, h * 0.16))}
        fill="#64748b"
        align="center"
        letterSpacing={0.5}
      />
      {/* Recipient Name */}
      <Text
        x={12}
        y={Math.max(28, h * 0.38)}
        width={w - 24}
        text={parts.name}
        fontSize={Math.min(16, Math.max(12, h * 0.28))}
        fontStyle="bold"
        fill="#0f172a"
        align="center"
        ellipsis
      />
      {/* Subtitle */}
      {h >= 55 && (
        <Text
          x={12}
          y={Math.max(48, h * 0.72)}
          width={w - 24}
          text="Mohon maaf apabila ada kesalahan penulisan nama/gelar"
          fontSize={Math.min(9, Math.max(7, h * 0.14))}
          fill="#94a3b8"
          align="center"
        />
      )}
    </Group>
  );
}

function RsvpWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title = typeof props.title === "string" ? props.title : "Konfirmasi Kehadiran";

  return (
    <Group listening={false}>
      {/* Container Card */}
      <Rect
        width={w}
        height={h}
        cornerRadius={12}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.06)"
        shadowBlur={8}
        shadowOffsetY={2}
      />

      {/* Header */}
      <Text
        x={16}
        y={14}
        width={w - 32}
        text={title}
        fontSize={14}
        fontStyle="bold"
        fill="#0f172a"
        align="center"
      />
      <Text
        x={16}
        y={32}
        width={w - 32}
        text="Mohon konfirmasi kehadiran Anda di bawah ini"
        fontSize={9.5}
        fill="#64748b"
        align="center"
      />

      {/* Field: Nama Tamu */}
      {h >= 140 && (
        <Group y={50}>
          <Text x={16} text="Nama Lengkap" fontSize={9.5} fontStyle="bold" fill="#334155" />
          <Rect
            x={16}
            y={14}
            width={w - 32}
            height={28}
            cornerRadius={6}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <Text x={24} y={22} text="Masukkan nama Anda..." fontSize={9.5} fill="#94a3b8" />
        </Group>
      )}

      {/* Field: Pilihan Kehadiran */}
      {h >= 200 && (
        <Group y={100}>
          <Text x={16} text="Konfirmasi Kehadiran" fontSize={9.5} fontStyle="bold" fill="#334155" />
          {/* Pill Hadir */}
          <Rect
            x={16}
            y={14}
            width={(w - 40) / 2}
            height={28}
            cornerRadius={6}
            fill="#ecfdf5"
            stroke="#10b981"
            strokeWidth={1.5}
          />
          <Text
            x={16}
            y={22}
            width={(w - 40) / 2}
            text="✓ Hadir"
            fontSize={9.5}
            fontStyle="bold"
            fill="#047857"
            align="center"
          />
          {/* Pill Tidak Hadir */}
          <Rect
            x={16 + (w - 40) / 2 + 8}
            y={14}
            width={(w - 40) / 2}
            height={28}
            cornerRadius={6}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <Text
            x={16 + (w - 40) / 2 + 8}
            y={22}
            width={(w - 40) / 2}
            text="✗ Berhalangan"
            fontSize={9.5}
            fill="#64748b"
            align="center"
          />
        </Group>
      )}

      {/* Submit Button */}
      <Rect
        x={16}
        y={Math.max(50, h - 42)}
        width={w - 32}
        height={32}
        cornerRadius={8}
        fill="#2563eb"
      />
      <Text
        x={16}
        y={Math.max(50, h - 42) + 9}
        width={w - 32}
        text="Kirim Konfirmasi"
        fontSize={11}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
      />
    </Group>
  );
}

function GalleryWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title = typeof props.title === "string" ? props.title : "Galeri Foto";
  const layout = typeof props.layout === "string" ? props.layout : "grid";

  return (
    <Group listening={false}>
      {/* Outer Card */}
      <Rect
        width={w}
        height={h}
        cornerRadius={12}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <Text
        x={16}
        y={12}
        width={w - 32}
        text={title}
        fontSize={13}
        fontStyle="bold"
        fill="#0f172a"
        align="center"
      />

      {layout === "slider" ? (
        <Group y={34}>
          {/* Main Photo Card */}
          <Rect
            x={32}
            width={w - 64}
            height={h - 60}
            cornerRadius={8}
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          {/* Camera Icon in Center */}
          <Group x={w / 2} y={(h - 60) / 2 - 4}>
            <Rect x={-16} y={-11} width={32} height={22} cornerRadius={4} fill="#cbd5e1" />
            <Circle radius={6} fill="#f1f5f9" />
          </Group>
          {/* Nav arrows */}
          <Circle
            x={16}
            y={(h - 60) / 2}
            radius={11}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <Text
            x={11}
            y={(h - 60) / 2 - 7}
            text="‹"
            fontSize={14}
            fontStyle="bold"
            fill="#334155"
          />
          <Circle
            x={w - 16}
            y={(h - 60) / 2}
            radius={11}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <Text
            x={w - 20}
            y={(h - 60) / 2 - 7}
            text="›"
            fontSize={14}
            fontStyle="bold"
            fill="#334155"
          />
        </Group>
      ) : (
        /* 4-Item Grid Preview */
        <Group y={34}>
          {[0, 1, 2, 3].map((idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const itemW = (w - 36) / 2;
            const itemH = (h - 56) / 2;
            const itemX = 14 + col * (itemW + 8);
            const itemY = row * (itemH + 8);

            return (
              <Group key={idx} x={itemX} y={itemY}>
                <Rect
                  width={itemW}
                  height={itemH}
                  cornerRadius={6}
                  fill="#f1f5f9"
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <Circle
                  x={itemW / 2}
                  y={itemH / 2}
                  radius={Math.min(10, itemH * 0.2)}
                  fill="#cbd5e1"
                />
              </Group>
            );
          })}
        </Group>
      )}
    </Group>
  );
}

function MusicWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title = typeof props.title === "string" ? props.title : "Beautiful in White";

  return (
    <Group listening={false}>
      {/* Floating Dark Music Pill */}
      <Rect
        width={w}
        height={h}
        cornerRadius={h / 2}
        fill="#0f172a"
        shadowColor="rgba(0,0,0,0.18)"
        shadowBlur={10}
        shadowOffsetY={3}
      />

      {/* Spinning Vinyl Record Disc */}
      <Group x={h / 2} y={h / 2}>
        <Circle radius={h * 0.4} fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
        <Circle radius={h * 0.28} stroke="#475569" strokeWidth={0.8} />
        <Circle radius={h * 0.18} stroke="#475569" strokeWidth={0.8} />
        <Circle radius={h * 0.1} fill="#eab308" />
      </Group>

      {/* Middle Track Title */}
      <Text
        x={h + 6}
        y={h * 0.22}
        width={w - h * 2}
        text={`♪ ${title}`}
        fontSize={11}
        fontStyle="bold"
        fill="#ffffff"
        ellipsis
      />
      <Text x={h + 6} y={h * 0.54} text="Musik Pengiring Undangan" fontSize={9} fill="#94a3b8" />

      {/* Play Button Circle */}
      <Group x={w - h / 2} y={h / 2}>
        <Circle radius={h * 0.32} fill="#2563eb" />
        <Line points={[-2.5, -5, 5, 0, -2.5, 5]} fill="#ffffff" closed />
      </Group>
    </Group>
  );
}

function GiftWidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const props = element.props as Record<string, unknown>;
  const title = typeof props.title === "string" ? props.title : "Kirim Hadiah & Doa Restu";

  return (
    <Group listening={false}>
      {/* Card */}
      <Rect
        width={w}
        height={h}
        cornerRadius={12}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.05)"
        shadowBlur={8}
        shadowOffsetY={2}
      />

      {/* Header */}
      <Text
        x={16}
        y={14}
        width={w - 32}
        text={`🎁 ${title}`}
        fontSize={13}
        fontStyle="bold"
        fill="#0f172a"
        align="center"
      />
      <Text
        x={16}
        y={32}
        width={w - 32}
        text="Doa restu Anda merupakan hadiah terindah bagi kami"
        fontSize={9}
        fill="#64748b"
        align="center"
      />

      {/* Bank Account Card Preview */}
      {h >= 110 && (
        <Group y={48}>
          <Rect
            x={14}
            width={w - 28}
            height={h - 62}
            cornerRadius={8}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          {/* Bank Badge */}
          <Rect x={24} y={10} width={62} height={18} cornerRadius={4} fill="#1e40af" />
          <Text
            x={24}
            y={14}
            width={62}
            text="BANK BCA"
            fontSize={9}
            fontStyle="bold"
            fill="#ffffff"
            align="center"
          />
          {/* Account Number */}
          <Text
            x={24}
            y={34}
            text="1234 - 5678 - 9012"
            fontSize={13}
            fontStyle="bold"
            fill="#0f172a"
            letterSpacing={0.8}
          />
          <Text x={24} y={52} text="a.n. Romeo & Juliet" fontSize={10} fill="#64748b" />

          {/* Copy Button */}
          <Rect
            x={w - 138}
            y={Math.max(10, h - 100)}
            width={110}
            height={24}
            cornerRadius={6}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <Text
            x={w - 138}
            y={Math.max(10, h - 100) + 6}
            width={110}
            text="📋 Salin Rekening"
            fontSize={9}
            fontStyle="bold"
            fill="#2563eb"
            align="center"
          />
        </Group>
      )}
    </Group>
  );
}

export function WidgetVisual({ element }: { element: WidgetElement; tokens?: ThemeTokens }) {
  switch (element.widgetType) {
    case "countdown":
      return <CountdownWidgetVisual element={element} />;
    case "map":
      return <MapWidgetVisual element={element} />;
    case "guestGreeting":
      return <GuestGreetingWidgetVisual element={element} />;
    case "rsvp":
      return <RsvpWidgetVisual element={element} />;
    case "gallery":
      return <GalleryWidgetVisual element={element} />;
    case "music":
      return <MusicWidgetVisual element={element} />;
    case "gift":
      return <GiftWidgetVisual element={element} />;
    default: {
      const { w, h } = element.frame;
      const resolved = defaultWidgetRegistry.resolve(element.widgetType);
      const title = resolved.kind !== "unknown" ? resolved.definition.label : element.widgetType;
      return <Placeholder w={w} h={h} title={title} subtitle="Widget" />;
    }
  }
}
