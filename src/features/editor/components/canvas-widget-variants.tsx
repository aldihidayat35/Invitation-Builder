"use client";

import { useEffect, useState } from "react";
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from "react-konva";
import type { Element, ThemeTokens } from "@/lib/schema";
import {
  DEFAULT_COUNTDOWN_LABELS,
  computeCountdown,
  greetingParts,
  type CountdownUnit,
} from "@/features/widgets/logic";
import { parseGiftAccounts } from "@/features/widgets/runtime/GiftWidget";
import { parseGalleryItems } from "@/features/widgets/runtime/GalleryWidget";
import { fitImage } from "@/lib/image-fit";
import { resolveColor } from "../core/display";
import { useCanvasImage } from "./use-canvas-image";

type WidgetElement = Extract<Element, { type: "widget" }>;

function colors(element: WidgetElement, tokens?: ThemeTokens) {
  const color = tokens
    ? resolveColor(element.style.color, tokens, "#2b2118")
    : typeof element.style.color === "string"
      ? element.style.color
      : "#2b2118";
  const background = tokens
    ? resolveColor(element.style.background, tokens, "transparent")
    : typeof element.style.background === "string"
      ? element.style.background
      : "transparent";
  return { color, background, surface: background === "transparent" ? "#ffffff" : background };
}

const pad = (value: number) => String(value).padStart(2, "0");

function Background({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { background } = colors(element, tokens);
  const radius = element.style.radius ?? 0;
  return background === "transparent" ? null : (
    <Rect
      width={element.frame.w}
      height={element.frame.h}
      fill={background}
      cornerRadius={radius}
    />
  );
}

function CountdownVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const result = computeCountdown(props.targetDateTime, nowMs);
  const values =
    result.state === "counting" ? result : { days: 14, hours: 8, minutes: 24, seconds: 50 };
  const rawLabels = props.labels as Record<string, string> | undefined;
  const units: Array<{ key: CountdownUnit; value: number; label: string }> = [
    { key: "days", value: values.days, label: rawLabels?.days || DEFAULT_COUNTDOWN_LABELS.days },
    {
      key: "hours",
      value: values.hours,
      label: rawLabels?.hours || DEFAULT_COUNTDOWN_LABELS.hours,
    },
    {
      key: "minutes",
      value: values.minutes,
      label: rawLabels?.minutes || DEFAULT_COUNTDOWN_LABELS.minutes,
    },
    {
      key: "seconds",
      value: values.seconds,
      label: rawLabels?.seconds || DEFAULT_COUNTDOWN_LABELS.seconds,
    },
  ];

  if (result.state === "elapsed" && props.afterState !== "hide") {
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Text
          x={12}
          y={h / 2 - 9}
          width={w - 24}
          text={typeof props.afterMessage === "string" ? props.afterMessage : "Acara telah dimulai"}
          fontSize={16}
          fontStyle="bold"
          fill={color}
          align="center"
        />
      </Group>
    );
  }

  if (variant === "editorial-split") {
    const split = Math.round(w * 0.34);
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Rect x={2} y={8} width={4} height={h - 16} fill={color} />
        <Text
          x={14}
          y={12}
          width={split - 18}
          text={pad(units[0]!.value)}
          fontSize={34}
          fontStyle="bold"
          fill={color}
        />
        <Text
          x={14}
          y={51}
          width={split - 18}
          text={units[0]!.label.toUpperCase()}
          fontSize={9}
          letterSpacing={1.5}
          fill={color}
          opacity={0.7}
        />
        {units.slice(1).map((unit, index) => {
          const colW = (w - split - 10) / 3;
          const x = split + index * colW;
          return (
            <Group key={unit.key}>
              <Line points={[x, 16, x, h - 16]} stroke={color} opacity={0.18} />
              <Text
                x={x}
                y={20}
                width={colW}
                text={pad(unit.value)}
                fontSize={23}
                fontStyle="bold"
                fill={color}
                align="center"
              />
              <Text
                x={x}
                y={49}
                width={colW}
                text={unit.label.toUpperCase()}
                fontSize={8}
                fill={color}
                opacity={0.68}
                align="center"
              />
            </Group>
          );
        })}
      </Group>
    );
  }

  if (variant === "ribbon") {
    return (
      <Group listening={false}>
        <Line
          points={[2, 18, 16, 8, 16, h - 8, 2, h - 18, 7, h / 2]}
          closed
          fill={color}
          opacity={0.78}
        />
        <Line
          points={[w - 2, 18, w - 16, 8, w - 16, h - 8, w - 2, h - 18, w - 7, h / 2]}
          closed
          fill={color}
          opacity={0.78}
        />
        <Rect
          x={12}
          y={5}
          width={w - 24}
          height={h - 10}
          cornerRadius={element.style.radius ?? 6}
          fill={color}
        />
        {units.map((unit, index) => {
          const colW = (w - 36) / 4;
          const x = 18 + index * colW;
          return (
            <Group key={unit.key}>
              {index > 0 ? (
                <Line points={[x, 21, x, h - 21]} stroke={surface} opacity={0.28} />
              ) : null}
              <Text
                x={x}
                y={15}
                width={colW}
                text={pad(unit.value)}
                fontSize={24}
                fontStyle="bold"
                fill={surface}
                align="center"
              />
              <Text
                x={x}
                y={45}
                width={colW}
                text={unit.label.toUpperCase()}
                fontSize={8}
                fill={surface}
                opacity={0.82}
                align="center"
              />
            </Group>
          );
        })}
      </Group>
    );
  }

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {variant === "heritage-frame" ? (
        <>
          <Rect
            width={w}
            height={h}
            cornerRadius={element.style.radius ?? 8}
            stroke={color}
            strokeWidth={1}
          />
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={Math.max(0, (element.style.radius ?? 8) - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
          <Text x={w / 2 - 8} y={3} width={16} text="◆" fontSize={8} fill={color} align="center" />
        </>
      ) : null}
      {units.map((unit, index) => {
        const gap = variant === "flip-cards" ? 6 : 5;
        const colW = (w - 20 - gap * 3) / 4;
        const x = 10 + index * (colW + gap);
        const circle = variant === "orbit";
        return (
          <Group key={unit.key}>
            {circle ? (
              <Circle
                x={x + colW / 2}
                y={h / 2}
                radius={Math.min(colW / 2 - 1, h / 2 - 7)}
                stroke={color}
                strokeWidth={1.2}
                fill={color}
                opacity={0.08}
              />
            ) : variant === "flip-cards" ? (
              <>
                <Rect
                  x={x}
                  y={9}
                  width={colW}
                  height={h - 18}
                  cornerRadius={element.style.radius ?? 10}
                  fill={color}
                  opacity={0.09}
                  stroke={color}
                  strokeWidth={1}
                />
                <Line points={[x, h / 2, x + colW, h / 2]} stroke={color} opacity={0.2} />
              </>
            ) : index > 0 ? (
              <Line points={[x - gap / 2, 19, x - gap / 2, h - 19]} stroke={color} opacity={0.23} />
            ) : null}
            <Text
              x={x}
              y={h / 2 - 24}
              width={colW}
              text={pad(unit.value)}
              fontSize={circle ? 20 : 24}
              fontStyle="bold"
              fill={color}
              align="center"
            />
            <Text
              x={x}
              y={h / 2 + 7}
              width={colW}
              text={unit.label.toUpperCase()}
              fontSize={8}
              fill={color}
              opacity={0.68}
              align="center"
            />
          </Group>
        );
      })}
    </Group>
  );
}

