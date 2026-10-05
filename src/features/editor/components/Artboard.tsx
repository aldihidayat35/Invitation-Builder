"use client";

import { useEffect, useRef, useState } from "react";
import { CANONICAL_BASE_WIDTH } from "@/lib/schema";
import { getSectionTransitionMeta, getSectionTransitionStyles } from "@/features/animations/section-transitions";
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
  const [previewState, setPreviewState] = useState<{ sectionId: string; visible: boolean } | null>(null);

  // Listen to custom section transition preview trigger
  useEffect(() => {
    let animFrame: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ sectionId: string }>;
      const targetId = custom.detail?.sectionId;
      if (!targetId) return;

      const targetSection = store.getState().history.present.sections.find((s) => s.id === targetId);
      if (!targetSection) return;

      if (animFrame) cancelAnimationFrame(animFrame);
      if (timer) clearTimeout(timer);

      // First hide it to setup entrance transform
      setPreviewState({ sectionId: targetId, visible: false });

      animFrame = requestAnimationFrame(() => {
        setPreviewState({ sectionId: targetId, visible: true });
      });

      const totalDuration = (targetSection.transition?.durationMs ?? 700) + (targetSection.transition?.delayMs ?? 0) + 150;
      timer = setTimeout(() => {
        setPreviewState(null);
      }, Math.max(totalDuration, 600));
    };

    window.addEventListener("dib:preview-section-transition", handler);
    return () => {
      window.removeEventListener("dib:preview-section-transition", handler);
      if (animFrame) cancelAnimationFrame(animFrame);
      if (timer) clearTimeout(timer);
    };
  }, [store]);

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
  const artboardMode = useEditor((s) => s.artboardMode);

  return (
    <div
      ref={scrollRef}
      className={styles.artboardScroll}
      data-pan={panMode}
      data-testid="artboard"
      data-zoom={zoom}
    >
      <div
        className={styles.artboardInner}
        data-mode={artboardMode}
        style={artboardMode === "seamless" ? { width: CANONICAL_BASE_WIDTH * zoom } : undefined}
      >
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
          const sectionWidth = CANONICAL_BASE_WIDTH * zoom;
          return (
            <div key={section.id} style={{ display: "contents" }}>
              <section
                className={styles.sectionCard}
                data-testid={`section-${section.id}`}
                data-active={active}
                aria-label={sectionLabel(doc, section.id)}
                style={{ width: sectionWidth }}
              >
                <div className={styles.sectionHead} data-active={active}>
                  <div className={styles.sectionHeadLeft}>
                    <span className={styles.sectionIndexBadge}>#{index + 1}</span>
                    <button
                      type="button"
                      className={styles.sectionTitle}
                      onClick={() => store.getState().setActiveSection(section.id)}
                      title={sectionLabel(doc, section.id)}
                    >
                      {section.name || `Section ${index + 1}`}
                    </button>
                    <span className={styles.sectionDimBadge}>
                      {section.baseHeight}px
                    </span>
                    {section.transition?.type && section.transition.type !== "none" ? (
                      <span
                        className={styles.sectionTransBadge}
                        title={`Transisi: ${getSectionTransitionMeta(section.transition.type).label}`}
                        data-testid={`section-trans-badge-${section.id}`}
                      >
                        ⚡ {getSectionTransitionMeta(section.transition.type).label}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.sectionActions}>
                    <button
                      type="button"
                      className={`${styles.layerToggle} ${styles.secActionBtn}`}
                      aria-label={artboardMode === "grid" ? "Pindah section ke kiri" : "Pindah section ke atas"}
                      title={artboardMode === "grid" ? "Geser ke Kiri" : "Naik"}
                      disabled={readOnly || index === 0}
                      data-testid={`section-up-${section.id}`}
                      onClick={() => store.getState().moveSection(section.id, -1)}
                    >
                      {artboardMode === "grid" ? "◀" : "▲"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.layerToggle} ${styles.secActionBtn}`}
                      aria-label={artboardMode === "grid" ? "Pindah section ke kanan" : "Pindah section ke bawah"}
                      title={artboardMode === "grid" ? "Geser ke Kanan" : "Turun"}
                      disabled={readOnly || index === last}
                      data-testid={`section-down-${section.id}`}
                      onClick={() => store.getState().moveSection(section.id, 1)}
                    >
                      {artboardMode === "grid" ? "▶" : "▼"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.layerToggle} ${styles.secActionBtn}`}
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
                      className={`${styles.layerToggle} ${styles.secActionBtn}`}
                      data-danger="true"
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
                      className={`${styles.layerToggle} ${styles.secActionBtn}`}
                      aria-label={artboardMode === "grid" ? "Tambah section setelah ini" : "Tambah section di bawah"}
                      title={artboardMode === "grid" ? "Tambah section berikutnya" : "Tambah di bawah"}
                      disabled={readOnly}
                      data-testid={`section-add-${section.id}`}
                      onClick={() => store.getState().addSection(section.id)}
                    >
                      ＋
                    </button>
                  </div>
                </div>

                <div
                  className={styles.canvasFrame}
                  data-active={active}
                  data-testid={`canvas-${section.id}`}
                  style={{
                    width: sectionWidth,
                    height: section.baseHeight * zoom,
                    ...(previewState?.sectionId === section.id
                      ? getSectionTransitionStyles(section.transition, previewState.visible)
                      : {}),
                  }}
                >
                  <SectionCanvasLazy sectionId={section.id} />
                </div>
              </section>

              {artboardMode === "cards" && index < last ? (
                <div className={styles.interSectionDivider} title="Sisipkan section di sini">
                  <div className={styles.interLine} />
                  <button
                    type="button"
                    className={styles.interAddBtn}
                    disabled={readOnly}
                    onClick={() => store.getState().addSection(section.id)}
                    title="Tambah section di sini"
                  >
                    <span>＋</span> Sisipkan Section
                  </button>
                  <div className={styles.interLine} />
                </div>
              ) : null}
            </div>
          );
        })}

        {artboardMode === "grid" && !readOnly ? (
          <div
            className={styles.addSectionGridCard}
            style={{
              width: CANONICAL_BASE_WIDTH * zoom,
              minHeight: 280 * zoom,
            }}
          >
            <button
              type="button"
              className={styles.addSectionGridButton}
              data-testid="add-section-grid"
              onClick={() => store.getState().addSection()}
              title="Tambah section baru di akhir kanvas"
            >
              <div className={styles.addSectionGridIcon}>＋</div>
              <span className={styles.addSectionGridLabel}>Tambah Section Baru</span>
              <span className={styles.addSectionGridSub}>Section #{doc.sections.length + 1}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
