"use client";

import dynamic from "next/dynamic";
import type { SectionCanvasProps } from "./SectionCanvas";

/** Konva needs the browser; load it client-side only. */
export const SectionCanvasLazy = dynamic<SectionCanvasProps>(() => import("./SectionCanvas"), {
  ssr: false,
  loading: () => null,
});
