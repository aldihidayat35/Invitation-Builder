import type { CSSProperties, ReactNode } from "react";
import { CANONICAL_BASE_WIDTH, TARGET_VIEWPORT_MAX } from "@/lib/schema/constants";
import type { RuntimeMode } from "../types";
import styles from "./RendererViewport.module.css";

export interface RendererViewportProps {
  readonly runtimeMode: RuntimeMode;
  readonly children: ReactNode;
}

/**
 * Root DOM container of the public/preview runtime (P-04, AC-11).
 *
 * Fase 0: only establishes an isolated, DOM-based mobile container driven by
 * the canonical constants. Section scaling (clamp(viewport/390)) is
 * implemented in Fase 9 — this component must never render a <canvas>.
 */
export function RendererViewport({ runtimeMode, children }: RendererViewportProps) {
  const vars = {
    "--dib-base-width": `${CANONICAL_BASE_WIDTH}px`,
    "--dib-max-width": `${TARGET_VIEWPORT_MAX}px`,
  } as CSSProperties;

  return (
    <div
      className={styles.viewport}
      style={vars}
      data-renderer="html"
      data-runtime-mode={runtimeMode}
      data-base-width={CANONICAL_BASE_WIDTH}
    >
      {children}
    </div>
  );
}
