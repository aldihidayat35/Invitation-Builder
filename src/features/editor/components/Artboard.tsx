"use client";

import { useEffect, useRef } from "react";
import { CANONICAL_BASE_WIDTH } from "@/lib/schema";
import { sectionLabel } from "../core/display";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { SectionCanvasLazy } from "./SectionCanvasLazy";
import styles from "./editor.module.css";

export function Artboard() {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const zoom = useEditor((s) => s.zoom);
  const panMode = useEditor((s) => s.panMode);
  const readOnly = useEditor((s) => s.readOnly);
  const activeSectionId = useEditor((s) => s.activeSectionId);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Ctrl/Cmd + wheel zooms (non-passive so the browser zoom is prevented).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      store.getState().zoomStep(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [store]);

  // Space + drag pans by scrolling the wrapper. Capture phase so Konva never sees the gesture.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let origin: { x: number; y: number; left: number; top: number } | null = null;
    const down = (event: PointerEvent) => {
      if (!store.getState().panMode) return;
      event.preventDefault();
      event.stopPropagation();
      origin = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!origin) return;
      el.scrollLeft = origin.left - (event.clientX - origin.x);
      el.scrollTop = origin.top - (event.clientY - origin.y);
    };
    const up = () => {
      origin = null;
    };
    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [store]);

  const last = doc.sections.length - 1;

  return (
    <div
      ref={scrollRef}
      className={styles.artboardScroll}
      data-pan={panMode}
      data-testid="artboard"
      data-zoom={zoom}
    >
      <div className={styles.artboardInner}>
        {doc.sections.length === 0 ? (
          <div className={styles.empty} data-testid="artboard-empty">
            <p>Belum ada section.</p>
            <button
              type="button"
              className={styles.smallButton}
              disabled={readOnly}
              data-testid="add-section-empty"
              onClick={() => store.getState().addSection()}
            >
              Tambah section
            </button>
          </div>
        ) : null}

        {doc.sections.map((section, index) => {
          const active = section.id === activeSectionId;
          return (
            <section
              key={section.id}
              className={styles.sectionCard}
              data-testid={`section-${section.id}`}
              data-active={active}
              aria-label={sectionLabel(doc, section.id)}
            >
              <div className={styles.sectionHead} data-active={active}>
                <button
                  type="button"
                  className={styles.sectionTitle}
                  onClick={() => store.getState().setActiveSection(section.id)}
                >
                  {sectionLabel(doc, section.id)} · {CANONICAL_BASE_WIDTH}×{section.baseHeight}
                </button>
                <button
                  type="button"
                  className={styles.layerToggle}
                  aria-label="Pindah section ke atas"
                  title="Naik"
                  disabled={readOnly || index === 0}
                  data-testid={`section-up-${section.id}`}
                  onClick={() => store.getState().moveSection(section.id, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className={styles.layerToggle}
                  aria-label="Pindah section ke bawah"
                  title="Turun"
                  disabled={readOnly || index === last}
                  data-testid={`section-down-${section.id}`}
                  onClick={() => store.getState().moveSection(section.id, 1)}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className={styles.layerToggle}
                  aria-label="Duplikasi section"
                  title="Duplikasi"
                  disabled={readOnly}
                  data-testid={`section-duplicate-${section.id}`}
                  onClick={() => store.getState().duplicateSection(section.id)}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className={styles.layerToggle}
                  aria-label="Hapus section"
                  title="Hapus"
                  disabled={readOnly || doc.sections.length <= 1}
                  data-testid={`section-delete-${section.id}`}
                  onClick={() => store.getState().deleteSection(section.id)}
                >
                  ✕
                </button>
                <button
                  type="button"
                  className={styles.layerToggle}
                  aria-label="Tambah section di bawah"
                  title="Tambah di bawah"
                  disabled={readOnly}
                  data-testid={`section-add-${section.id}`}
                  onClick={() => store.getState().addSection(section.id)}
                >
                  ＋
                </button>
              </div>
              <div
                className={styles.canvasFrame}
                data-active={active}
                data-testid={`canvas-${section.id}`}
                style={{ width: CANONICAL_BASE_WIDTH * zoom, height: section.baseHeight * zoom }}
              >
                <SectionCanvasLazy sectionId={section.id} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
