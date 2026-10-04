"use client";

import { useEffect, useState } from "react";

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image failed to load"));
      image.src = src;
    });
    pending.catch(() => imageCache.delete(src));
    imageCache.set(src, pending);
  }
  return pending;
}

/** Loads and caches a browser image for Konva, then refreshes its consumer. */
export function useCanvasImage(src: string | null): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadImage(src).then(
      (image) => {
        if (!cancelled) setLoaded({ src, image });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [src]);

  return loaded?.src === src ? loaded.image : null;
}
