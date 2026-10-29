"use client";

import { useEffect, useState } from "react";
import { Circle, Group, Image as KonvaImage, Line, Path, Rect, Text } from "react-konva";
import type { Element, ThemeTokens, VariableDefinition } from "@/lib/schema";
import {
  DEFAULT_COUNTDOWN_LABELS,
  computeCountdown,
  greetingParts,
  type CountdownUnit,
} from "@/features/widgets/logic";
import { parseGiftAccounts } from "@/features/widgets/runtime/GiftWidget";
import { resolveFallbackBankLogo } from "@/lib/engine/bank-lock";
import { parseGalleryItems } from "@/features/widgets/runtime/GalleryWidget";
import { parseFrameImage } from "@/features/widgets/runtime/PhotoFrameWidget";
import { parseTimelineEvents } from "@/features/widgets/runtime/TimelineWidget";
import { parseWishItems } from "@/features/widgets/runtime/WishesWidget";
import { parseCouplePerson } from "@/features/widgets/runtime/CoupleProfileWidget";
import { getOrnamentShape } from "@/features/widgets/ornament-shapes";
import { parseVideoSource } from "@/features/widgets/video-utils";
import { parseGifSource } from "@/features/widgets/runtime/GifWidget";
import { resolveWidgetStyleVariant, resolveCanvasBoundValue } from "@/features/widgets";
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

function CountdownVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resolvedTargetDateTime = resolveCanvasBoundValue(props.targetDateTime, variables);
  const result = computeCountdown(resolvedTargetDateTime, nowMs);
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

function MapVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const resolvedAddress = resolveCanvasBoundValue(props.address, variables);
  const resolvedLabel = resolveCanvasBoundValue(props.label, variables);
  const label =
    typeof resolvedAddress === "string" && resolvedAddress.trim()
      ? resolvedAddress.trim()
      : typeof resolvedLabel === "string" && resolvedLabel.trim()
        ? resolvedLabel.trim()
        : "Lokasi acara";
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
          ctx.rect(8, 8, w - 16, Math.max(60, h - 86))
        }
      >
        <MapSurface x={8} y={8} width={w - 16} height={Math.max(60, h - 86)} />
      </Group>
      <Text
        x={16}
        y={h - 74}
        width={w - 32}
        text={label}
        fontSize={13}
        fontStyle="bold"
        fill={color}
        align="center"
        ellipsis
      />
      <MapButton
        x={16}
        y={h - 48}
        width={w - 32}
        color={color}
        surface={surface}
        label={button}
      />
    </Group>
  );
}

function GreetingVisual({
  element,
  tokens,
  guestPreviewName,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  guestPreviewName?: string;
}) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const rawParts = greetingParts(element.props as Record<string, unknown>);
  const simName = guestPreviewName?.trim();
  const parts = {
    ...rawParts,
    name: simName || rawParts.name,
  };
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
  const variant = resolveWidgetStyleVariant("rsvp", element.style.variant).variant.id;
  const props = element.props as Record<string, unknown>;
  const title =
    typeof props.title === "string" && props.title.trim() ? props.title.trim() : "Konfirmasi Kehadiran";
  const withParty = props.enablePartySize !== false;
  const withMessage = props.enableMessage !== false;

  const radius =
    element.style.radius ??
    (variant === "editorial-form" ? 0 : variant === "ticket-form" ? 8 : variant === "heritage-frame" ? 10 : 16);

  const split = variant === "split-panel";
  const splitW = split ? Math.round(w * 0.36) : 0;
  const padX = split ? splitW + 12 : 16;
  const fieldW = w - padX - (split ? 12 : 16);

  // Button layout
  const btnH = 34;
  const btnY = Math.max(h - btnH - 12, 100);

  // Header / Form layout
  let currentY = split ? 14 : variant === "heritage-frame" ? 70 : variant === "ticket-form" ? 74 : 60;
  const availableH = btnY - currentY - 8;

  // Items count: Nama (1), Kehadiran (1), Pax (withParty ? 1 : 0), Pesan (withMessage ? 1 : 0)
  const showParty = withParty && availableH >= (withMessage ? 160 : 110);
  const showMsg = withMessage && availableH >= (showParty ? 180 : 130);

  const activeFieldsCount = 2 + (showParty ? 1 : 0) + (showMsg ? 1 : 0);
  const itemGap = Math.max(
    4,
    Math.min(10, Math.floor((availableH - activeFieldsCount * 38) / Math.max(1, activeFieldsCount - 1))),
  );

  const isEditorial = variant === "editorial-form";
  const isSoftCard = variant === "soft-card";
  const isTicket = variant === "ticket-form";
  const isHeritage = variant === "heritage-frame";

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />

      {/* Variant-specific outer frame */}
      {isEditorial && <Rect x={0} y={0} width={5} height={h} fill={color} />}

      {isSoftCard && (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius}
          fill={color}
          opacity={0.06}
          shadowColor="#000"
          shadowBlur={16}
          shadowOpacity={0.08}
        />
      )}

      {isTicket && <Rect width={w} height={h} cornerRadius={radius} stroke={color} strokeWidth={1} />}

      {isHeritage && (
        <>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} strokeWidth={2} />
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={Math.max(0, radius - 2)}
            stroke={color}
            strokeWidth={1}
            opacity={0.75}
          />
        </>
      )}

      {split && (
        <>
          <Rect width={w} height={h} cornerRadius={radius} stroke={color} strokeWidth={1} opacity={0.25} />
          <Rect
            width={splitW}
            height={h}
            cornerRadius={[radius, 0, 0, radius]}
            fill={color}
          />
        </>
      )}

      {/* Header */}
      {split ? (
        <Group>
          <Text
            x={8}
            y={Math.max(12, h / 2 - 28)}
            width={splitW - 16}
            text="RSVP"
            fontSize={9}
            letterSpacing={2}
            fontStyle="bold"
            fill={surface}
            opacity={0.8}
            align="center"
          />
          <Text
            x={8}
            y={Math.max(28, h / 2 - 10)}
            width={splitW - 16}
            text={title}
            fontSize={13}
            fontStyle="bold"
            fill={surface}
            align="center"
            wrap="wrap"
          />
        </Group>
      ) : (
        <Group>
          <Text
            x={16}
            y={12}
            width={w - 32}
            text="RSVP"
            fontSize={9}
            letterSpacing={2}
            fontStyle="bold"
            fill={color}
            opacity={0.68}
            align={isEditorial ? "left" : "center"}
          />
          <Text
            x={16}
            y={26}
            width={w - 32}
            text={title}
            fontSize={15}
            fontStyle="bold"
            fill={color}
            align={isEditorial ? "left" : "center"}
            ellipsis
          />
          {isHeritage && (
            <Line points={[w / 2 - 35, 52, w / 2 + 35, 52]} stroke={color} strokeWidth={1} opacity={0.8} />
          )}
          {isTicket && (
            <Line points={[16, 56, w - 16, 56]} stroke={color} dash={[5, 4]} opacity={0.5} strokeWidth={1} />
          )}
        </Group>
      )}

      {/* Field 1: Nama */}
      {(() => {
        const y = currentY;
        currentY += 40 + itemGap;
        return (
          <Group key="f-name">
            <Text x={padX} y={y} width={fieldW} text="Nama" fontSize={10} fill={color} opacity={0.72} />
            {isEditorial ? (
              <Line points={[padX, y + 36, padX + fieldW, y + 36]} stroke={color} strokeWidth={1} />
            ) : (
              <Rect
                x={padX}
                y={y + 14}
                width={fieldW}
                height={26}
                cornerRadius={isSoftCard ? 7 : 6}
                stroke={color}
                strokeWidth={isSoftCard ? 0.6 : 1}
                fill={isSoftCard ? surface : "transparent"}
                opacity={isSoftCard ? 0.9 : 1}
              />
            )}
            <Text
              x={padX + 8}
              y={y + 21}
              width={fieldW - 16}
              text="Masukkan nama lengkap Anda"
              fontSize={10}
              fill={color}
              opacity={0.38}
              ellipsis
            />
          </Group>
        );
      })()}

      {/* Field 2: Kehadiran */}
      {(() => {
        const y = currentY;
        currentY += 40 + itemGap;
        const choiceW = Math.min(84, Math.floor((fieldW - 8) / 2));
        return (
          <Group key="f-presence">
            <Text x={padX} y={y} width={fieldW} text="Kehadiran" fontSize={10} fill={color} opacity={0.72} />
            {/* Hadir (Active) */}
            <Rect
              x={padX}
              y={y + 14}
              width={choiceW}
              height={26}
              cornerRadius={13}
              fill={color}
            />
            <Text
              x={padX}
              y={y + 21}
              width={choiceW}
              text="Hadir"
              fontSize={10}
              fontStyle="bold"
              fill={surface}
              align="center"
            />
            {/* Tidak hadir (Inactive) */}
            <Rect
              x={padX + choiceW + 8}
              y={y + 14}
              width={Math.max(choiceW, Math.min(94, fieldW - choiceW - 8))}
              height={26}
              cornerRadius={13}
              stroke={color}
              strokeWidth={1}
              fill="transparent"
            />
            <Text
              x={padX + choiceW + 8}
              y={y + 21}
              width={Math.max(choiceW, Math.min(94, fieldW - choiceW - 8))}
              text="Tidak hadir"
              fontSize={10}
              fill={color}
              opacity={0.75}
              align="center"
            />
          </Group>
        );
      })()}

      {/* Field 3: Jumlah tamu (Pax) jika aktif */}
      {showParty &&
        (() => {
          const y = currentY;
          currentY += 40 + itemGap;
          const paxInputW = Math.min(96, fieldW);
          return (
            <Group key="f-party">
              <Text x={padX} y={y} width={fieldW} text="Jumlah tamu" fontSize={10} fill={color} opacity={0.72} />
              {isEditorial ? (
                <Line points={[padX, y + 36, padX + paxInputW, y + 36]} stroke={color} strokeWidth={1} />
              ) : (
                <Rect
                  x={padX}
                  y={y + 14}
                  width={paxInputW}
                  height={26}
                  cornerRadius={isSoftCard ? 7 : 6}
                  stroke={color}
                  strokeWidth={isSoftCard ? 0.6 : 1}
                  fill={isSoftCard ? surface : "transparent"}
                  opacity={isSoftCard ? 0.9 : 1}
                />
              )}
              <Text
                x={padX + 8}
                y={y + 21}
                text="1"
                fontSize={10}
                fontStyle="bold"
                fill={color}
                opacity={0.88}
              />
              <Text
                x={padX + 22}
                y={y + 21}
                text="(tamu)"
                fontSize={9}
                fill={color}
                opacity={0.5}
              />
            </Group>
          );
        })()}

      {/* Field 4: Pesan (opsional) jika aktif */}
      {showMsg &&
        (() => {
          const y = currentY;
          return (
            <Group key="f-msg">
              <Text x={padX} y={y} width={fieldW} text="Pesan (opsional)" fontSize={10} fill={color} opacity={0.72} />
              {isEditorial ? (
                <Line points={[padX, y + 36, padX + fieldW, y + 36]} stroke={color} strokeWidth={1} />
              ) : (
                <Rect
                  x={padX}
                  y={y + 14}
                  width={fieldW}
                  height={28}
                  cornerRadius={isSoftCard ? 7 : 6}
                  stroke={color}
                  strokeWidth={isSoftCard ? 0.6 : 1}
                  fill={isSoftCard ? surface : "transparent"}
                  opacity={isSoftCard ? 0.9 : 1}
                />
              )}
              <Text
                x={padX + 8}
                y={y + 21}
                width={fieldW - 16}
                text="Tulis pesan atau ucapan…"
                fontSize={10}
                fill={color}
                opacity={0.35}
                ellipsis
              />
            </Group>
          );
        })()}

      {/* Submit Button: "Kirim" */}
      <Rect
        x={padX}
        y={btnY}
        width={fieldW}
        height={btnH}
        cornerRadius={isEditorial ? 0 : isTicket ? 8 : 999}
        fill={isTicket || isSoftCard ? color : "transparent"}
        stroke={color}
        strokeWidth={1.4}
      />
      <Text
        x={padX}
        y={btnY + 10}
        width={fieldW}
        text="Kirim"
        fontSize={12}
        fontStyle="bold"
        fill={isTicket || isSoftCard ? surface : color}
        align="center"
      />
    </Group>
  );
}

