"use client";

import { useEffect, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type { Element } from "@/lib/schema";
import { assetUrl } from "@/features/assets/urls";
import { defaultWidgetRegistry } from "@/features/widgets";
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
    // A failed load must be retryable later (e.g. upload finished after first attempt).
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

export function WidgetVisual({ element }: { element: WidgetElement }) {
  const { w, h } = element.frame;
  const resolved = defaultWidgetRegistry.resolve(element.widgetType);
  if (resolved.kind === "unknown") {
    return (
      <Placeholder
        w={w}
        h={h}
        title={resolved.fallback.label}
        subtitle={`(${element.widgetType})`}
      />
    );
  }
  const { definition } = resolved;
  const info = definition.placeholder?.(element.props) ?? { title: definition.label };
  return (
    <Placeholder w={w} h={h} title={`${definition.label}`} subtitle={info.subtitle ?? info.title} />
  );
}