function MapSurface({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const pinX = x + width * 0.58;
  const pinY = y + height * 0.55;
  return (
    <Group>
      <Rect x={x} y={y} width={width} height={height} fill="#edf3f5" />
      <Rect
        x={x + 8}
        y={y + 10}
        width={width * 0.3}
        height={height * 0.35}
        cornerRadius={6}
        fill="#dcecd9"
      />
      <Line
        points={[x, y + height * 0.7, x + width, y + height * 0.25]}
        stroke="#b7d6ee"
        strokeWidth={10}
      />
      <Line
        points={[x, y + height * 0.35, x + width, y + height * 0.62]}
        stroke="#fff"
        strokeWidth={5}
      />
      <Line
        points={[x + width * 0.35, y, x + width * 0.35, y + height]}
        stroke="#fff"
        strokeWidth={4}
      />
      <Circle x={pinX} y={pinY} radius={12} fill="#e6493d" opacity={0.18} />
      <Line
        points={[pinX - 7, pinY - 12, pinX, pinY + 3, pinX + 7, pinY - 12]}
        closed
        fill="#e6493d"
      />
      <Circle x={pinX} y={pinY - 12} radius={8} fill="#e6493d" />
      <Circle x={pinX} y={pinY - 12} radius={3} fill="#fff" />
    </Group>
  );
}

function MapButton({
  x,
  y,
  width,
  solid = false,
  color,
  surface,
  label,
}: {
  x: number;
  y: number;
  width: number;
  solid?: boolean;
  color: string;
  surface: string;
  label: string;
}) {
  return (
    <Group>
      <Rect
        x={x}
        y={y}
        width={width}
        height={30}
        cornerRadius={15}
        fill={solid ? color : "transparent"}
        stroke={color}
        strokeWidth={1.2}
      />
      <Text
        x={x + 6}
        y={y + 9}
        width={width - 12}
        text={label}
        fontSize={10}
        fontStyle="bold"
        fill={solid ? surface : color}
        align="center"
        ellipsis
      />
    </Group>
  );
}

function MapVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const label =
    typeof props.label === "string" && props.label.trim() ? props.label : "Lokasi acara";
  const button =
    typeof props.buttonText === "string" && props.buttonText.trim()
      ? props.buttonText
      : "Buka Google Maps";
  const radius = element.style.radius ?? 12;

  if (variant === "full-bleed") {
    return (
      <Group
        listening={false}
        clipFunc={(ctx: { rect(x: number, y: number, w: number, h: number): void }) =>
          ctx.rect(0, 0, w, h)
        }
      >
        <MapSurface x={0} y={0} width={w} height={h} />
        <Rect
          x={10}
          y={h - 60}
          width={w - 20}
          height={50}
          cornerRadius={10}
          fill={surface}
          opacity={0.93}
          shadowColor="#000"
          shadowBlur={10}
          shadowOpacity={0.16}
        />
        <Text
          x={20}
          y={h - 45}
          width={w * 0.45}
          text={label}
          fontSize={13}
          fontStyle="bold"
          fill={color}
          ellipsis
        />
        <MapButton
          x={w - 132}
          y={h - 50}
          width={112}
          solid
          color={color}
          surface={surface}
          label={button}
        />
      </Group>
    );
  }

  if (variant === "location-ticket" || variant === "soft-panel") {
    const mapOnLeft = variant === "location-ticket";
    const mapX = mapOnLeft ? 0 : w * 0.46;
    const mapW = mapOnLeft ? w * 0.61 : w * 0.54;
    const detailsX = mapOnLeft ? w * 0.61 : 0;
    const detailsW = w - mapW;
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Rect
          width={w}
          height={h}
          cornerRadius={radius}
          fill={variant === "soft-panel" ? color : surface}
          opacity={variant === "soft-panel" ? 0.07 : 1}
          stroke={color}
          strokeWidth={variant === "location-ticket" ? 1 : 0}
        />
        <Group
          clipFunc={(ctx: { rect(x: number, y: number, w: number, h: number): void }) =>
            ctx.rect(mapX, 0, mapW, h)
          }
        >
          <MapSurface x={mapX} y={0} width={mapW} height={h} />
        </Group>
        {variant === "location-ticket" ? (
          <Line
            points={[detailsX, 8, detailsX, h - 8]}
            stroke={color}
            dash={[5, 4]}
            opacity={0.65}
          />
        ) : null}
        <Circle x={detailsX + detailsW / 2} y={46} radius={18} fill={color} opacity={0.12} />
        <Circle x={detailsX + detailsW / 2} y={46} radius={5} fill={color} />
        <Text
          x={detailsX + 8}
          y={72}
          width={detailsW - 16}
          text={label}
          fontSize={12}
          fontStyle="bold"
          fill={color}
          align="center"
          ellipsis
        />
        <MapButton
          x={detailsX + 8}
          y={h - 45}
          width={detailsW - 16}
          solid={variant === "soft-panel"}
          color={color}
          surface={surface}
          label={button}
        />
      </Group>
    );
  }

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {variant === "heritage-frame" ? (
        <>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} />
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </>
      ) : (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius}
          stroke={color}
          opacity={0.22}
          shadowColor="#000"
          shadowBlur={8}
          shadowOpacity={0.08}
        />
      )}
      <Group
        clipFunc={(ctx: { rect(x: number, y: number, w: number, h: number): void }) =>
          ctx.rect(8, 8, w - 16, h - 72)
        }
      >
        <MapSurface x={8} y={8} width={w - 16} height={h - 72} />
      </Group>
      <Text
        x={16}
        y={h - 55}
        width={w * 0.48}
        text={label}
        fontSize={13}
        fontStyle="bold"
        fill={color}
        ellipsis
      />
      <MapButton
        x={w - 142}
        y={h - 61}
        width={126}
        color={color}
        surface={surface}
        label={button}
      />
    </Group>
  );
}

function GreetingVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const parts = greetingParts(element.props as Record<string, unknown>);
  const radius = element.style.radius ?? 0;
  const centerText = (
    <>
      <Text
        x={14}
        y={12}
        width={w - 28}
        text={parts.prefix}
        fontSize={11}
        fill={color}
        opacity={0.7}
        align="center"
      />
      <Text
        x={14}
        y={30}
        width={w - 28}
        text={parts.name}
        fontSize={20}
        fontStyle="bold"
        fill={color}
        align="center"
        ellipsis
      />
    </>
  );

  if (variant === "editorial-left") {
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Rect x={2} y={8} width={4} height={h - 16} fill={color} />
        <Text
          x={16}
          y={9}
          width={w - 26}
          text={parts.prefix.toUpperCase()}
          fontSize={9}
          letterSpacing={1.4}
          fill={color}
          opacity={0.66}
        />
        <Text
          x={16}
          y={28}
          width={w - 26}
          text={parts.name}
          fontSize={22}
          fontStyle="bold"
          fill={color}
          ellipsis
        />
      </Group>
    );
  }

  if (variant === "monogram") {
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Circle x={35} y={h / 2} radius={24} stroke={color} strokeWidth={1.5} />
        <Circle x={35} y={h / 2} radius={20} stroke={color} opacity={0.35} />
        <Text
          x={16}
          y={h / 2 - 14}
          width={38}
          text={parts.name.charAt(0).toUpperCase() || "T"}
          fontSize={25}
          fontStyle="bold"
          fill={color}
          align="center"
        />
        <Text
          x={70}
          y={12}
          width={w - 82}
          text={parts.prefix}
          fontSize={11}
          fill={color}
          opacity={0.7}
        />
        <Text
          x={70}
          y={30}
          width={w - 82}
          text={parts.name}
          fontSize={19}
          fontStyle="bold"
          fill={color}
          ellipsis
        />
      </Group>
    );
  }

  if (variant === "ribbon") {
    return (
      <Group listening={false}>
        <Line
          points={[2, 14, 16, 5, 16, h - 5, 2, h - 14, 7, h / 2]}
          closed
          fill={color}
          opacity={0.76}
        />
        <Line
          points={[w - 2, 14, w - 16, 5, w - 16, h - 5, w - 2, h - 14, w - 7, h / 2]}
          closed
          fill={color}
          opacity={0.76}
        />
        <Rect x={12} y={3} width={w - 24} height={h - 6} cornerRadius={radius || 5} fill={color} />
        <Text
          x={24}
          y={11}
          width={w - 48}
          text={parts.prefix}
          fontSize={10}
          fill={surface}
          opacity={0.82}
          align="center"
        />
        <Text
          x={24}
          y={28}
          width={w - 48}
          text={parts.name}
          fontSize={19}
          fontStyle="bold"
          fill={surface}
          align="center"
          ellipsis
        />
      </Group>
    );
  }

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {variant === "envelope-card" ? (
        <>
          <Rect
            width={w}
            height={h}
            cornerRadius={radius || 12}
            fill={color}
            opacity={0.06}
            stroke={color}
            strokeWidth={1}
          />
          <Line points={[8, 7, w / 2, h - 8, w - 8, 7]} stroke={color} opacity={0.12} />
        </>
      ) : (
        <>
          <Rect width={w} height={h} cornerRadius={radius || 8} stroke={color} />
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={Math.max(0, (radius || 8) - 2)}
            stroke={color}
            opacity={0.5}
          />
          <Text x={8} y={h / 2 - 5} width={18} text="◆" fontSize={8} fill={color} />
          <Text
            x={w - 26}
            y={h / 2 - 5}
            width={18}
            text="◆"
            fontSize={8}
            fill={color}
            align="right"
          />
        </>
      )}
      {centerText}
    </Group>
  );
}

function RsvpVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() ? props.title : "Konfirmasi Kehadiran";
  const radius = element.style.radius ?? 10;
  const split = variant === "split-panel";
  const padX = split ? Math.round(w * 0.4) + 12 : 16;
  const fieldW = w - padX - 16;
  const field = (y: number, label: string, width = fieldW) => (
    <Group>
      <Text x={padX} y={y} width={width} text={label} fontSize={10} fill={color} opacity={0.72} />
      <Rect
        x={padX}
        y={y + 14}
        width={width}
        height={32}
        cornerRadius={variant === "editorial-form" ? 0 : 7}
        stroke={color}
        strokeWidth={variant === "editorial-form" ? 0 : 1}
        fill={variant === "soft-card" ? surface : "transparent"}
        opacity={variant === "soft-card" ? 0.78 : 1}
      />
      {variant === "editorial-form" ? (
        <Line points={[padX, y + 46, padX + width, y + 46]} stroke={color} />
      ) : null}
    </Group>
  );
  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {variant === "soft-card" ? (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius}
          fill={color}
          opacity={0.06}
          shadowColor="#000"
          shadowBlur={14}
          shadowOpacity={0.1}
        />
      ) : null}
      {variant === "ticket-form" ? (
        <Rect width={w} height={h} cornerRadius={radius} stroke={color} />
      ) : null}
      {variant === "heritage-frame" ? (
        <>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} />
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {split ? (
        <Rect
          width={Math.round(w * 0.4)}
          height={h}
          cornerRadius={[radius, 0, 0, radius]}
          fill={color}
        />
      ) : null}
      <Text
        x={split ? 12 : 16}
        y={split ? h / 2 - 28 : 14}
        width={split ? w * 0.4 - 24 : w - 32}
        text="RSVP"
        fontSize={9}
        letterSpacing={2}
        fill={split ? surface : color}
        opacity={0.72}
        align={split ? "center" : "left"}
      />
      <Text
        x={split ? 12 : 16}
        y={split ? h / 2 - 5 : 32}
        width={split ? w * 0.4 - 24 : w - 32}
        text={title}
        fontSize={split ? 17 : 20}
        fontStyle="bold"
        fill={split ? surface : color}
        align={split ? "center" : "left"}
      />
      {variant === "ticket-form" ? (
        <Line points={[16, 67, w - 16, 67]} stroke={color} dash={[5, 4]} opacity={0.55} />
      ) : null}
      {field(split ? 20 : 76, "Nama tamu")}
      <Text
        x={padX}
        y={split ? 77 : 139}
        text="Kehadiran"
        fontSize={10}
        fill={color}
        opacity={0.72}
      />
      <Rect x={padX} y={split ? 94 : 156} width={82} height={28} cornerRadius={14} fill={color} />
      <Text
        x={padX}
        y={(split ? 94 : 156) + 8}
        width={82}
        text="Hadir"
        fontSize={11}
        fontStyle="bold"
        fill={surface}
        align="center"
      />
      <Rect
        x={padX + 90}
        y={split ? 94 : 156}
        width={Math.max(72, fieldW - 90)}
        height={28}
        cornerRadius={14}
        stroke={color}
      />
      <Text
        x={padX + 90}
        y={(split ? 94 : 156) + 8}
        width={Math.max(72, fieldW - 90)}
        text="Tidak hadir"
        fontSize={10}
        fill={color}
        align="center"
      />
      {h > 290 ? field(207, "Pesan (opsional)") : null}
      <Rect
        x={padX}
        y={h - 50}
        width={fieldW}
        height={36}
        cornerRadius={variant === "editorial-form" ? 0 : 18}
        fill={variant === "ticket-form" || variant === "heritage-frame" ? color : "transparent"}
        stroke={color}
        strokeWidth={1.3}
      />
      <Text
        x={padX}
        y={h - 39}
        width={fieldW}
        text="Kirim Konfirmasi"
        fontSize={12}
        fontStyle="bold"
        fill={variant === "ticket-form" || variant === "heritage-frame" ? surface : color}
        align="center"
      />
    </Group>
  );
}

function GiftVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() ? props.title : "Kirim Hadiah";
  const accounts = parseGiftAccounts(props.accounts);
  const list = accounts.length
    ? accounts.slice(0, 3)
    : [
        { bank: "BCA", accountNumber: "1234 5678 90", accountName: "Nama Penerima" },
        { bank: "MANDIRI", accountNumber: "9876 5432 10", accountName: "Nama Penerima" },
      ];
  const radius = element.style.radius ?? 10;

  const isEnvelope = variant === "envelope-tuck";
  const isGold = variant === "gold-ornament";
  const isQr = variant === "qr-showcase";
  const isMinimal = variant === "minimalist-clean";
  const isGlass = variant === "glass-card";
  const isHeritage = variant === "heritage-frame";
  const isWallet = variant === "wallet-panel";
  const isCompact = variant === "compact-list";
  const isStacked = variant === "stacked-slips";
  const isBankCard = variant === "bank-card";

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />

      {/* Outer Containers for specific variants */}
      {isWallet ? (
        <Rect width={w} height={h} cornerRadius={radius} fill={color} opacity={0.08} />
      ) : null}

      {isHeritage ? (
        <>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} strokeWidth={1} />
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1.5}
          />
          <Text x={w / 2 - 8} y={3} width={16} text="◆" fontSize={8} fill={color} align="center" />
        </>
      ) : null}

      {isGold ? (
        <>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} strokeWidth={1} />
          <Rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.7}
          />
          {/* Corner flourish accents */}
          <Text x={6} y={5} text="✦" fontSize={8} fill={color} opacity={0.7} />
          <Text x={w - 14} y={5} text="✦" fontSize={8} fill={color} opacity={0.7} />
          <Text x={6} y={h - 14} text="✦" fontSize={8} fill={color} opacity={0.7} />
          <Text x={w - 14} y={h - 14} text="✦" fontSize={8} fill={color} opacity={0.7} />
          <Text x={w / 2 - 8} y={2} width={16} text="⚜" fontSize={11} fill={color} align="center" />
        </>
      ) : null}

      {isEnvelope ? (
        <>
          <Line
            points={[12, 6, w / 2, 28, w - 12, 6]}
            stroke={color}
            strokeWidth={1.5}
            dash={[4, 3]}
            opacity={0.5}
          />
          <Circle x={w / 2} y={28} radius={10} fill={color} />
          <Text
            x={w / 2 - 8}
            y={22}
            width={16}
            text="✉"
            fontSize={9}
            fill={surface}
            align="center"
          />
        </>
      ) : null}

      {/* Header Titles */}
      <Text
        x={14}
        y={isEnvelope ? 38 : isGold ? 14 : 10}
        width={w - 28}
        text={
          isGold
            ? "WEDDING GIFT & BLESSING"
            : isQr
              ? "CASHLESS & E-WALLET"
              : isMinimal
                ? "DIGITAL GIFT"
                : "DIGITAL GIFT"
        }
        fontSize={8}
        letterSpacing={1.8}
        fill={color}
        opacity={0.65}
        align={isCompact ? "left" : "center"}
      />
      <Text
        x={14}
        y={isEnvelope ? 51 : isGold ? 27 : 24}
        width={w - 28}
        text={title}
        fontSize={16}
        fontStyle="bold"
        fill={color}
        align={isCompact ? "left" : "center"}
      />

      {isGold ? (
        <Line
          points={[w / 2 - 25, 46, w / 2 + 25, 46]}
          stroke={color}
          strokeWidth={1}
          opacity={0.4}
        />
      ) : null}

      {/* Account Cards */}
      {list.map((account, index) => {
        const itemH = isCompact ? 46 : isBankCard ? 82 : isQr ? 62 : isMinimal ? 52 : 58;
        const startY = isEnvelope ? 72 : isGold ? 54 : 50;
        const y = startY + index * (itemH + (isMinimal ? 6 : 8));
        if (y + itemH > h - 4) return null;

        const cardX = isStacked ? 18 + index * 3 : 14;
        const cardW = w - cardX - 14;
        const solid = isBankCard;

        return (
          <Group
            key={`${account.accountNumber}-${index}`}
            rotation={isStacked ? (index % 2 ? 0.9 : -0.9) : 0}
          >
            {/* Card Background */}
            {!isCompact ? (
              <Rect
                x={cardX}
                y={y}
                width={cardW}
                height={itemH}
                cornerRadius={
                  isMinimal
                    ? 6
                    : isGlass
                      ? 14
                      : isQr
                        ? 12
                        : isBankCard
                          ? radius
                          : Math.min(radius, 10)
                }
                fill={solid ? color : isGlass ? surface : surface}
                stroke={color}
                strokeWidth={isMinimal || isGlass ? 1 : solid ? 0 : 1}
                opacity={solid ? 1 : isGlass ? 0.85 : 0.96}
                shadowColor="#000"
                shadowBlur={isStacked ? 6 : isGlass ? 8 : isBankCard ? 4 : 0}
                shadowOpacity={isStacked ? 0.14 : isGlass ? 0.08 : isBankCard ? 0.15 : 0}
              />
            ) : (
              <Line points={[14, y + itemH, w - 14, y + itemH]} stroke={color} opacity={0.18} />
            )}

            {/* Specular highlight for glass-card */}
            {isGlass ? (
              <Line
                points={[cardX + 12, y + 2, cardX + cardW - 12, y + 2]}
                stroke={surface}
                strokeWidth={1.5}
                opacity={0.65}
              />
            ) : null}

            {/* Chip for Bank Card */}
            {isBankCard ? (
              <Group>
                <Rect
                  x={cardX + 10}
                  y={y + 11}
                  width={24}
                  height={17}
                  cornerRadius={4}
                  fill="#ffd700"
                  opacity={0.9}
                />
                <Line
                  points={[cardX + 10, y + 19, cardX + 34, y + 19]}
                  stroke="#b8860b"
                  strokeWidth={0.8}
                />
                <Line
                  points={[cardX + 22, y + 11, cardX + 22, y + 28]}
                  stroke="#b8860b"
                  strokeWidth={0.8}
                />
              </Group>
            ) : null}

            {/* Stylized QR placeholder for qr-showcase */}
            {isQr ? (
              <Group>
                <Rect
                  x={cardX + 8}
                  y={y + 8}
                  width={34}
                  height={34}
                  cornerRadius={6}
                  fill={color}
                  opacity={0.08}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* 3 QR finder squares */}
                <Rect x={cardX + 12} y={y + 12} width={8} height={8} fill={color} />
                <Rect x={cardX + 30} y={y + 12} width={8} height={8} fill={color} />
                <Rect x={cardX + 12} y={y + 30} width={8} height={8} fill={color} />
              </Group>
            ) : null}

            {/* Bank Badge Monogram (when not BankCard or QR or Compact) */}
            {!isCompact && !isBankCard && !isQr ? (
              <Group>
                <Rect
                  x={cardX + 8}
                  y={y + (itemH - 28) / 2}
                  width={32}
                  height={28}
                  cornerRadius={6}
                  fill={color}
                  opacity={0.12}
                />
                <Text
                  x={cardX + 8}
                  y={y + (itemH - 28) / 2 + 8}
                  width={32}
                  text={(account.bank || "$").slice(0, 3).toUpperCase()}
                  fontSize={9}
                  fontStyle="bold"
                  fill={color}
                  align="center"
                />
              </Group>
            ) : null}

            {/* Bank Name */}
            <Text
              x={
                isCompact
                  ? 14
                  : isBankCard
                    ? cardX + 42
                    : isQr
                      ? cardX + 48
                      : cardX + 46
              }
              y={y + (isCompact ? 6 : isBankCard ? 11 : isMinimal ? 8 : 10)}
              width={cardW - 100}
              text={account.bank || "BANK"}
              fontSize={10}
              fontStyle="bold"
              fill={solid ? surface : color}
            />

            {/* Account Number */}
            <Text
              x={
                isCompact
                  ? 14
                  : isBankCard
                    ? cardX + 12
                    : isQr
                      ? cardX + 48
                      : cardX + 46
              }
              y={y + (isCompact ? 22 : isBankCard ? 36 : isMinimal ? 22 : 25)}
              width={cardW - 90}
              text={account.accountNumber}
              fontSize={isBankCard ? 14 : 12}
              fontStyle="bold"
              letterSpacing={0.8}
              fill={solid ? surface : color}
              ellipsis
            />

            {/* Account Holder Name */}
            {!isCompact ? (
              <Text
                x={
                  isBankCard
                    ? cardX + 12
                    : isQr
                      ? cardX + 48
                      : cardX + 46
                }
                y={y + (isBankCard ? 58 : isMinimal ? 36 : 41)}
                width={cardW - 90}
                text={`a.n. ${account.accountName || "Nama Pemilik"}`}
                fontSize={8.5}
                fill={solid ? surface : color}
                opacity={solid ? 0.85 : 0.72}
                ellipsis
              />
            ) : null}

            {/* Copy Button / Pill on right */}
            {isMinimal ? (
              <Group>
                <Rect
                  x={w - 62}
                  y={y + (itemH - 24) / 2}
                  width={44}
                  height={24}
                  cornerRadius={12}
                  stroke={color}
                  strokeWidth={0.8}
                />
                <Text
                  x={w - 62}
                  y={y + (itemH - 24) / 2 + 6}
                  width={44}
                  text="Salin"
                  fontSize={9}
                  fontStyle="bold"
                  fill={color}
                  align="center"
                />
              </Group>
            ) : isBankCard ? (
              <Group>
                <Rect
                  x={w - 66}
                  y={y + (itemH - 26) / 2}
                  width={48}
                  height={26}
                  cornerRadius={13}
                  fill={surface}
                  opacity={0.2}
                />
                <Text
                  x={w - 66}
                  y={y + (itemH - 26) / 2 + 7}
                  width={48}
                  text="SALIN"
                  fontSize={8.5}
                  fontStyle="bold"
                  fill={surface}
                  align="center"
                />
              </Group>
            ) : (
              <Group>
                <Circle
                  x={w - 34}
                  y={y + itemH / 2}
                  radius={14}
                  stroke={solid ? surface : color}
                  strokeWidth={1}
                  opacity={0.75}
                />
                <Text
                  x={w - 43}
                  y={y + itemH / 2 - 6}
                  width={18}
                  text="⧉"
                  fontSize={11}
                  fill={solid ? surface : color}
                  align="center"
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
}

function MusicPlay({
  x,
  y,
  inverse = false,
  color,
  surface,
}: {
  x: number;
  y: number;
  inverse?: boolean;
  color: string;
  surface: string;
}) {
  return (
    <Group>
      <Circle x={x} y={y} radius={15} fill={inverse ? surface : color} stroke={color} />
      <Line
        points={[x - 4, y - 6, x + 6, y, x - 4, y + 6]}
        closed
        fill={inverse ? color : surface}
      />
    </Group>
  );
}

function MusicVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const title = typeof props.title === "string" && props.title.trim() ? props.title : "Putar musik";
  const radius = element.style.radius ?? 10;

  if (variant === "vinyl") {
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Circle x={39} y={h / 2} radius={25} fill={color} />
        <Circle x={39} y={h / 2} radius={17} stroke={surface} opacity={0.32} />
        <Circle x={39} y={h / 2} radius={5} fill={surface} />
        <Text
          x={76}
          y={15}
          width={w - 126}
          text="MUSIK UNDANGAN"
          fontSize={8}
          letterSpacing={1.3}
          fill={color}
          opacity={0.62}
        />
        <Text
          x={76}
          y={32}
          width={w - 126}
          text={title}
          fontSize={14}
          fontStyle="bold"
          fill={color}
          ellipsis
        />
        <MusicPlay x={w - 29} y={h / 2} color={color} surface={surface} />
      </Group>
    );
  }

  if (variant === "equalizer") {
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        <Rect width={w} height={h} cornerRadius={radius} fill={color} opacity={0.07} />
        <MusicPlay x={28} y={h / 2} color={color} surface={surface} />
        <Text
          x={52}
          y={h / 2 - 8}
          width={w - 125}
          text={title}
          fontSize={13}
          fontStyle="bold"
          fill={color}
          ellipsis
        />
        {[12, 25, 18, 31].map((barH, index) => (
          <Rect
            key={index}
            x={w - 58 + index * 9}
            y={(h - barH) / 2}
            width={4}
            height={barH}
            cornerRadius={2}
            fill={color}
          />
        ))}
      </Group>
    );
  }

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {variant === "mini-player" ? (
        <Rect
          x={4}
          y={4}
          width={w - 8}
          height={h - 8}
          cornerRadius={radius}
          stroke={color}
          opacity={0.32}
          shadowColor="#000"
          shadowBlur={8}
          shadowOpacity={0.1}
        />
      ) : null}
      {variant === "floating-pill" ? (
        <Rect
          x={7}
          y={8}
          width={w - 14}
          height={h - 16}
          cornerRadius={(h - 16) / 2}
          fill={surface}
          shadowColor="#000"
          shadowBlur={12}
          shadowOpacity={0.16}
        />
      ) : null}
      {variant === "minimal-control" ? (
        <Line points={[8, h - 8, w - 8, h - 8]} stroke={color} opacity={0.5} />
      ) : null}
      <MusicPlay
        x={30}
        y={h / 2}
        inverse={variant === "minimal-control"}
        color={color}
        surface={surface}
      />
      <Text
        x={54}
        y={12}
        width={w - 70}
        text="MUSIK UNDANGAN"
        fontSize={8}
        letterSpacing={1.2}
        fill={color}
        opacity={0.58}
      />
      <Text
        x={54}
        y={29}
        width={w - 70}
        text={title}
        fontSize={13}
        fontStyle="bold"
        fill={color}
        ellipsis
      />
      {variant === "mini-player" ? (
        <>
          <Line points={[54, h - 12, w - 18, h - 12]} stroke={color} opacity={0.18} />
          <Line points={[54, h - 12, w * 0.58, h - 12]} stroke={color} strokeWidth={2} />
        </>
      ) : null}
    </Group>
  );
}