function CanvasBankLogoBadge({
  logoUrl,
  fallbackText,
  x,
  y,
  width = 120,
  height = 44,
}: {
  logoUrl?: string;
  fallbackText: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  surface?: string;
}) {
  const image = useCanvasImage(logoUrl || null);

  let imgW = width;
  let imgH = height;
  let imgX = 0;
  let imgY = 0;

  if (image && image.width && image.height) {
    const ratio = image.width / image.height;
    if (ratio > width / height) {
      imgW = width;
      imgH = Math.round(width / ratio);
      imgY = Math.round((height - imgH) / 2);
    } else {
      imgH = height;
      imgW = Math.round(height * ratio);
      imgX = Math.round((width - imgW) / 2);
    }
  }

  return (
    <Group x={x} y={y}>
      {image ? (
        <KonvaImage
          image={image}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          listening={false}
        />
      ) : (
        <Text
          x={0}
          y={Math.round((height - 18) / 2)}
          width={width}
          text={fallbackText}
          fontSize={16}
          fontStyle="bold"
          fill="#0d3b66"
          align="center"
        />
      )}
    </Group>
  );
}

function GiftVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { surface } = colors(element, tokens);
  const props = element.props as Record<string, unknown>;

  const resolvedExtra = {
    bank: resolveCanvasBoundValue(props.bank, variables),
    accountNumber: resolveCanvasBoundValue(props.accountNumber, variables),
    accountName: resolveCanvasBoundValue(props.accountName, variables),
    bankLogo: resolveCanvasBoundValue(props.bankLogo, variables),
    bank2: resolveCanvasBoundValue(props.bank2, variables),
    accountNumber2: resolveCanvasBoundValue(props.accountNumber2, variables),
    accountName2: resolveCanvasBoundValue(props.accountName2, variables),
    bankLogo2: resolveCanvasBoundValue(props.bankLogo2, variables),
  };
  const accounts = parseGiftAccounts(props.accounts, resolvedExtra);
  const list = accounts.length
    ? accounts.slice(0, 2)
    : [
        {
          bank: "BNI",
          accountNumber: "2020127190",
          accountName: "Muhammad Ridhwan",
          bankLogo: resolveFallbackBankLogo("BNI"),
        },
      ];

  const cardW = Math.min(w - 20, 360);
  const cardX = Math.max(10, Math.round((w - cardW) / 2));
  const cardH = 175;
  const gap = 16;
  const radius = element.style.radius ?? 18;

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />

      {list.map((account, index) => {
        const y = 8 + index * (cardH + gap);
        if (y + 40 > h) return null;

        const logoW = 140;
        const logoH = 42;
        const btnW = 92;
        const btnH = 28;

        return (
          <Group key={`${account.accountNumber}-${index}`}>
            {/* 1. White / Translucent Standard Card */}
            <Rect
              x={cardX}
              y={y}
              width={cardW}
              height={cardH}
              cornerRadius={radius}
              fill={surface || "#ffffff"}
              stroke="rgba(0, 0, 0, 0.08)"
              strokeWidth={1}
              shadowColor="#000000"
              shadowBlur={10}
              shadowOpacity={0.04}
              shadowOffsetY={4}
            />

            {/* 2. Centered Bank Logo */}
            <CanvasBankLogoBadge
              logoUrl={account.bankLogo}
              fallbackText={account.bank || "BANK"}
              x={cardX + Math.round((cardW - logoW) / 2)}
              y={y + 18}
              width={logoW}
              height={logoH}
            />

            {/* 3. Account Holder Name */}
            {account.accountName ? (
              <Text
                x={cardX + 10}
                y={y + 70}
                width={cardW - 20}
                text={account.accountName}
                fontSize={14}
                fontStyle="500"
                fill="#1e293b"
                align="center"
                ellipsis
              />
            ) : null}

            {/* 4. Account Number */}
            <Text
              x={cardX + 10}
              y={y + 92}
              width={cardW - 20}
              text={account.accountNumber}
              fontSize={17}
              fontStyle="bold"
              letterSpacing={0.5}
              fill="#0f172a"
              align="center"
              ellipsis
            />

            {/* 5. Navy Pill Button ("Salin") */}
            <Rect
              x={cardX + Math.round((cardW - btnW) / 2)}
              y={y + 126}
              width={btnW}
              height={btnH}
              cornerRadius={9999}
              fill="#182234"
              shadowColor="#182234"
              shadowBlur={6}
              shadowOpacity={0.2}
              shadowOffsetY={2}
            />
            <Text
              x={cardX}
              y={y + 133}
              width={cardW}
              text="📋  Salin"
              fontSize={12}
              fontStyle="bold"
              fill="#ffffff"
              align="center"
            />
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

function MusicVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color, surface } = colors(element, tokens);
  const variant = element.style.variant!;
  const props = element.props as Record<string, unknown>;
  const resolvedTitle = resolveCanvasBoundValue(props.title, variables);
  const title =
    typeof resolvedTitle === "string" && resolvedTitle.trim() ? resolvedTitle : "Putar musik";
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

function CanvasEmptySlot({
  x,
  y,
  width,
  height,
  radius = 6,
  arch = false,
  circle = false,
  color,
  rotation,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  arch?: boolean;
  circle?: boolean;
  color: string;
  rotation?: number;
}) {
  const topRadius = arch ? Math.min(width / 2, 80) : radius;
  const clippedRadius = circle ? width / 2 : Math.min(radius, width / 2, height / 2);
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
        opacity={0.06}
      />
      <Rect
        width={width}
        height={height}
        cornerRadius={rectCornerRadius}
        stroke={color}
        strokeWidth={1.5}
        dash={[4, 4]}
        opacity={0.35}
      />
    </Group>
  );
}

function GalleryVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color } = colors(element, tokens);
  const variant = element.style.variant || "masonry-flow";
  const props = element.props as Record<string, unknown>;
  const images = parseGalleryItems(props.items, variables);
  const radius =
    element.style.radius ??
    (variant === "carousel-slider" ? 16 : variant === "square-grid" ? 10 : 12);
  const pad = 12;

  const isSlider =
    variant === "carousel-slider" ||
    variant.includes("slider") ||
    variant.includes("carousel");
  const isSquare = variant === "square-grid";

  // Empty state preview
  if (images.length === 0) {
    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        {isSlider ? (
          <>
            <CanvasEmptySlot
              x={pad}
              y={pad}
              width={w - pad * 2}
              height={Math.max(140, h - pad * 2 - 58)}
              radius={radius}
              color={color}
            />
            {/* Thumbnail slots at bottom */}
            {(() => {
              const thumbH = 46;
              const thumbY = h - pad - thumbH;
              const gap = 8;
              const thumbW = (w - pad * 2 - gap * 3) / 4;
              return [0, 1, 2, 3].map((i) => (
                <CanvasEmptySlot
                  key={i}
                  x={pad + i * (thumbW + gap)}
                  y={thumbY}
                  width={thumbW}
                  height={thumbH}
                  radius={6}
                  color={color}
                />
              ));
            })()}
          </>
        ) : isSquare ? (
          (() => {
            const gap = 8;
            const tileW = (w - pad * 2 - gap) / 2;
            const tileH = tileW;
            return (
              <>
                <CanvasEmptySlot
                  x={pad}
                  y={pad}
                  width={tileW}
                  height={tileH}
                  radius={radius}
                  color={color}
                />
                <CanvasEmptySlot
                  x={pad + tileW + gap}
                  y={pad}
                  width={tileW}
                  height={tileH}
                  radius={radius}
                  color={color}
                />
                {pad + tileH + gap + tileH <= h ? (
                  <>
                    <CanvasEmptySlot
                      x={pad}
                      y={pad + tileH + gap}
                      width={tileW}
                      height={tileH}
                      radius={radius}
                      color={color}
                    />
                    <CanvasEmptySlot
                      x={pad + tileW + gap}
                      y={pad + tileH + gap}
                      width={tileW}
                      height={tileH}
                      radius={radius}
                      color={color}
                    />
                  </>
                ) : null}
              </>
            );
          })()
        ) : (
          /* Masonry flow empty slots */
          (() => {
            const gap = 8;
            const tileW = (w - pad * 2 - gap) / 2;
            const usableH = h - pad * 2;
            const hL1 = usableH * 0.58;
            const hL2 = usableH * 0.38;
            const hR1 = usableH * 0.42;
            const hR2 = usableH * 0.54;
            return (
              <>
                <CanvasEmptySlot
                  x={pad}
                  y={pad}
                  width={tileW}
                  height={hL1}
                  radius={radius}
                  color={color}
                />
                <CanvasEmptySlot
                  x={pad + tileW + gap}
                  y={pad}
                  width={tileW}
                  height={hR1}
                  radius={radius}
                  color={color}
                />
                <CanvasEmptySlot
                  x={pad}
                  y={pad + hL1 + gap}
                  width={tileW}
                  height={hL2}
                  radius={radius}
                  color={color}
                />
                <CanvasEmptySlot
                  x={pad + tileW + gap}
                  y={pad + hR1 + gap}
                  width={tileW}
                  height={hR2}
                  radius={radius}
                  color={color}
                />
              </>
            );
          })()
        )}
        <Text
          x={pad}
          y={h / 2 - 8}
          width={w - pad * 2}
          text="Galeri Foto (Maksimal 50 Foto)"
          fontSize={11}
          fontStyle="600"
          fill={color}
          opacity={0.5}
          align="center"
        />
      </Group>
    );
  }

  // Render populated gallery
  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {isSlider ? (
        (() => {
          const thumbH = 46;
          const heroH = Math.max(140, h - pad * 2 - thumbH - 8);
          const thumbY = pad + heroH + 8;
          const gap = 8;
          const thumbW = (w - pad * 2 - gap * 3) / 4;

          return (
            <>
              {/* Main hero photo */}
              <CanvasGalleryPhoto
                x={pad}
                y={pad}
                width={w - pad * 2}
                height={heroH}
                radius={radius}
                color={color}
                src={images[0]?.src}
              />
              {/* Badge counter on top right */}
              <Group x={w - pad - 58} y={pad + 10}>
                <Rect width={50} height={20} cornerRadius={10} fill="#000" opacity={0.6} />
                <Text
                  width={50}
                  y={3}
                  text={`1 / ${images.length}`}
                  fontSize={10}
                  fontStyle="bold"
                  fill="#fff"
                  align="center"
                />
              </Group>
              {/* Prev / Next buttons in hero */}
              <Group x={pad + 8} y={pad + heroH / 2 - 14}>
                <Rect width={28} height={28} cornerRadius={14} fill="#000" opacity={0.4} />
                <Text width={28} y={4} text="‹" fontSize={18} fontStyle="bold" fill="#fff" align="center" />
              </Group>
              <Group x={w - pad - 36} y={pad + heroH / 2 - 14}>
                <Rect width={28} height={28} cornerRadius={14} fill="#000" opacity={0.4} />
                <Text width={28} y={4} text="›" fontSize={18} fontStyle="bold" fill="#fff" align="center" />
              </Group>
              {/* Bottom thumbnails */}
              {[0, 1, 2, 3].map((idx) => {
                const img = images[idx];
                const x = pad + idx * (thumbW + gap);
                if (!img) return null;
                return (
                  <Group key={idx}>
                    <CanvasGalleryPhoto
                      x={x}
                      y={thumbY}
                      width={thumbW}
                      height={thumbH}
                      radius={6}
                      color={color}
                      src={img.src}
                    />
                    {idx === 0 && (
                      <Rect
                        x={x - 1}
                        y={thumbY - 1}
                        width={thumbW + 2}
                        height={thumbH + 2}
                        cornerRadius={7}
                        stroke={color}
                        strokeWidth={2}
                      />
                    )}
                  </Group>
                );
              })}
            </>
          );
        })()
      ) : isSquare ? (
        (() => {
          const gap = 8;
          const tileW = (w - pad * 2 - gap) / 2;
          const tileH = tileW;

          return (
            <>
              {/* 2-column square tiles */}
              {images.slice(0, 4).map((img, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const x = pad + col * (tileW + gap);
                const y = pad + row * (tileH + gap);
                if (y + tileH > h) return null;

                const isLastWithMore = idx === 3 && images.length > 4;

                return (
                  <Group key={idx}>
                    <CanvasGalleryPhoto
                      x={x}
                      y={y}
                      width={tileW}
                      height={tileH}
                      radius={radius}
                      color={color}
                      src={img.src}
                    />
                    {isLastWithMore && (
                      <Group x={x} y={y}>
                        <Rect width={tileW} height={tileH} cornerRadius={radius} fill="#000" opacity={0.6} />
                        <Text
                          width={tileW}
                          y={tileH / 2 - 10}
                          text={`+${images.length - 3}`}
                          fontSize={18}
                          fontStyle="bold"
                          fill="#ffffff"
                          align="center"
                        />
                      </Group>
                    )}
                  </Group>
                );
              })}
              {images.length > 4 && (
                <Group x={w / 2 - 50} y={h - pad - 24}>
                  <Rect width={100} height={22} cornerRadius={11} fill={color} opacity={0.12} />
                  <Text
                    width={100}
                    y={4}
                    text={`Lihat Semua (${images.length})`}
                    fontSize={9}
                    fontStyle="bold"
                    fill={color}
                    align="center"
                  />
                </Group>
              )}
            </>
          );
        })()
      ) : (
        /* Masonry Flow layout */
        (() => {
          const gap = 8;
          const tileW = (w - pad * 2 - gap) / 2;
          const usableH = h - pad * 2 - (images.length > 4 ? 26 : 0);
          const hL1 = usableH * 0.58;
          const hL2 = usableH * 0.38;
          const hR1 = usableH * 0.42;
          const hR2 = usableH * 0.54;

          const slots = [
            { x: pad, y: pad, width: tileW, height: hL1 },
            { x: pad + tileW + gap, y: pad, width: tileW, height: hR1 },
            { x: pad, y: pad + hL1 + gap, width: tileW, height: hL2 },
            { x: pad + tileW + gap, y: pad, width: tileW, height: hR2 },
          ];

          return (
            <>
              {slots.map((slot, idx) => {
                const img = images[idx];
                if (!img) return null;
                const isLastWithMore = idx === 3 && images.length > 4;

                return (
                  <Group key={idx}>
                    <CanvasGalleryPhoto
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      radius={radius}
                      color={color}
                      src={img.src}
                    />
                    {isLastWithMore && (
                      <Group x={slot.x} y={slot.y}>
                        <Rect width={slot.width} height={slot.height} cornerRadius={radius} fill="#000" opacity={0.6} />
                        <Text
                          width={slot.width}
                          y={slot.height / 2 - 10}
                          text={`+${images.length - 3}`}
                          fontSize={18}
                          fontStyle="bold"
                          fill="#ffffff"
                          align="center"
                        />
                      </Group>
                    )}
                  </Group>
                );
              })}
              {images.length > 4 && (
                <Group x={w / 2 - 50} y={h - pad - 24}>
                  <Rect width={100} height={22} cornerRadius={11} fill={color} opacity={0.12} />
                  <Text
                    width={100}
                    y={4}
                    text={`Lihat Semua (${images.length})`}
                    fontSize={9}
                    fontStyle="bold"
                    fill={color}
                    align="center"
                  />
                </Group>
              )}
            </>
          );
        })()
      )}
    </Group>
  );
}

function PhotoFrameVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color } = colors(element, tokens);
  const variant = element.style.variant || "torn-rect";
  const props = element.props as Record<string, unknown>;
  const caption = typeof props.caption === "string" ? props.caption.trim() : "";
  const fit = props.fit === "contain" ? "contain" : "cover";
  const src = parseFrameImage(props.image, variables);
  const image = useCanvasImage(src);

  const captionH = caption ? 24 : 0;
  const availH = h - captionH;

  const paperColor =
    typeof element.style.color === "string" && element.style.color !== "#2b2118"
      ? element.style.color
      : variant === "torn-oval" || variant === "torn-arch"
        ? "#f5efe3"
        : "#faf8f5";

  let frameX = 4;
  let frameY = 4;
  let frameW = w - 8;
  let frameH = availH - 8;
  let cutoutX = frameX + 14;
  let cutoutY = frameY + 14;
  let cutoutW = frameW - 28;
  let cutoutH = frameH - 28;
  let frameRadius = 4;

  if (variant === "torn-oval") {
    frameRadius = Math.min(frameW, frameH) / 2;
    cutoutY += 10;
    cutoutH -= 14;
  } else if (variant === "torn-circle") {
    const size = Math.min(frameW, frameH);
    frameX = (w - size) / 2;
    frameY = (availH - size) / 2;
    frameW = size;
    frameH = size;
    frameRadius = size / 2;
    cutoutX = frameX + 14;
    cutoutY = frameY + 14;
    cutoutW = size - 28;
    cutoutH = size - 28;
  } else if (variant === "torn-arch") {
    frameRadius = 140;
    cutoutY += 10;
    cutoutH -= 14;
  }

  const renderPlaceholder = (cx: number, cy: number, cw: number, ch: number) => {
    const cloudX = cx + cw * 0.5;
    const cloudY = cy + ch * 0.28;
    return (
      <Group>
        <Rect x={cx} y={cy} width={cw} height={ch} fill="#a4cdfc" />
        <Group>
          <Circle x={cloudX} y={cloudY} radius={14} fill="#ffffff" />
          <Circle x={cloudX - 12} y={cloudY + 3} radius={10} fill="#ffffff" />
          <Circle x={cloudX + 12} y={cloudY + 3} radius={10} fill="#ffffff" />
          <Rect x={cloudX - 12} y={cloudY + 3} width={24} height={10} fill="#ffffff" />
        </Group>
        <Line
          points={[
            cx - 10,
            cy + ch + 10,
            cx - 10,
            cy + ch * 0.65,
            cx + cw * 0.45,
            cy + ch * 0.58,
            cx + cw + 10,
            cy + ch * 0.68,
            cx + cw + 10,
            cy + ch + 10,
          ]}
          fill="#8ec641"
          closed
        />
        <Line
          points={[
            cx - 10,
            cy + ch + 10,
            cx - 10,
            cy + ch * 0.78,
            cx + cw * 0.55,
            cy + ch * 0.72,
            cx + cw + 10,
            cy + ch * 0.76,
            cx + cw + 10,
            cy + ch + 10,
          ]}
          fill="#689f38"
          closed
        />
        <Group x={cx + (cw - Math.max(80, Math.min(160, cw - 20))) / 2} y={cy + ch * 0.82}>
          {(() => {
            const isBound =
              typeof props.image === "object" &&
              props.image !== null &&
              "bind" in props.image &&
              typeof (props.image as { bind: unknown }).bind === "string";
            const label = isBound ? `{${(props.image as { bind: string }).bind}}` : "Pilih Foto";
            const badgeW = Math.max(80, Math.min(160, cw - 20));
            return (
              <>
                <Rect width={badgeW} height={18} cornerRadius={9} fill="#ffffff" opacity={0.88} />
                <Text
                  x={4}
                  y={4}
                  width={badgeW - 8}
                  text={label}
                  fontSize={9}
                  fontStyle="bold"
                  fill="#334155"
                  align="center"
                  ellipsis
                  wrap="none"
                />
              </>
            );
          })()}
        </Group>
      </Group>
    );
  };

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      <Rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill={paperColor}
        cornerRadius={variant === "torn-arch" ? [140, 140, 6, 6] : frameRadius}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={1}
        shadowColor="#000000"
        shadowBlur={12}
        shadowOpacity={0.12}
        shadowOffset={{ x: 0, y: 4 }}
      />
      <Rect
        x={frameX + 2}
        y={frameY + 2}
        width={frameW - 4}
        height={frameH - 4}
        cornerRadius={variant === "torn-arch" ? [138, 138, 4, 4] : Math.max(0, frameRadius - 2)}
        stroke={
          variant === "torn-oval" || variant === "torn-arch"
            ? "rgba(90,60,30,0.18)"
            : "rgba(0,0,0,0.04)"
        }
        strokeWidth={1}
        dash={[4, 3]}
      />
      {variant === "torn-oval" && (
        <Text
          x={frameX}
          y={frameY + 6}
          width={frameW}
          text="• THE WEDDING GAZETTE •"
          fontSize={7.5}
          fontStyle="bold"
          fill="#6b5138"
          align="center"
          opacity={0.8}
        />
      )}
      {variant === "torn-arch" && (
        <Text
          x={frameX}
          y={frameY + 12}
          width={frameW}
          text="SWEET MEMORIES • FOREVER"
          fontSize={7.5}
          fontStyle="bold"
          fill="#6b5138"
          align="center"
          opacity={0.8}
        />
      )}

      <Group
        clipFunc={(ctx: {
          arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
          beginPath(): void;
          moveTo(x: number, y: number): void;
          bezierCurveTo(
            cp1x: number,
            cp1y: number,
            cp2x: number,
            cp2y: number,
            x: number,
            y: number,
          ): void;
          quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
          lineTo(x: number, y: number): void;
          closePath(): void;
          rect(x: number, y: number, width: number, height: number): void;
        }) => {
          if (variant === "torn-circle") {
            const cr = cutoutW / 2;
            ctx.arc(cutoutX + cr, cutoutY + cr, cr, 0, Math.PI * 2);
          } else if (variant === "torn-oval") {
            const cx = cutoutX + cutoutW / 2;
            const cy = cutoutY + cutoutH / 2;
            const rx = cutoutW / 2;
            const ry = cutoutH / 2;
            const k = 0.5522847498;
            ctx.beginPath();
            ctx.moveTo(cx - rx, cy);
            ctx.bezierCurveTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry);
            ctx.bezierCurveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
            ctx.bezierCurveTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry);
            ctx.bezierCurveTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
            ctx.closePath();
          } else if (variant === "torn-heart") {
            const hx = cutoutX + cutoutW / 2;
            const hy = cutoutY + cutoutH * 0.35;
            const topY = cutoutY + cutoutH * 0.08;
            const botY = cutoutY + cutoutH * 0.94;
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.bezierCurveTo(hx, topY, cutoutX, topY, cutoutX, hy);
            ctx.bezierCurveTo(cutoutX, cutoutY + cutoutH * 0.65, hx, botY, hx, botY);
            ctx.bezierCurveTo(
              hx,
              botY,
              cutoutX + cutoutW,
              cutoutY + cutoutH * 0.65,
              cutoutX + cutoutW,
              hy,
            );
            ctx.bezierCurveTo(cutoutX + cutoutW, topY, hx, topY, hx, hy);
            ctx.closePath();
          } else if (variant === "torn-arch") {
            const rx = cutoutW / 2;
            const ry = Math.min(rx, cutoutH * 0.4);
            ctx.beginPath();
            ctx.moveTo(cutoutX, cutoutY + ry);
            ctx.quadraticCurveTo(cutoutX + rx, cutoutY, cutoutX + cutoutW, cutoutY + ry);
            ctx.lineTo(cutoutX + cutoutW, cutoutY + cutoutH);
            ctx.lineTo(cutoutX, cutoutY + cutoutH);
            ctx.closePath();
          } else {
            ctx.rect(cutoutX, cutoutY, cutoutW, cutoutH);
          }
        }}
      >
        {image ? (
          (() => {
            const { crop, dest } = fitImage({
              boxWidth: cutoutW,
              boxHeight: cutoutH,
              imageWidth: image.naturalWidth || cutoutW,
              imageHeight: image.naturalHeight || cutoutH,
              fit,
              focal: { x: 0.5, y: 0.5 },
            });
            return (
              <KonvaImage
                image={image}
                crop={crop}
                x={cutoutX + dest.x}
                y={cutoutY + dest.y}
                width={dest.width}
                height={dest.height}
              />
            );
          })()
        ) : (
          renderPlaceholder(cutoutX, cutoutY, cutoutW, cutoutH)
        )}
      </Group>

      <Rect
        x={cutoutX}
        y={cutoutY}
        width={cutoutW}
        height={cutoutH}
        cornerRadius={variant === "torn-circle" ? cutoutW / 2 : variant === "torn-oval" ? cutoutW / 2 : 2}
        stroke="rgba(0,0,0,0.12)"
        strokeWidth={1}
      />

      {caption && (
        <Text
          x={10}
          y={availH + 4}
          width={w - 20}
          text={caption}
          fontSize={12}
          fontStyle="500"
          fill={color}
          align="center"
          ellipsis
        />
      )}
    </Group>
  );
}

