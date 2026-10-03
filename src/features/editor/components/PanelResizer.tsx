"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { PANEL_LIMITS, panelLayoutStore, type PanelSide } from "../core/panel-layout";
import styles from "./editor.module.css";

const KEY_STEP = 16;

/**
 * Drag handle between a side panel and the artboard (WAI-ARIA window splitter).
 * Drag to resize, arrow keys for ±16 px, Home/End for min/max, double-click to reset.
 */
export function PanelResizer({ side, width }: { side: PanelSide; width: number }) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const limits = PANEL_LIMITS[side];
  // Left panel grows when dragging right; right panel grows when dragging left.
  const direction = side === "left" ? 1 : -1;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width };
    document.body.dataset.panelResizing = "true";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    panelLayoutStore.set(side, state.startWidth + (event.clientX - state.startX) * direction);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    delete document.body.dataset.panelResizing;
    panelLayoutStore.persist();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = width - KEY_STEP * direction;
    else if (event.key === "ArrowRight") next = width + KEY_STEP * direction;
    else if (event.key === "Home") next = limits.min;
    else if (event.key === "End") next = limits.max;
    else if (event.key === "Enter") next = limits.def;
    if (next === null) return;
    event.preventDefault();
    panelLayoutStore.set(side, next);
    panelLayoutStore.persist();
  };

  const label = side === "left" ? "Ubah lebar panel kiri" : "Ubah lebar panel kanan";

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      tabIndex={0}
      title={`${label} (tarik; klik ganda untuk reset)`}
      className={styles.resizer}
      data-side={side}
      data-testid={`resizer-${side}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => {
        panelLayoutStore.set(side, limits.def);
        panelLayoutStore.persist();
      }}
      onKeyDown={onKeyDown}
    />
  );
}