export function CanvasGalleryPhoto({
  x,
  y,
  width,
  height,
  rotation = 0,
  radius,
  arch = false,
  color,
  src,
  strokeWidth = 0.7,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  radius: number;
  arch?: boolean;
  color: string;
  src?: string | undefined;
  strokeWidth?: number | undefined;
}) {
  const image = useCanvasImage(src ?? null);
  const fitted = image
    ? fitImage({
        boxWidth: width,
        boxHeight: height,
        imageWidth: image.naturalWidth || image.width,
        imageHeight: image.naturalHeight || image.height,
        fit: "cover",
        focal: { x: 0.5, y: 0.5 },
      })
    : null;
  const topRadius = arch ? Math.min(width / 2, 80) : radius;
  const clippedRadius = Math.min(radius, width / 2, height / 2);
  const rectCornerRadius: [number, number, number, number] | number = arch
    ? [topRadius, topRadius, radius, radius]
    : clippedRadius;

  return (
    <Group x={x} y={y} rotation={rotation}>
      <Rect
        width={width}
        height={height}
        cornerRadius={rectCornerRadius}
        fill={color}
        opacity={0.1}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle
        x={width * 0.7}
        y={height * 0.3}
        radius={Math.min(width, height) * 0.08}
        fill={color}
        opacity={0.25}
      />
      <Line
        points={[
          4,
          height - 6,
          width * 0.4,
          height * 0.52,
          width * 0.62,
          height * 0.72,
          width - 4,
          height * 0.42,
        ]}
        closed
        fill={color}
        opacity={0.14}
      />
      {image && fitted ? (
        <Group
          clipFunc={(context) => {
            context.beginPath();
            if (arch) {
              context.moveTo(topRadius, 0);
              context.arcTo(width, 0, width, height, topRadius);
              context.arcTo(width, height, 0, height, radius);
              context.arcTo(0, height, 0, 0, radius);
              context.arcTo(0, 0, width, 0, topRadius);
            } else {
              context.moveTo(clippedRadius, 0);
              context.arcTo(width, 0, width, height, clippedRadius);
              context.arcTo(width, height, 0, height, clippedRadius);
              context.arcTo(0, height, 0, 0, clippedRadius);
              context.arcTo(0, 0, width, 0, clippedRadius);
            }
            context.closePath();
          }}
        >
          <KonvaImage
            image={image}
            x={fitted.dest.x}
            y={fitted.dest.y}
            width={fitted.dest.width}
            height={fitted.dest.height}
            crop={fitted.crop}
            listening={false}
          />
        </Group>
      ) : null}
      {image ? (
        <Rect
          width={width}
          height={height}
          cornerRadius={rectCornerRadius}
          stroke={color}
          strokeWidth={strokeWidth}
          listening={false}
        />
      ) : null}
    </Group>
  );
}

function GalleryVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const title = typeof props.title === "string" && props.title.trim() ? props.title : "Galeri";
  const images = parseGalleryItems(props.items);
  const count = Math.max(3, Math.min(7, images.length || 5));
  const radius = element.style.radius ?? 6;
  const top = 50;
  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {variant === "filmstrip" ? (
        <>
          <Line points={[0, 8, w, 8]} stroke={color} strokeWidth={6} dash={[3, 5]} />
          <Line points={[0, h - 8, w, h - 8]} stroke={color} strokeWidth={6} dash={[3, 5]} />
        </>
      ) : null}
      {variant === "heritage-frame" ? (
        <>
          <Rect
            x={5}
            y={5}
            width={w - 10}
            height={h - 10}
            cornerRadius={radius}
            stroke={color}
            strokeWidth={1}
            opacity={0.4}
          />
          <Rect
            x={8}
            y={8}
            width={w - 16}
            height={h - 16}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.65}
          />
        </>
      ) : null}
      <Text
        x={14}
        y={9}
        width={w - 28}
        text={variant === "heritage-frame" ? "❖ — OUR MOMENTS — ❖" : "OUR MOMENTS"}
        fontSize={8}
        letterSpacing={variant === "heritage-frame" ? 2 : 1.8}
        fill={color}
        opacity={0.62}
        align={variant === "editorial-collage" ? "left" : "center"}
      />
      <Text
        x={14}
        y={24}
        width={w - 28}
        text={title}
        fontSize={16}
        fontStyle="bold"
        fill={color}
        align={variant === "editorial-collage" ? "left" : "center"}
      />
      {variant === "editorial-collage" ? (
        <>
          <CanvasGalleryPhoto
            x={14}
            y={top}
            width={w * 0.57}
            height={h - top - 14}
            radius={radius}
            color={color}
            src={images[0]?.src}
          />
          <CanvasGalleryPhoto
            x={w * 0.62}
            y={top}
            width={w * 0.32}
            height={(h - top - 20) / 2}
            radius={radius}
            color={color}
            src={images[1]?.src}
          />
          <CanvasGalleryPhoto
            x={w * 0.62}
            y={top + (h - top) / 2}
            width={w * 0.32}
            height={(h - top - 20) / 2}
            radius={radius}
            color={color}
            src={images[2]?.src}
          />
        </>
      ) : variant === "mosaic" ? (
        Array.from({ length: count }).map((_, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const tileW = (w - 34) / 2;
          const tileH = index % 3 === 0 ? 90 : 60;
          return (
            <CanvasGalleryPhoto
              key={index}
              x={14 + col * (tileW + 6)}
              y={top + row * 68}
              width={tileW}
              height={tileH}
              radius={radius}
              color={color}
              src={images[index]?.src}
            />
          );
        })
      ) : variant === "filmstrip" ? (
        Array.from({ length: Math.min(4, count) }).map((_, index) => {
          const tileW = (w - 44) / 3;
          return (
            <CanvasGalleryPhoto
              key={index}
              x={12 + index * (tileW + 7)}
              y={top + 20}
              width={tileW}
              height={h - top - 48}
              radius={radius}
              color={color}
              src={images[index]?.src}
            />
          );
        })
      ) : variant === "spotlight-slider" ? (
        <>
          <CanvasGalleryPhoto
            x={14}
            y={top}
            width={w - 28}
            height={h - top - 14}
            radius={radius}
            color={color}
            src={images[0]?.src}
          />
          <Rect
            x={22}
            y={h - 51}
            width={w - 44}
            height={34}
            cornerRadius={17}
            fill="#000"
            opacity={0.46}
          />
          <Text x={29} y={h - 41} width={32} text="‹" fontSize={18} fill="#fff" align="center" />
          <Text
            x={w / 2 - 30}
            y={h - 39}
            width={60}
            text={`1 / ${count}`}
            fontSize={10}
            fill="#fff"
            align="center"
          />
          <Text
            x={w - 61}
            y={h - 41}
            width={32}
            text="›"
            fontSize={18}
            fill="#fff"
            align="center"
          />
        </>
      ) : variant === "arch-window" ? (
        <>
          {(() => {
            const tileW = (w - 38) / 2;
            const tileH = h - top - 16;
            return (
              <>
                <CanvasGalleryPhoto
                  x={14}
                  y={top}
                  width={tileW}
                  height={tileH}
                  radius={radius}
                  arch
                  color={color}
                  src={images[0]?.src}
                />
                <CanvasGalleryPhoto
                  x={14 + tileW + 10}
                  y={top}
                  width={tileW}
                  height={tileH}
                  radius={radius}
                  arch
                  color={color}
                  src={images[1]?.src}
                />
              </>
            );
          })()}
        </>
      ) : variant === "masonry-cascade" ? (
        <>
          {(() => {
            const tileW = (w - 36) / 2;
            const usableH = h - top - 18;
            const hLeft1 = usableH * 0.58;
            const hLeft2 = usableH * 0.38;
            const hRight1 = usableH * 0.42;
            const hRight2 = usableH * 0.54;
            return (
              <>
                <CanvasGalleryPhoto
                  x={14}
                  y={top}
                  width={tileW}
                  height={hLeft1}
                  radius={radius}
                  color={color}
                  src={images[0]?.src}
                />
                <CanvasGalleryPhoto
                  x={14}
                  y={top + hLeft1 + 8}
                  width={tileW}
                  height={hLeft2}
                  radius={radius}
                  color={color}
                  src={images[2]?.src}
                />
                <CanvasGalleryPhoto
                  x={14 + tileW + 8}
                  y={top}
                  width={tileW}
                  height={hRight1}
                  radius={radius}
                  color={color}
                  src={images[1]?.src}
                />
                <CanvasGalleryPhoto
                  x={14 + tileW + 8}
                  y={top + hRight1 + 8}
                  width={tileW}
                  height={hRight2}
                  radius={radius}
                  color={color}
                  src={images[3]?.src}
                />
              </>
            );
          })()}
        </>
      ) : variant === "heritage-frame" ? (
        <>
          {(() => {
            const tileW = (w - 38) / 2;
            const tileH = h - top - 20;
            return (
              <>
                <CanvasGalleryPhoto
                  x={14}
                  y={top}
                  width={tileW}
                  height={tileH}
                  radius={4}
                  color={color}
                  src={images[0]?.src}
                  strokeWidth={1.5}
                />
                <CanvasGalleryPhoto
                  x={14 + tileW + 10}
                  y={top}
                  width={tileW}
                  height={tileH}
                  radius={4}
                  color={color}
                  src={images[1]?.src}
                  strokeWidth={1.5}
                />
              </>
            );
          })()}
        </>
      ) : variant === "glass-carousel" ? (
        <>
          <CanvasGalleryPhoto
            x={14}
            y={top}
            width={w - 28}
            height={h - top - 14}
            radius={radius}
            color={color}
            src={images[0]?.src}
          />
          <Rect
            x={10}
            y={top - 4}
            width={w - 20}
            height={h - top - 6}
            cornerRadius={radius + 4}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.3}
          />
          <Rect
            x={w / 2 - 50}
            y={h - 45}
            width={100}
            height={26}
            cornerRadius={13}
            fill="#fff"
            opacity={0.7}
            stroke={color}
            strokeWidth={0.8}
          />
          <Text x={w / 2 - 46} y={h - 39} width={20} text="‹" fontSize={15} fill={color} align="center" />
          <Text x={w / 2 - 25} y={h - 37} width={50} text="• • •" fontSize={11} fill={color} align="center" />
          <Text x={w / 2 + 26} y={h - 39} width={20} text="›" fontSize={15} fill={color} align="center" />
        </>
      ) : variant === "circular-bubbles" ? (
        <>
          {(() => {
            const bigW = Math.min(120, w * 0.42);
            const medW = Math.min(90, w * 0.32);
            const smallW = Math.min(74, w * 0.26);
            return (
              <>
                <Group x={16} y={top + 10}>
                  <Circle
                    x={bigW / 2}
                    y={bigW / 2}
                    radius={bigW / 2 + 4}
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.4}
                  />
                  <CanvasGalleryPhoto
                    x={0}
                    y={0}
                    width={bigW}
                    height={bigW}
                    radius={bigW / 2}
                    color={color}
                    src={images[0]?.src}
                  />
                </Group>
                <Group x={w - medW - 20} y={top + 6}>
                  <Circle
                    x={medW / 2}
                    y={medW / 2}
                    radius={medW / 2 + 3}
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.4}
                  />
                  <CanvasGalleryPhoto
                    x={0}
                    y={0}
                    width={medW}
                    height={medW}
                    radius={medW / 2}
                    color={color}
                    src={images[1]?.src}
                  />
                </Group>
                <Group x={w - smallW - 35} y={top + medW + 18}>
                  <Circle
                    x={smallW / 2}
                    y={smallW / 2}
                    radius={smallW / 2 + 3}
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.4}
                  />
                  <CanvasGalleryPhoto
                    x={0}
                    y={0}
                    width={smallW}
                    height={smallW}
                    radius={smallW / 2}
                    color={color}
                    src={images[2]?.src}
                  />
                </Group>
              </>
            );
          })()}
        </>
      ) : (
        Array.from({ length: Math.min(3, count) }).map((_, index) => {
          const cardW = w * 0.38;
          return (
            <Group
              key={index}
              x={w / 2 - cardW / 2 + (index - 1) * cardW * 0.62}
              y={top + 22 + Math.abs(index - 1) * 9}
              rotation={(index - 1) * 6}
            >
              <Rect
                x={-5}
                y={-5}
                width={cardW + 10}
                height={h - top - 40}
                fill="#fff"
                shadowColor="#000"
                shadowBlur={8}
                shadowOpacity={0.16}
              />
              <CanvasGalleryPhoto
                x={0}
                y={0}
                width={cardW}
                height={h - top - 62}
                radius={radius}
                color={color}
                src={images[index]?.src}
              />
            </Group>
          );
        })
      )}
    </Group>
  );
}

export function CurrentWidgetVisual({
  element,
  tokens,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  switch (element.widgetType) {
    case "countdown":
      return <CountdownVisual element={element} tokens={tokens} />;
    case "map":
      return <MapVisual element={element} tokens={tokens} />;
    case "guestGreeting":
      return <GreetingVisual element={element} tokens={tokens} />;
    case "rsvp":
      return <RsvpVisual element={element} tokens={tokens} />;
    case "gift":
      return <GiftVisual element={element} tokens={tokens} />;
    case "music":
      return <MusicVisual element={element} tokens={tokens} />;
    case "gallery":
      return <GalleryVisual element={element} tokens={tokens} />;
    default:
      return null;
  }
}