export function TimelineVisual({
  element,
  tokens,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  const { frame, props, style } = element;
  const { w, h } = frame;
  const { color, background } = colors(element, tokens);
  const variant = resolveWidgetStyleVariant("timeline", style.variant).variant.id;
  const title = typeof props.title === "string" ? props.title : "Rundown Acara";
  const subtitle = typeof props.subtitle === "string" ? props.subtitle : "";
  const events = parseTimelineEvents(props.events);
  const cardRadius =
    style.radius ?? (variant === "minimal-cards" ? 8 : variant === "luxury-gold" ? 4 : 12);

  const headerH = subtitle ? 48 : 34;
  const availableH = Math.max(80, h - headerH - 16);
  const count = Math.min(events.length, 8);
  const displayEvents = events.slice(0, count);

  // Dynamic card height and gap: avoids huge empty gaps and prevents overflowing text
  const targetCardH = 74;
  const naturalTotalH = count * targetCardH + (count - 1) * 12;
  const compressRatio = availableH < naturalTotalH ? Math.max(0.64, availableH / naturalTotalH) : 1;
  const itemH = Math.round(targetCardH * compressRatio);
  const itemGap =
    count > 1
      ? Math.max(6, Math.min(14, Math.floor((availableH - count * itemH) / (count - 1))))
      : 0;
  const slotH = itemH + itemGap;

  return (
    <Group width={w} height={h}>
      <Background element={element} tokens={tokens} />

      {/* Header */}
      <Text
        x={12}
        y={10}
        width={w - 24}
        text={title}
        fontSize={15}
        fontStyle={variant === "luxury-gold" ? "serif bold" : "bold"}
        fill={color}
        align="center"
        ellipsis
      />
      {subtitle && (
        <Text
          x={12}
          y={30}
          width={w - 24}
          text={subtitle}
          fontSize={11}
          fill={color}
          opacity={0.75}
          align="center"
          ellipsis
        />
      )}

      {/* Variant Rendering */}
      {variant === "horizontal-steps" ? (
        (() => {
          const stepCount = Math.min(displayEvents.length, 3);
          const stepGap = 10;
          const stepW = Math.max(85, Math.floor((w - 24 - (stepCount - 1) * stepGap) / stepCount));
          const stepCardH = Math.max(56, availableH - 36);

          return (
            <Group x={12} y={headerH + 8}>
              {displayEvents.slice(0, stepCount).map((ev, i) => {
                const stepX = i * (stepW + stepGap);
                return (
                  <Group key={`${ev.time}-${i}`} x={stepX} y={0}>
                    {/* Step badge */}
                    <Rect
                      x={0}
                      y={0}
                      width={26}
                      height={20}
                      cornerRadius={4}
                      fill={color}
                    />
                    <Text
                      x={0}
                      y={4}
                      width={26}
                      text={String(i + 1).padStart(2, "0")}
                      fontSize={10}
                      fontStyle="bold"
                      fill={background === "transparent" ? "#ffffff" : background}
                      align="center"
                    />
                    {/* Connecting line */}
                    {i < stepCount - 1 && (
                      <Line
                        points={[28, 10, stepW + stepGap - 2, 10]}
                        stroke={color}
                        strokeWidth={1.5}
                        opacity={0.3}
                      />
                    )}
                    {/* Step Card */}
                    <Rect
                      x={0}
                      y={26}
                      width={stepW}
                      height={stepCardH}
                      cornerRadius={8}
                      fill="rgba(255, 255, 255, 0.85)"
                      stroke="rgba(0, 0, 0, 0.08)"
                      strokeWidth={1}
                    />
                    <Text
                      x={6}
                      y={32}
                      width={stepW - 12}
                      text={ev.time}
                      fontSize={9}
                      fontStyle="bold"
                      fill={color}
                      ellipsis
                    />
                    <Text
                      x={6}
                      y={46}
                      width={stepW - 12}
                      text={ev.title}
                      fontSize={11}
                      fontStyle="bold"
                      fill={color}
                      ellipsis
                    />
                    {ev.location && stepCardH >= 70 && (
                      <Text
                        x={6}
                        y={62}
                        width={stepW - 12}
                        text={ev.location}
                        fontSize={8.5}
                        fill={color}
                        opacity={0.8}
                        ellipsis
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          );
        })()
      ) : variant === "vertical-centered" ? (
        (() => {
          const centerX = w / 2;
          const cardW = Math.max(80, Math.floor(centerX - 24));
          const firstNodeY = 14;
          const lastNodeY = (count - 1) * slotH + 14;

          return (
            <Group x={0} y={headerH + 8}>
              {/* Center Track Line connecting first node to last node */}
              {count > 1 && (
                <Line
                  points={[centerX, firstNodeY, centerX, lastNodeY]}
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.25}
                />
              )}
              {displayEvents.map((ev, i) => {
                const itemY = i * slotH;
                const isEven = i % 2 === 0;
                const cardX = isEven ? centerX - cardW - 12 : centerX + 12;
                return (
                  <Group key={`${ev.time}-${i}`} y={itemY}>
                    {/* Center Node */}
                    <Circle
                      x={centerX}
                      y={14}
                      radius={7}
                      fill={color}
                    />
                    {/* Card */}
                    <Rect
                      x={cardX}
                      y={0}
                      width={cardW}
                      height={itemH}
                      cornerRadius={cardRadius}
                      fill="rgba(255, 255, 255, 0.85)"
                      stroke="rgba(0, 0, 0, 0.08)"
                      strokeWidth={1}
                    />
                    {/* Time */}
                    <Text
                      x={cardX + 6}
                      y={6}
                      width={cardW - 12}
                      text={ev.time}
                      fontSize={9}
                      fontStyle="bold"
                      fill={color}
                      align={isEven ? "right" : "left"}
                      ellipsis
                    />
                    {/* Title */}
                    <Text
                      x={cardX + 6}
                      y={20}
                      width={cardW - 12}
                      text={ev.title}
                      fontSize={itemH < 60 ? 11 : 12}
                      fontStyle="bold"
                      fill={color}
                      align={isEven ? "right" : "left"}
                      ellipsis
                    />
                    {/* Location */}
                    {itemH >= 54 && ev.location && (
                      <Text
                        x={cardX + 6}
                        y={36}
                        width={cardW - 12}
                        text={ev.location}
                        fontSize={itemH < 68 ? 8.5 : 9.5}
                        fill={color}
                        opacity={0.8}
                        align={isEven ? "right" : "left"}
                        ellipsis
                      />
                    )}
                    {/* Description */}
                    {itemH >= 70 && ev.description && (
                      <Text
                        x={cardX + 6}
                        y={ev.location ? 50 : 36}
                        width={cardW - 12}
                        text={ev.description}
                        fontSize={8.5}
                        fill={color}
                        opacity={0.7}
                        align={isEven ? "right" : "left"}
                        ellipsis
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          );
        })()
      ) : (
        /* Vertical Left (Default) & Minimal Cards & Luxury Gold */
        (() => {
          const trackX = variant === "minimal-cards" ? 0 : 22;
          const cardX = variant === "minimal-cards" ? 12 : 38;
          const cardW = w - cardX - 12;
          const firstNodeY = 14;
          const lastNodeY = (count - 1) * slotH + 14;

          return (
            <Group x={0} y={headerH + 8}>
              {/* Left Track Line (if not minimal-cards) connecting first to last node */}
              {variant !== "minimal-cards" && count > 1 && (
                <Line
                  points={[trackX, firstNodeY, trackX, lastNodeY]}
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.25}
                />
              )}

              {displayEvents.map((ev, i) => {
                const itemY = i * slotH;
                return (
                  <Group key={`${ev.time}-${i}`} y={itemY}>
                    {/* Node */}
                    {variant === "luxury-gold" ? (
                      <Rect
                        x={trackX}
                        y={8}
                        width={12}
                        height={12}
                        rotation={45}
                        fill={color}
                      />
                    ) : variant !== "minimal-cards" ? (
                      <Circle
                        x={trackX}
                        y={14}
                        radius={7}
                        fill={color}
                      />
                    ) : null}

                    {/* Card Rect */}
                    <Rect
                      x={cardX}
                      y={0}
                      width={cardW}
                      height={itemH}
                      cornerRadius={cardRadius}
                      fill="rgba(255, 255, 255, 0.85)"
                      stroke={
                        variant === "luxury-gold"
                          ? color
                          : "rgba(0, 0, 0, 0.08)"
                      }
                      strokeWidth={variant === "luxury-gold" ? 1.5 : 1}
                    />

                    {/* Left Accent Bar for minimal-cards */}
                    {variant === "minimal-cards" && (
                      <Rect
                        x={cardX}
                        y={0}
                        width={3.5}
                        height={itemH}
                        cornerRadius={[cardRadius, 0, 0, cardRadius]}
                        fill={color}
                      />
                    )}

                    {/* Badge Pill for time */}
                    <Rect
                      x={cardX + 8}
                      y={4}
                      width={Math.min(cardW - 16, 110)}
                      height={16}
                      cornerRadius={999}
                      fill={variant === "minimal-cards" ? "transparent" : color}
                      stroke={variant === "minimal-cards" ? color : undefined}
                      strokeWidth={variant === "minimal-cards" ? 1 : 0}
                    />
                    <Text
                      x={cardX + 10}
                      y={6}
                      width={Math.min(cardW - 20, 106)}
                      text={ev.time}
                      fontSize={9.5}
                      fontStyle="bold"
                      fill={
                        variant === "minimal-cards"
                          ? color
                          : background === "transparent"
                            ? "#ffffff"
                            : background
                      }
                      ellipsis
                    />

                    {/* Title */}
                    <Text
                      x={cardX + 8}
                      y={23}
                      width={cardW - 16}
                      text={ev.title}
                      fontSize={itemH < 60 ? 11 : 12.5}
                      fontStyle={variant === "luxury-gold" ? "serif bold" : "bold"}
                      fill={color}
                      ellipsis
                    />

                    {/* Location */}
                    {itemH >= 54 && ev.location && (
                      <Text
                        x={cardX + 8}
                        y={itemH < 68 ? 38 : 40}
                        width={cardW - 16}
                        text={ev.location}
                        fontSize={itemH < 68 ? 8.5 : 9.5}
                        fill={color}
                        opacity={0.8}
                        ellipsis
                      />
                    )}

                    {/* Description */}
                    {itemH >= 70 && ev.description && (
                      <Text
                        x={cardX + 8}
                        y={ev.location ? 54 : 40}
                        width={cardW - 16}
                        text={ev.description}
                        fontSize={9}
                        fill={color}
                        opacity={0.7}
                        ellipsis
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          );
        })()
      )}
    </Group>
  );
}

export function WishesVisual({
  element,
  tokens,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  const { frame, props, style } = element;
  const { w, h } = frame;
  const { color, background } = colors(element, tokens);
  const variant = resolveWidgetStyleVariant("wishes", style.variant).variant.id;
  const title = typeof props.title === "string" ? props.title : "Ucapan & Doa Restu";
  const subtitle = typeof props.subtitle === "string" ? props.subtitle : "";
  const wishes = parseWishItems(props.items);
  const cardRadius = style.radius ?? (variant === "editorial-ticker" ? 0 : variant === "luxury-gold" ? 6 : 12);

  const headerH = subtitle ? 48 : 34;
  const availableH = h - headerH - 16;
  const maxDisplay = Math.min(wishes.length, 3);
  const displayWishes = wishes.slice(0, maxDisplay);
  const slotH = maxDisplay > 0 ? Math.floor(availableH / maxDisplay) : 80;
  const cardH = Math.min(slotH - 8, 86);
  const cardW = w - 24;

  return (
    <Group width={w} height={h}>
      <Background element={element} tokens={tokens} />

      {/* Header */}
      <Text
        x={12}
        y={12}
        width={w - 24}
        text={title}
        fontSize={16}
        fontStyle={variant === "luxury-gold" ? "serif bold" : "bold"}
        fill={color}
        align="center"
        ellipsis
      />
      {subtitle && (
        <Text
          x={12}
          y={32}
          width={w - 24}
          text={subtitle}
          fontSize={11}
          fill={color}
          opacity={0.7}
          align="center"
          ellipsis
        />
      )}

      {/* Wishes Feed */}
      <Group x={12} y={headerH + 8}>
        {displayWishes.map((item, i) => {
          const itemY = i * slotH;
          const isHadir = item.presence?.toLowerCase() === "hadir";
          const initials = item.name.slice(0, 2).toUpperCase() || "TU";

          return (
            <Group
              key={`${item.name}-${i}`}
              y={itemY}
              rotation={variant === "masonry-board" ? (i % 2 === 0 ? -1 : 1) : 0}
            >
              {/* Card Container */}
              <Rect
                x={0}
                y={0}
                width={cardW}
                height={cardH}
                cornerRadius={variant === "chat-bubbles" ? [4, 14, 14, 14] : cardRadius}
                fill={
                  variant === "editorial-ticker"
                    ? "transparent"
                    : "rgba(255, 255, 255, 0.9)"
                }
                stroke={
                  variant === "luxury-gold"
                    ? color
                    : variant === "editorial-ticker"
                      ? "transparent"
                      : "rgba(0, 0, 0, 0.08)"
                }
                strokeWidth={variant === "luxury-gold" ? 1.5 : 1}
              />

              {/* Bottom divider for editorial ticker */}
              {variant === "editorial-ticker" && (
                <Line
                  points={[0, cardH - 1, cardW, cardH - 1]}
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1}
                />
              )}

              {/* Left Accent Bar for modern-cards */}
              {variant === "modern-cards" && (
                <Rect
                  x={0}
                  y={0}
                  width={3.5}
                  height={cardH}
                  cornerRadius={[cardRadius, 0, 0, cardRadius]}
                  fill={color}
                />
              )}

              {/* Avatar circle */}
              <Circle
                x={20}
                y={20}
                radius={12}
                fill={color}
              />
              <Text
                x={8}
                y={15}
                width={24}
                text={initials}
                fontSize={9}
                fontStyle="bold"
                fill={background === "transparent" ? "#ffffff" : background}
                align="center"
              />

              {/* Author Name */}
              <Text
                x={38}
                y={10}
                width={cardW - 130}
                text={item.name}
                fontSize={12}
                fontStyle={variant === "luxury-gold" ? "serif bold" : "bold"}
                fill={color}
                ellipsis
              />

              {/* Presence Badge */}
              <Rect
                x={cardW - 86}
                y={10}
                width={78}
                height={16}
                cornerRadius={999}
                fill={isHadir ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"}
                stroke={isHadir ? "#059669" : "#dc2626"}
                strokeWidth={0.8}
              />
              <Text
                x={cardW - 86}
                y={13}
                width={78}
                text={isHadir ? "✓ HADIR" : "✕ BERHALANGAN"}
                fontSize={8}
                fontStyle="bold"
                fill={isHadir ? "#059669" : "#dc2626"}
                align="center"
              />

              {/* Message */}
              <Text
                x={38}
                y={28}
                width={cardW - 48}
                height={cardH - 32}
                text={item.message}
                fontSize={11}
                fill="#334155"
                lineHeight={1.3}
                ellipsis
              />
            </Group>
          );
        })}
      </Group>
    </Group>
  );
}

function CanvasPersonAvatar({
  x,
  y,
  width,
  height,
  radius = 12,
  arch = false,
  circle = false,
  strokeWidth = 1,
  color,
  src,
  initial,
  roleLabel,
  rotation,
  nameFont,
  bodyFont,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  arch?: boolean;
  circle?: boolean;
  strokeWidth?: number;
  color: string;
  src?: string;
  initial: string;
  roleLabel: string;
  rotation?: number;
  nameFont?: string;
  bodyFont?: string;
}) {
  if (src) {
    return (
      <CanvasGalleryPhoto
        x={x}
        y={y}
        width={width}
        height={height}
        radius={circle ? width / 2 : radius}
        arch={arch}
        strokeWidth={strokeWidth}
        color={color}
        src={src}
        rotation={rotation}
      />
    );
  }

  // Monogram Fallback
  const topRadius = arch ? Math.min(width / 2, 70) : radius;
  const clippedRadius = circle ? width / 2 : Math.min(radius, width / 2, height / 2);
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
        opacity={0.08}
      />
      <Rect
        width={width}
        height={height}
        cornerRadius={rectCornerRadius}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.35}
      />
      <Text
        width={width}
        y={height * 0.22}
        text={initial}
        fontSize={Math.min(36, width * 0.38)}
        fontFamily={nameFont || "serif"}
        fontStyle="bold"
        fill={color}
        align="center"
      />
      <Text
        width={width}
        y={height * 0.65}
        text={roleLabel}
        fontSize={8}
        fontFamily={bodyFont}
        fill={color}
        opacity={0.7}
        align="center"
      />
    </Group>
  );
}

function CoupleProfileVisual({
  element,
  tokens,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
}) {
  const { w, h } = element.frame;
  const { color } = colors(element, tokens);
  const variant = element.style.variant || "side-by-side";
  const props = element.props as Record<string, unknown>;

  const groom = parseCouplePerson(props.groom, "Mempelai Pria");
  const bride = parseCouplePerson(props.bride, "Mempelai Wanita");

  const groomFirst = props.order !== "bride-first";
  const first = groomFirst ? groom : bride;
  const second = groomFirst ? bride : groom;
  const firstRole = first.role || (groomFirst ? "Mempelai Pria" : "Mempelai Wanita");
  const secondRole = second.role || (groomFirst ? "Mempelai Wanita" : "Mempelai Pria");

  const firstSrc = parseFrameImage(first.photo) ?? undefined;
  const secondSrc = parseFrameImage(second.photo) ?? undefined;

  const firstInitial = (first.name || first.fullName || (groomFirst ? "R" : "A")).charAt(0).toUpperCase();
  const secondInitial = (second.name || second.fullName || (groomFirst ? "A" : "R")).charAt(0).toUpperCase();

  const title = typeof props.title === "string" ? props.title : "";
  const subtitle = typeof props.subtitle === "string" ? props.subtitle : "";
  const rawConnector = typeof props.connector === "string" && props.connector.trim() ? props.connector.trim() : "&";
  const connector = variant === "heart-romance" && rawConnector === "&" ? "♥" : rawConnector;
  const showInstagram = props.showInstagram !== false;
  const showParents = props.showParents !== false;

  const rawNameFont = typeof props.nameFont === "string" && props.nameFont.trim() ? props.nameFont.trim() : undefined;
  const rawBodyFont = typeof props.bodyFont === "string" && props.bodyFont.trim() ? props.bodyFont.trim() : undefined;

  const isEditorial = variant === "minimalist-editorial";
  const isLuxury = variant === "luxury-gold";
  const isHeritage = variant === "heritage-ornament";
  const isHeart = variant === "heart-romance";
  const isCircle = variant === "circular-medallion";
  const isArch = variant === "arch-window";
  const isPolaroid = variant === "polaroid-duo";
  const isGlass = variant === "glass-morphism";

  const nameFont = rawNameFont || (isLuxury || isEditorial ? "serif" : undefined);
  const bodyFont = rawBodyFont || undefined;

  const hasHeader = Boolean(title || subtitle || isHeritage);
  const headerH = hasHeader ? (subtitle ? (isHeritage ? 54 : 42) : (isHeritage ? 38 : 26)) : 0;
  const top = 12 + headerH;
  const radius = element.style.radius ?? 12;

  const headerVisual = hasHeader ? (
    <Group x={12} y={10}>
      {title ? (
        <Text
          width={w - 24}
          text={title}
          fontSize={16}
          fontFamily={nameFont}
          fontStyle="bold"
          fill={color}
          align="center"
        />
      ) : null}
      {subtitle ? (
        <Text
          y={title ? 20 : 0}
          width={w - 24}
          text={subtitle}
          fontSize={10.5}
          fontFamily={bodyFont}
          fill={color}
          opacity={0.7}
          align="center"
        />
      ) : null}
      {isHeritage ? (
        <Text
          y={title && subtitle ? 34 : title || subtitle ? 20 : 0}
          width={w - 24}
          text="❖ ─── ✦ ─── ❖"
          fontSize={9}
          fill="#c59b27"
          align="center"
        />
      ) : null}
    </Group>
  ) : null;

  // 1. Stacked Layout: for variant === "stacked-cards" or "minimalist-editorial"
  if (variant === "stacked-cards" || isEditorial) {
    const cardGap = 20;
    const cardH = Math.min(130, (h - top - 16 - cardGap) / 2);
    const cardW = w - 16;

    const renderCard = (
      person: typeof first,
      personSrc: string | undefined,
      initial: string,
      role: string,
      yPos: number,
    ) => {
      const avatarW = isEditorial ? 80 : 78;
      const avatarH = isEditorial ? 100 : 78;
      const avatarY = (cardH - avatarH) / 2;

      return (
        <Group x={8} y={yPos}>
          <Rect
            width={cardW}
            height={cardH}
            cornerRadius={isEditorial ? 0 : 14}
            fill="#ffffff"
            opacity={0.92}
            stroke={color}
            strokeWidth={isEditorial ? 0 : 1}
          />
          {isEditorial ? (
            <Line points={[0, 0, 0, cardH]} stroke={color} strokeWidth={2.5} />
          ) : null}

          <CanvasPersonAvatar
            x={10}
            y={avatarY}
            width={avatarW}
            height={avatarH}
            radius={isEditorial ? 0 : 39}
            circle={!isEditorial}
            color={color}
            src={personSrc}
            initial={initial}
            roleLabel={role}
            nameFont={nameFont}
            bodyFont={bodyFont}
          />

          <Group x={avatarW + 20} y={10}>
            <Text
              text={role.toUpperCase()}
              fontSize={8.5}
              fontFamily={bodyFont}
              fontStyle="bold"
              fill={color}
              opacity={0.65}
            />
            <Text
              y={13}
              text={person.name ?? ""}
              fontSize={16}
              fontFamily={nameFont}
              fontStyle={isEditorial && !rawNameFont ? "italic" : "bold"}
              fill={color}
            />
            <Text
              y={33}
              width={cardW - avatarW - 30}
              text={person.fullName ?? ""}
              fontSize={11}
              fontFamily={bodyFont}
              fontStyle="bold"
              fill={color}
              opacity={0.9}
              ellipsis
            />
            {showParents && person.parents ? (
              <Text
                y={49}
                width={cardW - avatarW - 30}
                height={26}
                text={person.parents}
                fontSize={9.5}
                fontFamily={bodyFont}
                fill={color}
                opacity={0.7}
                lineHeight={1.25}
                ellipsis
              />
            ) : null}
            {showInstagram && person.instagram ? (
              <Group y={cardH - 30}>
                <Rect
                  width={Math.min(110, person.instagram.length * 7 + 22)}
                  height={18}
                  cornerRadius={9}
                  stroke={color}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
                <Text
                  x={8}
                  y={4}
                  text={`@${person.instagram}`}
                  fontSize={9}
                  fontFamily={bodyFont}
                  fill={color}
                />
              </Group>
            ) : null}
          </Group>
        </Group>
      );
    };

    return (
      <Group listening={false}>
        <Background element={element} tokens={tokens} />
        {headerVisual}
        {renderCard(first, firstSrc, firstInitial, firstRole, top)}
        <Group x={w / 2 - 14} y={top + cardH + (cardGap - 28) / 2}>
          <Circle x={14} y={14} radius={14} fill="#ffffff" stroke={color} strokeWidth={1.5} />
          <Text x={0} y={6} width={28} text={connector} fontSize={13} fontFamily={nameFont || "serif"} fontStyle="bold" fill={color} align="center" />
        </Group>
        {renderCard(second, secondSrc, secondInitial, secondRole, top + cardH + cardGap)}
      </Group>
    );
  }

  // 2. Dual Column Layout (all other 8 variants)
  const colW = (w - 32) / 2;

  // Viewport sizes exactly matching runtime DOM
  const photoW = isCircle ? 90 : isArch ? 106 : isPolaroid ? 106 : isGlass || isHeritage ? 96 : isHeart ? 100 : 108;
  const photoH = isCircle ? 90 : isArch ? 138 : isPolaroid ? 106 : isGlass || isHeritage ? 110 : isHeart ? 114 : 122;

  const renderColumn = (
    person: typeof first,
    personSrc: string | undefined,
    initial: string,
    role: string,
    colX: number,
    rotation = 0,
  ) => {
    const avatarX = colX + (colW - photoW) / 2;
    const textY = top + photoH + (isPolaroid ? 16 : 8);

    return (
      <Group key={role}>
        {isGlass ? (
          <Rect
            x={colX}
            y={top - 4}
            width={colW}
            height={h - top - 8}
            cornerRadius={14}
            fill="#ffffff"
            opacity={0.55}
            stroke={color}
            strokeWidth={1}
          />
        ) : isHeritage ? (
          <Rect
            x={colX}
            y={top - 4}
            width={colW}
            height={h - top - 8}
            cornerRadius={8}
            fill="#ffffff"
            opacity={0.8}
            stroke="#c59b27"
            strokeWidth={1.5}
          />
        ) : null}

        {isPolaroid ? (
          <Group x={avatarX} y={top} rotation={rotation}>
            <Rect
              x={-4}
              y={-4}
              width={photoW + 8}
              height={photoH + 34}
              fill="#ffffff"
              cornerRadius={2}
              stroke={color}
              strokeWidth={0.8}
              shadowColor="#000"
              shadowBlur={8}
              shadowOpacity={0.12}
            />
          </Group>
        ) : null}

        <CanvasPersonAvatar
          x={avatarX}
          y={top}
          width={photoW}
          height={photoH}
          radius={isArch ? 53 : isCircle ? 45 : isLuxury ? 4 : isHeritage ? 6 : radius}
          arch={isArch}
          circle={isCircle}
          strokeWidth={isLuxury || isHeritage || isHeart || isCircle ? 2 : 1}
          color={isLuxury ? "#b45309" : isHeritage || isCircle ? "#c59b27" : isHeart ? "#e11d48" : color}
          src={personSrc}
          initial={initial}
          roleLabel={role}
          rotation={isPolaroid ? rotation : 0}
          nameFont={nameFont}
          bodyFont={bodyFont}
        />

        <Group x={colX} y={textY}>
          <Text
            width={colW}
            text={role.toUpperCase()}
            fontSize={8}
            fontFamily={bodyFont}
            fontStyle="bold"
            fill={color}
            opacity={0.65}
            align="center"
          />
          <Text
            y={12}
            width={colW}
            text={person.name ?? ""}
            fontSize={16}
            fontFamily={nameFont}
            fontStyle="bold"
            fill={color}
            align="center"
          />
          <Text
            y={32}
            width={colW}
            text={person.fullName ?? ""}
            fontSize={10.5}
            fontFamily={bodyFont}
            fontStyle="bold"
            fill={color}
            opacity={0.9}
            align="center"
            ellipsis
          />
          {showParents && person.parents ? (
            <Text
              y={48}
              width={colW}
              height={36}
              text={person.parents}
              fontSize={9}
              fontFamily={bodyFont}
              fill={color}
              opacity={0.7}
              lineHeight={1.25}
              align="center"
              ellipsis
            />
          ) : null}
          {showInstagram && person.instagram ? (
            <Group x={colW / 2 - Math.min(colW * 0.45, 45)} y={88}>
              <Rect
                width={Math.min(colW * 0.9, 90)}
                height={18}
                cornerRadius={9}
                stroke={color}
                strokeWidth={0.8}
                opacity={0.4}
              />
              <Text
                width={Math.min(colW * 0.9, 90)}
                y={4}
                text={`@${person.instagram}`}
                fontSize={8.5}
                fontFamily={bodyFont}
                fill={color}
                align="center"
                ellipsis
              />
            </Group>
          ) : null}
        </Group>
      </Group>
    );
  };

  const badgeY = top + (isCircle ? 31 : isArch ? 41 : isPolaroid ? 36 : 34);

  return (
    <Group listening={false}>
      <Background element={element} tokens={tokens} />
      {isLuxury ? (
        <Rect
          x={4}
          y={4}
          width={w - 8}
          height={h - 8}
          cornerRadius={6}
          stroke="#b45309"
          strokeWidth={2}
        />
      ) : null}
      {headerVisual}
      {renderColumn(first, firstSrc, firstInitial, firstRole, 12, isPolaroid ? -3 : 0)}

      {/* Floating Center Connector */}
      <Group x={w / 2 - 14} y={badgeY}>
        {isLuxury ? (
          <Rect
            x={14}
            y={14}
            width={24}
            height={24}
            offsetX={12}
            offsetY={12}
            rotation={45}
            fill="#ffffff"
            stroke="#b45309"
            strokeWidth={1.5}
          />
        ) : isHeart ? (
          <Circle x={14} y={14} radius={14} fill="#ffffff" stroke="#e11d48" strokeWidth={1.5} />
        ) : isHeritage || isCircle ? (
          <Circle x={14} y={14} radius={14} fill="#ffffff" stroke="#c59b27" strokeWidth={1.5} />
        ) : (
          <Circle x={14} y={14} radius={14} fill="#ffffff" stroke={color} strokeWidth={1.5} />
        )}
        <Text
          x={0}
          y={isLuxury ? 6 : 7}
          width={28}
          text={connector}
          fontSize={13}
          fontFamily={nameFont || "serif"}
          fontStyle="bold"
          fill={isHeart ? "#e11d48" : isLuxury ? "#b45309" : isHeritage || isCircle ? "#c59b27" : color}
          align="center"
        />
      </Group>

      {renderColumn(second, secondSrc, secondInitial, secondRole, 12 + colW + 8, isPolaroid ? 3 : 0)}
    </Group>
  );
}

function OrnamentFrameVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color, background } = colors(element, tokens);
  const strokeColor = color || "#b4833e";
  const props = (element.props ?? {}) as Record<string, unknown>;
  const shapeId =
    (typeof props.shape === "string" ? props.shape : element.style.variant) || "arch-window";
  const innerGap = typeof props.innerGap === "number" ? props.innerGap : 12;
  const cornerRadius =
    typeof props.cornerRadius === "number"
      ? props.cornerRadius
      : typeof element.style.radius === "number"
        ? element.style.radius
        : undefined;
  const shapeData = getOrnamentShape(shapeId, w, h, innerGap, cornerRadius);
  const strokeWidth = typeof props.strokeWidth === "number" ? props.strokeWidth : 2;
  const doubleBorder = props.doubleBorder !== false;
  const transparentGap = Boolean(props.transparentGap);
  const fillOpacity =
    (typeof props.fillOpacity === "number" ? Math.max(0, Math.min(100, props.fillOpacity)) : 100) / 100;
  const imageOpacity =
    (typeof props.imageOpacity === "number" ? Math.max(0, Math.min(100, props.imageOpacity)) : 100) / 100;

  const src = parseFrameImage(props.image, variables);
  const canvasImage = useCanvasImage(src);

  return (
    <Group width={w} height={h}>
      {transparentGap && doubleBorder ? (
        <>
          {/* Inner background fill (gap between border 1 and 2 is transparent) */}
          <Path
            data={shapeData.innerFullPath}
            fill={background === "transparent" ? undefined : background}
            opacity={background === "transparent" ? 1 : fillOpacity}
          />
          {/* Outer border stroke without fill */}
          <Path
            data={shapeData.fullPath}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </>
      ) : (
        <Path
          data={shapeData.fullPath}
          fill={background === "transparent" ? undefined : background}
          opacity={background === "transparent" ? 1 : fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
      {canvasImage && (
        <Path
          data={transparentGap && doubleBorder ? shapeData.innerFullPath : shapeData.fullPath}
          fillPatternImage={canvasImage}
          fillPatternRepeat="no-repeat"
          fillPatternScale={{
            x: w / (canvasImage.width || 1),
            y: h / (canvasImage.height || 1),
          }}
          opacity={imageOpacity}
        />
      )}
      {doubleBorder && (
        <Path
          data={shapeData.innerFullPath}
          stroke={strokeColor}
          strokeWidth={Math.max(1, strokeWidth * 0.65)}
          opacity={transparentGap ? 0.9 : 0.45}
        />
      )}
    </Group>
  );
}

function VideoVisual({
  element,
  tokens,
  variables,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  const { color } = colors(element, tokens);
  const variant = resolveWidgetStyleVariant("video", element.style.variant).variant.id;
  const props = (element.props ?? {}) as Record<string, unknown>;

  const sourceInfo = parseVideoSource(props.url, variables);
  const customPoster = parseFrameImage(props.poster, variables);
  const posterUrl =
    customPoster ||
    (sourceInfo.isYouTube && sourceInfo.thumbnailUrl ? sourceInfo.thumbnailUrl : null);
  const canvasImage = useCanvasImage(posterUrl);

  const caption = typeof props.caption === "string" ? props.caption.trim() : "";
  const cx = w / 2;
  const cy = h / 2;

  // Corner radii per variant
  let frameRadius: number | number[] = 14;
  if (variant === "story-portrait") frameRadius = 18;
  if (variant === "vintage-polaroid") frameRadius = 6;
  if (variant === "arch-luxury") frameRadius = [Math.min(w / 2, 160), Math.min(w / 2, 160), 14, 14];
  if (variant === "minimal-glass") frameRadius = 16;
  if (variant === "gold-ornament") frameRadius = 10;

  // Background style
  let bgFill = "#0b0f19";
  let borderStroke: string | undefined = "rgba(255, 255, 255, 0.15)";
  let borderWidth = 1;

  if (variant === "vintage-polaroid") {
    bgFill = "#fdfbf7";
    borderStroke = "#ebd9c8";
    borderWidth = 1.2;
  } else if (variant === "arch-luxury") {
    borderStroke = "#c89b43";
    borderWidth = 2;
  } else if (variant === "minimal-glass") {
    bgFill = "rgba(255, 255, 255, 0.1)";
    borderStroke = "rgba(255, 255, 255, 0.45)";
    borderWidth = 1.5;
  } else if (variant === "gold-ornament") {
    borderStroke = "#d4af37";
    borderWidth = 1.8;
  }

  // Play button styling per variant
  let playCircleFill = "rgba(255, 255, 255, 0.9)";
  let playCircleStroke = "rgba(0, 0, 0, 0.15)";
  let playTriangleFill = "#111827";
  let playRadius = 24;

  if (variant === "cinematic-frame") {
    playCircleFill = "rgba(255, 255, 255, 0.22)";
    playCircleStroke = "rgba(255, 255, 255, 0.65)";
    playTriangleFill = "#ffffff";
  } else if (variant === "story-portrait") {
    playCircleFill = "#ffffff";
    playTriangleFill = "#e11d48";
    playRadius = 22;
  } else if (variant === "arch-luxury") {
    playCircleFill = "#c89b43";
    playCircleStroke = "#ffffff";
    playTriangleFill = "#ffffff";
  } else if (variant === "minimal-glass") {
    playCircleFill = "rgba(255, 255, 255, 0.25)";
    playCircleStroke = "rgba(255, 255, 255, 0.7)";
    playTriangleFill = "#ffffff";
  } else if (variant === "gold-ornament") {
    playCircleFill = "#d4af37";
    playCircleStroke = "#fff3c4";
    playTriangleFill = "#ffffff";
  }

  // Render photo frame inside polaroid
  const isPolaroid = variant === "vintage-polaroid";
  const photoW = isPolaroid ? w - 20 : w;
  const photoH = isPolaroid ? h - 46 : h;
  const photoX = isPolaroid ? 10 : 0;
  const photoY = isPolaroid ? 10 : 0;
  const playCy = isPolaroid ? photoY + photoH / 2 : cy;

  return (
    <Group width={w} height={h}>
      {/* Outer Card */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={bgFill}
        stroke={borderStroke}
        strokeWidth={borderWidth}
        cornerRadius={frameRadius}
        shadowColor="rgba(0, 0, 0, 0.25)"
        shadowBlur={variant === "cinematic-frame" ? 16 : 8}
        shadowOffsetY={4}
      />

      {/* Polaroid inner photo screen */}
      {isPolaroid && (
        <Rect
          x={photoX}
          y={photoY}
          width={photoW}
          height={photoH}
          fill="#111622"
          stroke="#d4c0ab"
          strokeWidth={1}
          cornerRadius={4}
        />
      )}

      {/* Background Poster Image */}
      {canvasImage && (
        <KonvaImage
          x={photoX}
          y={photoY}
          width={photoW}
          height={photoH}
          image={canvasImage}
          cornerRadius={isPolaroid ? 4 : frameRadius}
          opacity={0.88}
        />
      )}

      {/* Dark gradient overlay if canvasImage is present */}
      {canvasImage && (
        <Rect
          x={photoX}
          y={photoY}
          width={photoW}
          height={photoH}
          fill="rgba(0, 0, 0, 0.35)"
          cornerRadius={isPolaroid ? 4 : frameRadius}
        />
      )}

      {/* Double border accents for luxury / gold */}
      {variant === "arch-luxury" && (
        <Rect
          x={5}
          y={5}
          width={w - 10}
          height={h - 10}
          stroke="rgba(200, 155, 67, 0.4)"
          strokeWidth={1}
          cornerRadius={[Math.min((w - 10) / 2, 155), Math.min((w - 10) / 2, 155), 10, 10]}
        />
      )}
      {variant === "gold-ornament" && (
        <>
          <Rect
            x={5}
            y={5}
            width={w - 10}
            height={h - 10}
            stroke="rgba(212, 175, 55, 0.45)"
            strokeWidth={1}
            cornerRadius={7}
          />
          {/* Corner accents */}
          <Line points={[7, 18, 7, 7, 18, 7]} stroke="#d4af37" strokeWidth={1.8} />
          <Line points={[w - 18, 7, w - 7, 7, w - 7, 18]} stroke="#d4af37" strokeWidth={1.8} />
          <Line points={[w - 7, h - 18, w - 7, h - 7, w - 18, h - 7]} stroke="#d4af37" strokeWidth={1.8} />
          <Line points={[18, h - 7, 7, h - 7, 7, h - 18]} stroke="#d4af37" strokeWidth={1.8} />
        </>
      )}

      {/* Top Badge (YouTube / Story / Dynamic Variable) */}
      {(() => {
        const isBound =
          typeof props.url === "object" &&
          props.url !== null &&
          "bind" in props.url &&
          typeof (props.url as { bind: unknown }).bind === "string";
        const boundKey = isBound ? (props.url as { bind: string }).bind : null;

        if (boundKey) {
          const badgeText = `{${boundKey}}`;
          const badgeW = Math.max(76, Math.min(180, badgeText.length * 7 + 18));
          return (
            <Group x={12} y={12}>
              <Rect width={badgeW} height={20} fill="rgba(37, 99, 235, 0.9)" cornerRadius={10} />
              <Text
                text={`✦ ${badgeText}`}
                x={8}
                y={4}
                width={badgeW - 16}
                fontSize={9.5}
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                ellipsis
                wrap="none"
              />
            </Group>
          );
        }

        if (sourceInfo.isYouTube) {
          return (
            <Group x={12} y={12}>
              <Rect width={72} height={20} fill="#dc2626" cornerRadius={10} />
              <Text
                text="YouTube"
                x={10}
                y={4}
                fontSize={11}
                fontStyle="bold"
                fill="#ffffff"
                align="center"
              />
            </Group>
          );
        }

        if (variant === "story-portrait") {
          return (
            <Group x={12} y={12}>
              <Rect width={66} height={20} fill="rgba(15, 23, 42, 0.75)" cornerRadius={10} />
              <Text
                text="✦ STORY"
                x={8}
                y={5}
                fontSize={10}
                fontStyle="bold"
                fill="#ffffff"
                align="center"
              />
            </Group>
          );
        }

        return null;
      })()}

      {/* Center Play Button */}
      <Circle
        x={cx}
        y={playCy}
        radius={playRadius}
        fill={playCircleFill}
        stroke={playCircleStroke}
        strokeWidth={1.5}
        shadowColor="rgba(0, 0, 0, 0.35)"
        shadowBlur={10}
        shadowOffsetY={3}
      />
      {/* Play Triangle Path */}
      <Path
        data="M -4 -8 L 8 0 L -4 8 Z"
        x={cx + 1}
        y={playCy}
        fill={playTriangleFill}
      />

      {/* Captions */}
      {isPolaroid && (
        <Text
          x={10}
          y={h - 32}
          width={w - 20}
          text={caption || "Our Special Story"}
          fontFamily="Georgia, serif"
          fontSize={13}
          fontStyle="italic"
          fill="#4a382c"
          align="center"
        />
      )}
      {variant === "story-portrait" && caption && (
        <Group y={h - 32}>
          <Rect x={0} y={0} width={w} height={32} fill="rgba(0, 0, 0, 0.65)" cornerRadius={[0, 0, 18, 18]} />
          <Text
            x={12}
            y={9}
            width={w - 24}
            text={caption}
            fontSize={11}
            fill="#ffffff"
            align="center"
          />
        </Group>
      )}
      {!isPolaroid && variant !== "story-portrait" && caption && (
        <Text
          x={12}
          y={playCy + playRadius + 14}
          width={w - 24}
          text={caption}
          fontSize={12}
          fill={variant === "minimal-glass" ? "#ffffff" : color}
          align="center"
        />
      )}
    </Group>
  );
}

function GifVisual({ element, tokens }: { element: WidgetElement; tokens?: ThemeTokens }) {
  const { w, h } = element.frame;
  const { color } = colors(element, tokens);
  const variant = element.style?.variant || "clean";
  const props = (element.props ?? {}) as Record<string, unknown>;
  const caption = typeof props.caption === "string" ? props.caption.trim() : "";
  const fit = props.fit === "cover" ? "cover" : "contain";
  const alignment = (props.alignment as string) || "center";

  const resolvedUrl = parseGifSource(props.url, props.assetId) || "https://media.giphy.com/media/l41lO3n0gIuY7vM0E/giphy.gif";
  const image = useCanvasImage(resolvedUrl);

  const captionH = caption ? 24 : 0;
  const availH = Math.max(20, h - captionH);

  const isClean = variant === "clean";
  const isGold = variant === "gold-border";
  const isGlow = variant === "neon-glow";
  const isVintage = variant === "vintage-frame";
  const isPill = variant === "soft-pill";

  const padding = isClean ? 0 : 8;
  const mediaW = Math.max(10, w - padding * 2);
  const mediaH = Math.max(10, availH - padding * 2);
  const mediaX = padding;
  const mediaY = padding;

  return (
    <Group listening={false}>
      {!isClean && (
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          cornerRadius={isPill ? 999 : isGold ? 12 : isVintage ? 8 : 14}
          fill={
            isGold
              ? "#fffdf7"
              : isVintage
                ? "#faf6ee"
                : isGlow
                  ? "rgba(255, 255, 255, 0.9)"
                  : "#ffffff"
          }
          stroke={
            isGold
              ? "#d4af37"
              : isVintage
                ? "#8b5a2b"
                : isGlow
                  ? "rgba(255, 105, 180, 0.6)"
                  : "rgba(0, 0, 0, 0.08)"
          }
          strokeWidth={isGold ? 2 : isVintage ? 2.5 : 1}
          shadowColor={isGlow ? "#ff69b4" : isGold ? "#d4af37" : "#000000"}
          shadowBlur={isGlow ? 16 : isGold ? 12 : 8}
          shadowOpacity={isGlow ? 0.35 : isGold ? 0.2 : 0.08}
          shadowOffset={{ x: 0, y: isClean ? 0 : 3 }}
        />
      )}

      {image ? (
        (() => {
          const { crop, dest } = fitImage({
            boxWidth: mediaW,
            boxHeight: mediaH,
            imageWidth: image.naturalWidth || mediaW,
            imageHeight: image.naturalHeight || mediaH,
            fit,
            focal: { x: 0.5, y: 0.5 },
          });

          let offsetX = 0;
          if (alignment === "left") {
            offsetX = 0;
          } else if (alignment === "right") {
            offsetX = mediaW - dest.width;
          } else {
            offsetX = (mediaW - dest.width) / 2;
          }

          return (
            <KonvaImage
              image={image}
              crop={crop}
              x={mediaX + offsetX}
              y={mediaY + (mediaH - dest.height) / 2}
              width={dest.width}
              height={dest.height}
              cornerRadius={isClean ? 0 : 6}
            />
          );
        })()
      ) : (
        <Group x={mediaX} y={mediaY}>
          <Rect
            width={mediaW}
            height={mediaH}
            fill="rgba(255, 192, 203, 0.15)"
            cornerRadius={8}
            stroke="rgba(255, 105, 180, 0.3)"
            strokeWidth={1}
            dash={[4, 4]}
          />
          <Text
            x={0}
            y={mediaH / 2 - 12}
            width={mediaW}
            text="✨ GIF"
            fontSize={14}
            fontStyle="bold"
            fill="#db2777"
            align="center"
          />
          <Text
            x={0}
            y={mediaH / 2 + 6}
            width={mediaW}
            text="Animasi Stiker"
            fontSize={9.5}
            fill="#9d174d"
            align="center"
          />
        </Group>
      )}

      {caption ? (
        <Text
          x={6}
          y={availH + 4}
          width={w - 12}
          text={caption}
          fontSize={11}
          fontStyle="500"
          fill={color || "#2b2118"}
          align={alignment}
        />
      ) : null}
    </Group>
  );
}

export function CurrentWidgetVisual({
  element,
  tokens,
  variables,
  guestPreviewName,
}: {
  element: WidgetElement;
  tokens?: ThemeTokens;
  variables?: readonly VariableDefinition[];
  guestPreviewName?: string;
}) {
  switch (element.widgetType) {
    case "countdown":
      return <CountdownVisual element={element} tokens={tokens} variables={variables} />;
    case "map":
      return <MapVisual element={element} tokens={tokens} variables={variables} />;
    case "guestGreeting":
      return <GreetingVisual element={element} tokens={tokens} guestPreviewName={guestPreviewName} />;
    case "rsvp":
      return <RsvpVisual element={element} tokens={tokens} />;
    case "gift":
      return <GiftVisual element={element} tokens={tokens} variables={variables} />;
    case "music":
      return <MusicVisual element={element} tokens={tokens} variables={variables} />;
    case "gallery":
      return <GalleryVisual element={element} tokens={tokens} variables={variables} />;
    case "photoFrame":
      return <PhotoFrameVisual element={element} tokens={tokens} variables={variables} />;
    case "timeline":
      return <TimelineVisual element={element} tokens={tokens} />;
    case "wishes":
      return <WishesVisual element={element} tokens={tokens} />;
    case "coupleProfile":
      return <CoupleProfileVisual element={element} tokens={tokens} />;
    case "ornamentFrame":
      return <OrnamentFrameVisual element={element} tokens={tokens} variables={variables} />;
    case "video":
      return <VideoVisual element={element} tokens={tokens} variables={variables} />;
    case "gif":
      return <GifVisual element={element} tokens={tokens} />;
    default:
      return null;
  }
}
