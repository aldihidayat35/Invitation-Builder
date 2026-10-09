"use client";

import { useMemo, useState } from "react";
import {
  animationPresetRegistry,
  buildDefaultMotionTrack,
  buildDefaultTrack,
} from "@/features/animations";
import {
  ANIMATION_EASINGS,
  type AnimationTrack,
  type Element,
  type MotionPathShape,
  type MotionTrack,
} from "@/lib/schema";
import { useEditor, useEditorStore } from "./EditorProvider";
import { NumberField, SelectField } from "./fields";
import { IconGroup, IconPlay, IconPlus, IconReplay, IconReverse, IconTrash } from "./icons";
import { AnimationPresetIcon } from "./AnimationIcon";
import styles from "./editor.module.css";

export interface AnimationPanelProps {
  readonly element: Element;
  readonly readOnly: boolean;
  readonly sectionId: string;
}

export type AnimationTabType = "enter" | "motion" | "attention" | "exit";

interface TabDefinition {
  readonly id: AnimationTabType;
  readonly label: string;
  readonly description: string;
}

const TAB_DEFS: Record<AnimationTabType, TabDefinition> = {
  enter: {
    id: "enter",
    label: "Masuk (Enter)",
    description: "Animasi saat elemen pertama kali muncul di layar pengguna.",
  },
  motion: {
    id: "motion",
    label: "Gerakan (Motion)",
    description: "Jalur perpindahan posisi objek (arah, titik waypoints, lengkungan).",
  },
  attention: {
    id: "attention",
    label: "Lain-lain (Efek)",
    description: "Efek animasi kontinu atau penekanan berulang (looping/perhatian).",
  },
  exit: {
    id: "exit",
    label: "Keluar (Out)",
    description: "Animasi saat elemen keluar atau menghilang dari pandangan layar.",
  },
};

const TABS: readonly TabDefinition[] = [
  TAB_DEFS.enter,
  TAB_DEFS.motion,
  TAB_DEFS.attention,
  TAB_DEFS.exit,
];

const TRIGGER_OPTIONS_ENTER = [
  { value: "onEnterViewport", label: "Saat masuk layar (onEnterViewport)" },
  { value: "onLoad", label: "Saat halaman dimuat (onLoad)" },
  { value: "onClick", label: "Saat diklik (onClick)" },
] as const;

const TRIGGER_OPTIONS_EXIT = [
  { value: "onExitViewport", label: "Saat keluar layar (onExitViewport)" },
  { value: "onClick", label: "Saat diklik (onClick)" },
] as const;

const TRIGGER_OPTIONS_ATTENTION = [
  { value: "onEnterViewport", label: "Saat masuk layar (onEnterViewport)" },
  { value: "onLoad", label: "Saat halaman dimuat (onLoad)" },
  { value: "whileVisible", label: "Selama tampak di layar (whileVisible)" },
  { value: "afterEnter", label: "Setelah animasi masuk (afterEnter)" },
] as const;

const TRIGGER_OPTIONS_MOTION = [
  { value: "onEnterViewport", label: "Saat masuk layar (onEnterViewport)" },
  { value: "onLoad", label: "Saat halaman dimuat (onLoad)" },
  { value: "whileVisible", label: "Selama tampak di layar (whileVisible)" },
  { value: "onClick", label: "Saat diklik (onClick)" },
] as const;

const PATH_SHAPE_OPTIONS: readonly { value: MotionPathShape; label: string }[] = [
  { value: "linear", label: "Lurus (Linear)" },
  { value: "curved", label: "Melengkung Halus (Curved Spline)" },
  { value: "arcUp", label: "Busur Melengkung ke Atas (Arc Up)" },
  { value: "arcDown", label: "Busur Melengkung ke Bawah (Arc Down)" },
  { value: "wave", label: "Gelombang Berayun (Wave S-Curve)" },
  { value: "circle", label: "Melingkar / Orbit (Circle)" },
  { value: "zigzag", label: "Zig-zag" },
  { value: "custom", label: "Kustom Titik-titik" },
];

const EASING_OPTIONS = ANIMATION_EASINGS.map((e) => ({
  value: e,
  label: e,
}));

const STAGGER_OPTIONS = [
  { value: "none", label: "Tidak ada (Utuh)" },
  { value: "char", label: "Per Karakter / Huruf (char)" },
  { value: "word", label: "Per Kata (word)" },
] as const;

export function AnimationPanel({ element, readOnly, sectionId }: AnimationPanelProps) {
  const store = useEditorStore();
  const liveElement = useEditor((s) => {
    for (const sec of s.history.present.sections) {
      const found = sec.elements.find((e) => e.id === element.id);
      if (found) return found;
    }
    return element;
  });

  const [activeTab, setActiveTab] = useState<AnimationTabType>(() => {
    if (element.animations?.motion) return "motion";
    if (element.animations?.enter) return "enter";
    if (element.animations?.attention) return "attention";
    if (element.animations?.exit) return "exit";
    return "enter";
  });

  const isText = liveElement.type === "text";
  const enterTrack = liveElement.animations?.enter;
  const exitTrack = liveElement.animations?.exit;
  const attentionTrack = liveElement.animations?.attention;
  const motionTrack = liveElement.animations?.motion;
  const editingMotion = useEditor((s) => s.editingMotion);
  const isEditingThisMotion = editingMotion?.elementId === element.id;

  const currentTrack: AnimationTrack | undefined =
    activeTab === "enter" ? enterTrack : activeTab === "exit" ? exitTrack : attentionTrack;

  const availablePresets = useMemo(() => {
    if (activeTab === "enter") {
      const enterList = animationPresetRegistry.listForElement(element.type, "enter");
      const textList = isText ? animationPresetRegistry.listForElement(element.type, "text") : [];
      return [...enterList, ...textList];
    }
    if (activeTab === "exit") {
      return animationPresetRegistry.listForElement(element.type, "exit");
    }
    if (activeTab === "attention") {
      return animationPresetRegistry.listForElement(element.type, "attention");
    }
    return [];
  }, [activeTab, element.type, isText]);

  const doc = useEditor((s) => s.history.present);
  const targetGroupId = liveElement.groupId;
  const groupElements = useMemo(() => {
    if (!targetGroupId) return [liveElement];
    return (
      doc.sections
        .find((s) => s.id === sectionId)
        ?.elements.filter((el) => el.groupId === targetGroupId) ?? [liveElement]
    );
  }, [doc.sections, sectionId, targetGroupId, liveElement]);

  const act = () => store.getState();

  const patchTargets = (fn: (el: Element) => Element) => {
    if (targetGroupId) {
      for (const targetEl of groupElements) {
        act().patchElement(targetEl.id, fn);
      }
    } else {
      act().patchElement(element.id, fn);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    if (readOnly) return;

    if (!presetId) {
      // Clear this track
      patchTargets((el) => {
        const nextAnims = { ...el.animations };
        if (activeTab !== "motion") {
          delete nextAnims[activeTab];
        }
        const hasAny = Object.keys(nextAnims).length > 0;
        return {
          ...el,
          animations: hasAny ? nextAnims : undefined,
        };
      });
      return;
    }

    const defaultTrigger =
      activeTab === "exit"
        ? "onExitViewport"
        : activeTab === "attention"
          ? "whileVisible"
          : "onEnterViewport";

    const newTrack = buildDefaultTrack({
      presetId,
      trigger: currentTrack?.trigger ?? defaultTrigger,
    });

    patchTargets((el) => ({
      ...el,
      animations: {
        ...el.animations,
        [activeTab]: newTrack,
      },
    }));

    // Dispatch instant replay for immediate visual feedback on the canvas
    if (typeof window !== "undefined") {
      const targets = targetGroupId ? groupElements : [element];
      for (const targetEl of targets) {
        window.dispatchEvent(
          new CustomEvent("dib:replay-animation", {
            detail: { elementId: targetEl.id, sectionId, trackType: activeTab },
          }),
        );
      }
    }
  };

  const patchTrack = (patch: Partial<AnimationTrack>) => {
    if (!currentTrack || readOnly || activeTab === "motion") return;
    patchTargets((el) => {
      const trackToPatch = el.animations?.[activeTab];
      if (!trackToPatch) return el;
      return {
        ...el,
        animations: {
          ...el.animations,
          [activeTab]: {
            ...trackToPatch,
            ...patch,
          },
        },
      };
    });
  };

  // ------------------------------------------------------------- Motion handlers
  const patchMotion = (patch: Partial<MotionTrack>) => {
    if (readOnly) return;
    patchTargets((el) => {
      const current = el.animations?.motion ?? buildDefaultMotionTrack();
      const updated: MotionTrack = {
        ...current,
        ...patch,
      };
      return {
        ...el,
        animations: {
          ...el.animations,
          motion: updated,
        },
      };
    });
  };

  const handleToggleCustomMotion = () => {
    if (readOnly) return;
    if (motionTrack?.enabled) {
      if (isEditingThisMotion) {
        store.getState().setEditingMotion(null);
      }
      act().patchElement(element.id, (el) => {
        const next = { ...el.animations };
        delete next.motion;
        const hasAny = Object.keys(next).length > 0;
        return {
          ...el,
          animations: hasAny ? next : undefined,
        };
      });
    } else {
      store.getState().setEditingMotion({ sectionId, elementId: element.id });
    }
  };

  const handleToggleCanvasEdit = () => {
    if (readOnly) return;
    if (isEditingThisMotion) {
      store.getState().setEditingMotion(null);
    } else {
      store.getState().setEditingMotion({ sectionId, elementId: element.id });
    }
  };

  const handleRemoveMotion = () => {
    if (readOnly) return;
    if (isEditingThisMotion) {
      store.getState().setEditingMotion(null);
    }
    patchTargets((el) => {
      const next = { ...el.animations };
      delete next.motion;
      const hasAny = Object.keys(next).length > 0;
      return {
        ...el,
        animations: hasAny ? next : undefined,
      };
    });
  };

  const handleUpdateWaypoint = (index: number, key: "x" | "y", val: number) => {
    if (!motionTrack || readOnly) return;
    if (index === motionTrack.points.length - 1) return; // End point is locked at (0, 0)
    const pts = [...motionTrack.points];
    if (pts[index]) {
      pts[index] = { ...pts[index], [key]: val };
      pts[pts.length - 1] = { x: 0, y: 0 };
      patchMotion({
        points: pts,
        preset: "custom",
      });
    }
  };

  const handleAddWaypoint = () => {
    if (!motionTrack || readOnly) return;
    const pts = [...motionTrack.points];
    if (pts.length >= 20) return;
    const pPrev = pts[pts.length - 2] ?? { x: -80, y: 0 };
    const pLast = { x: 0, y: 0 };
    const newPt = {
      x: Math.round((pPrev.x + pLast.x) / 2),
      y: Math.round((pPrev.y + pLast.y) / 2),
    };
    pts.splice(pts.length - 1, 0, newPt);
    pts[pts.length - 1] = { x: 0, y: 0 };
    patchMotion({ points: pts, preset: "custom" });
  };

  const handleRemoveWaypoint = (index: number) => {
    if (!motionTrack || readOnly) return;
    if (motionTrack.points.length <= 2) return;
    if (index === motionTrack.points.length - 1) return; // Cannot remove end point
    const pts = motionTrack.points.filter((_, i) => i !== index);
    pts[pts.length - 1] = { x: 0, y: 0 };
    patchMotion({ points: pts, preset: "custom" });
  };

  const handleReverseMotion = () => {
    if (!motionTrack || readOnly) return;
    const reversed = motionTrack.points.map((p, idx, arr) => {
      if (idx === arr.length - 1) return { x: 0, y: 0 };
      return { x: -p.x, y: -p.y };
    });
    reversed[reversed.length - 1] = { x: 0, y: 0 };
    patchMotion({ points: reversed, preset: "custom" });
  };

  const handleReplayMotion = () => {
    if (typeof window !== "undefined") {
      const targets = targetGroupId ? groupElements : [element];
      for (const targetEl of targets) {
        window.dispatchEvent(
          new CustomEvent("dib:replay-animation", {
            detail: { elementId: targetEl.id, sectionId, trackType: "motion" },
          }),
        );
      }
    }
  };

  const handleReplayElement = () => {
    if (typeof window !== "undefined") {
      const targets = targetGroupId ? groupElements : [element];
      for (const targetEl of targets) {
        window.dispatchEvent(
          new CustomEvent("dib:replay-animation", {
            detail: { elementId: targetEl.id, sectionId, trackType: activeTab },
          }),
        );
      }
    }
  };

  const handleReplaySection = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dib:replay-animation", {
          detail: { sectionId, trackType: activeTab },
        }),
      );
    }
  };

  const triggerOptions =
    activeTab === "exit"
      ? TRIGGER_OPTIONS_EXIT
      : activeTab === "attention"
        ? TRIGGER_OPTIONS_ATTENTION
        : TRIGGER_OPTIONS_ENTER;

  const currentTabDef = TAB_DEFS[activeTab];

  return (
    <div className={styles.panelStack} data-testid="animation-inspector">
      {targetGroupId && (
        <div className={styles.groupAnimationBanner} data-testid="group-animation-banner">
          <div className={styles.groupBadge}>
            <IconGroup size={12} />
            <span>Animasi Grup</span>
          </div>
          <span className={styles.groupAnimationHint}>
            Animasi ini diterapkan secara bersamaan ke semua elemen di dalam grup (
            {groupElements.length} elemen).
          </span>
        </div>
      )}

      {/* 4 Tabs: Enter, Motion, Lain-lain (Efek), Out */}
      <div className={styles.animTabs} role="tablist" aria-label="Kategori Animasi">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasTrack =
            tab.id === "enter"
              ? Boolean(enterTrack)
              : tab.id === "motion"
                ? Boolean(motionTrack?.enabled)
                : tab.id === "exit"
                  ? Boolean(exitTrack)
                  : Boolean(attentionTrack);

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.animTab} ${isActive ? styles.animTabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`anim-tab-${tab.id}`}
            >
              {hasTrack && <span className={styles.animTabDot} title="Animasi aktif" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <p className={styles.animTabDesc}>{currentTabDef.description}</p>

      {/* ========================================================================= */}
      {/* TAB: MOTION PATH */}
      {/* ========================================================================= */}
      {activeTab === "motion" ? (
        <div data-testid="motion-tab-content">
          {/* Custom Motion Activation Card */}
          <div className={styles.motionControlCard}>
            <div className={styles.motionControlHeader}>
              <div className={styles.motionControlTitleWrap}>
                <span className={styles.motionControlTitle}>Gerakan Kustom (Custom Motion)</span>
                <span className={styles.motionControlSubtitle}>
                  {motionTrack?.enabled
                    ? "Jalur gerakan bebas aktif"
                    : "Atur pergerakan objek dari titik ke titik"}
                </span>
              </div>
              <button
                type="button"
                className={motionTrack?.enabled ? styles.motionToggleActiveBtn : styles.motionToggleBtn}
                onClick={handleToggleCustomMotion}
                disabled={readOnly}
                data-testid="toggle-custom-motion-btn"
              >
                {motionTrack?.enabled ? "Aktif" : "Aktifkan"}
              </button>
            </div>

            {motionTrack?.enabled && (
              <div className={styles.motionEditActionWrap}>
                <button
                  type="button"
                  className={isEditingThisMotion ? styles.motionCanvasEditBtnActive : styles.motionCanvasEditBtn}
                  onClick={handleToggleCanvasEdit}
                  disabled={readOnly}
                  data-testid="edit-motion-canvas-btn"
                >
                  {isEditingThisMotion ? (
                    <>
                      <span>✓</span>
                      <span>Selesai Edit di Canvas</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>Edit Titik di Canvas (Flash / Animate)</span>
                    </>
                  )}
                </button>
                <p className={styles.motionCanvasHint}>
                  {isEditingThisMotion
                    ? "🎯 Mode Animate Aktif: Canvas terkunci untuk objek lain. Klik & geser titik-titik lingkaran di canvas."
                    : "💡 Klik tombol di atas untuk menggeser langsung titik-titik koordinat pada canvas."}
                </p>
              </div>
            )}
          </div>

          {/* Configuration controls when motion is enabled */}
          {motionTrack?.enabled ? (
            <div className={styles.animConfigSection}>
              {/* Path shape selection */}
              <SelectField
                id="insp-motion-path-shape"
                label="Bentuk Jalur Gerakan"
                value={motionTrack.pathShape}
                options={PATH_SHAPE_OPTIONS}
                disabled={readOnly}
                onChange={(val) => patchMotion({ pathShape: val as MotionPathShape })}
              />

              {/* Curviness control slider & numeric display */}
              <div>
                <label
                  htmlFor="insp-motion-curviness"
                  className={styles.fieldLabel}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Kelengkungan Jalur (Curviness)</span>
                  <span className={styles.motionSliderValue}>{motionTrack.curviness.toFixed(1)}</span>
                </label>
                <div className={styles.motionSliderRow}>
                  <input
                    id="insp-motion-curviness"
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={motionTrack.curviness}
                    disabled={readOnly}
                    className={styles.motionSliderInput}
                    onChange={(e) => patchMotion({ curviness: parseFloat(e.target.value) })}
                    data-testid="motion-curviness-slider"
                  />
                </div>
                <span className={styles.fieldHint}>
                  {motionTrack.curviness === 0
                    ? "Garis lurus kaku antar titik"
                    : motionTrack.curviness <= 1.2
                      ? "Lengkungan kurva halus natural"
                      : "Lengkungan kurva lebar & dramatis"}
                </span>
              </div>

              {/* Waypoints List Editor */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <label className={styles.fieldLabel} style={{ margin: 0 }}>
                    Titik Koordinat Gerakan (Waypoints)
                  </label>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    style={{ padding: "3px 7px", fontSize: 11 }}
                    onClick={handleReverseMotion}
                    disabled={readOnly}
                    title="Balik arah lintasan (tukar posisi awal & akhir)"
                    data-testid="motion-reverse-btn"
                  >
                    <IconReverse size={12} />
                    <span>Balik Arah</span>
                  </button>
                </div>

                <div className={styles.motionWaypointsList}>
                  {motionTrack.points.map((pt, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === motionTrack.points.length - 1;
                    const badgeClass = isStart
                      ? styles.motionPointBadgeStart
                      : isEnd
                        ? styles.motionPointBadgeEnd
                        : styles.motionPointBadgeMid;
                    const label = isStart
                      ? "Titik Awal (Start)"
                      : isEnd
                        ? "Titik Akhir (Tengah Objek)"
                        : `Waypoint ${idx}`;

                    return (
                      <div key={idx} className={styles.motionWaypointCard}>
                        <div className={styles.motionWaypointHeader}>
                          <span className={`${styles.motionPointBadge} ${badgeClass}`}>
                            {label}
                          </span>
                          {!isStart && !isEnd && (
                            <button
                              type="button"
                              className={styles.chipRemove}
                              style={{ padding: "2px 5px", fontSize: 10 }}
                              onClick={() => handleRemoveWaypoint(idx)}
                              disabled={readOnly}
                              title={`Hapus waypoint ${idx}`}
                              data-testid={`motion-remove-point-${idx}`}
                            >
                              <IconTrash size={11} />
                            </button>
                          )}
                        </div>
                        {isEnd ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ color: "#ef4444", fontWeight: 600 }}>🎯 Tengah Objek (0, 0)</span>
                            <span>— Terkunci di pusat objek. Geser objek di canvas untuk memindahkan posisi akhir.</span>
                          </div>
                        ) : (
                          <div className={styles.motionCoordsRow}>
                            <NumberField
                              id={`motion-pt-${idx}-x`}
                              label="Geser X (px)"
                              value={pt.x}
                              step={5}
                              min={-3000}
                              max={3000}
                              disabled={readOnly}
                              onCommit={(x) => handleUpdateWaypoint(idx, "x", x)}
                            />
                            <NumberField
                              id={`motion-pt-${idx}-y`}
                              label="Geser Y (px)"
                              value={pt.y}
                              step={5}
                              min={-3000}
                              max={3000}
                              disabled={readOnly}
                              onCommit={(y) => handleUpdateWaypoint(idx, "y", y)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className={styles.motionAddBtn}
                    onClick={handleAddWaypoint}
                    disabled={readOnly || motionTrack.points.length >= 20}
                    data-testid="motion-add-point-btn"
                  >
                    <IconPlus size={13} />
                    <span>+ Tambah Titik Waypoint</span>
                  </button>
                </div>
              </div>

              {/* Timing & Duration Controls */}
              <div className={styles.grid2}>
                <NumberField
                  id="insp-motion-duration"
                  label="Durasi Gerakan (ms)"
                  value={motionTrack.durationMs}
                  min={100}
                  max={30000}
                  step={100}
                  disabled={readOnly}
                  onCommit={(durationMs) => patchMotion({ durationMs })}
                />
                <NumberField
                  id="insp-motion-delay"
                  label="Jeda/Delay (ms)"
                  value={motionTrack.delayMs}
                  min={0}
                  max={30000}
                  step={50}
                  disabled={readOnly}
                  onCommit={(delayMs) => patchMotion({ delayMs })}
                />
              </div>

              <div className={styles.grid2}>
                <SelectField
                  id="insp-motion-easing"
                  label="Kurva Easing"
                  value={motionTrack.easing}
                  options={EASING_OPTIONS}
                  disabled={readOnly}
                  onChange={(easing) => patchMotion({ easing })}
                />
                <SelectField
                  id="insp-motion-repeat"
                  label="Pengulangan (Loop)"
                  value={
                    motionTrack.repeat === -1
                      ? "infinite"
                      : motionTrack.yoyo
                        ? "yoyo"
                        : "once"
                  }
                  options={[
                    { value: "once", label: "Putar Sekali" },
                    { value: "yoyo", label: "Bolak-balik (Yoyo)" },
                    { value: "infinite", label: "Terus-menerus (Loop)" },
                  ]}
                  disabled={readOnly}
                  onChange={(val) => {
                    if (val === "infinite") {
                      patchMotion({ repeat: -1, yoyo: false });
                    } else if (val === "yoyo") {
                      patchMotion({ repeat: -1, yoyo: true });
                    } else {
                      patchMotion({ repeat: 0, yoyo: false });
                    }
                  }}
                />
              </div>

              <SelectField
                id="insp-motion-trigger"
                label="Pemicu Gerakan (Trigger)"
                value={motionTrack.trigger}
                options={TRIGGER_OPTIONS_MOTION}
                disabled={readOnly}
                onChange={(trigger) =>
                  patchMotion({ trigger: trigger as MotionTrack["trigger"] })
                }
              />

              <label className={styles.checkRow}>
                <input
                  id="insp-motion-autorotate"
                  type="checkbox"
                  checked={motionTrack.autoRotate}
                  disabled={readOnly}
                  onChange={(e) => patchMotion({ autoRotate: e.target.checked })}
                  data-testid="motion-autorotate-check"
                />
                Putar rotasi objek mengikuti lekukan arah jalur
              </label>

              {/* Action Buttons: Preview Motion & Remove */}
              <div className={styles.buttonRow2}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={handleReplayMotion}
                  title="Putar preview animasi gerakan elemen ini di canvas"
                  data-testid="replay-motion-btn"
                >
                  <IconPlay size={13} />
                  Putar Preview Gerakan
                </button>
              </div>

              <button
                type="button"
                className={styles.chipRemove}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
                onClick={handleRemoveMotion}
                disabled={readOnly}
                title="Hapus animasi gerakan elemen ini"
                data-testid="remove-motion-btn"
              >
                <IconTrash size={12} />
                Hapus Gerakan
              </button>
            </div>
          ) : (
            <div className={styles.animEmptyNotice}>
              Belum ada animasi <strong>Gerakan (Motion Path)</strong>. Klik tombol{" "}
              <strong>Aktifkan</strong> di atas untuk membuat objek bergerak dan mengatur jalur
              geraknya secara visual.
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TABS: ENTER / EXIT / ATTENTION */
        /* ========================================================================= */
        <div>
          {/* Selectable Box / Widget Cards Grid */}
          <div
            className={styles.animGrid}
            role="group"
            aria-label={`Pilihan Animasi ${currentTabDef.label}`}
          >
            {/* Box: Tanpa Animasi */}
            <button
              type="button"
              className={`${styles.animBox} ${!currentTrack ? styles.animBoxActive : ""}`}
              onClick={() => handlePresetSelect("")}
              disabled={readOnly}
              aria-pressed={!currentTrack}
              title="Tanpa animasi untuk kategori ini"
              data-testid="preset-box-none"
            >
              {!currentTrack && (
                <span className={styles.animBoxCheck} aria-hidden="true">
                  ✓
                </span>
              )}
              <span className={styles.animBoxIcon}>
                <AnimationPresetIcon presetId="none" size={24} />
              </span>
              <span className={styles.animBoxLabel}>Tanpa Animasi</span>
            </button>

            {/* Preset Boxes */}
            {availablePresets.map((preset) => {
              const isSelected = currentTrack?.presetId === preset.id;
              const shortName = preset.label.replace(/\s*\([^)]*\)/, "");

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.animBox} ${isSelected ? styles.animBoxActive : ""}`}
                  onClick={() => handlePresetSelect(preset.id)}
                  disabled={readOnly}
                  aria-pressed={isSelected}
                  title={`${preset.label} — ${preset.description}`}
                  data-testid={`preset-box-${preset.id}`}
                >
                  {isSelected && (
                    <span className={styles.animBoxCheck} aria-hidden="true">
                      ✓
                    </span>
                  )}
                  <span className={styles.animBoxIcon}>
                    <AnimationPresetIcon presetId={preset.id} size={24} />
                  </span>
                  <span className={styles.animBoxLabel}>{shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Animation Parameters Controls (Visible when a preset is chosen) */}
          {currentTrack ? (
            <div className={styles.animConfigSection}>
              <SelectField
                id={`insp-anim-trigger-${activeTab}`}
                label="Pemicu (Trigger)"
                value={currentTrack.trigger}
                options={triggerOptions}
                disabled={readOnly}
                onChange={(trigger) => patchTrack({ trigger })}
              />

              <div className={styles.grid2}>
                <NumberField
                  id={`insp-anim-duration-${activeTab}`}
                  label="Durasi (ms)"
                  value={currentTrack.durationMs}
                  min={50}
                  max={10000}
                  step={50}
                  disabled={readOnly}
                  onCommit={(durationMs) => patchTrack({ durationMs })}
                />
                <NumberField
                  id={`insp-anim-delay-${activeTab}`}
                  label="Jeda/Delay (ms)"
                  value={currentTrack.delayMs}
                  min={0}
                  max={30000}
                  step={50}
                  disabled={readOnly}
                  onCommit={(delayMs) => patchTrack({ delayMs })}
                />
              </div>

              <SelectField
                id={`insp-anim-easing-${activeTab}`}
                label="Kurva Easing"
                value={currentTrack.easing}
                options={EASING_OPTIONS}
                disabled={readOnly}
                onChange={(easing) => patchTrack({ easing })}
              />

              {isText && activeTab === "enter" ? (
                <div className={styles.grid2}>
                  <SelectField
                    id="insp-anim-stagger-unit"
                    label="Stagger Teks"
                    value={currentTrack.staggerUnit}
                    options={STAGGER_OPTIONS}
                    disabled={readOnly}
                    onChange={(staggerUnit) => patchTrack({ staggerUnit })}
                  />
                  <NumberField
                    id="insp-anim-stagger-ms"
                    label="Jeda Stagger (ms)"
                    value={currentTrack.staggerAmountMs}
                    min={0}
                    max={1000}
                    step={5}
                    disabled={readOnly || currentTrack.staggerUnit === "none"}
                    onCommit={(staggerAmountMs) => patchTrack({ staggerAmountMs })}
                  />
                </div>
              ) : null}

              <label className={styles.checkRow}>
                <input
                  id={`insp-anim-once-${activeTab}`}
                  type="checkbox"
                  checked={currentTrack.once}
                  disabled={readOnly}
                  onChange={(e) => patchTrack({ once: e.target.checked })}
                />
                Putar sekali saja
              </label>

              <div className={styles.buttonRow2}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={handleReplayElement}
                  title={`Putar ulang animasi ${currentTabDef.label} elemen ini di canvas`}
                  data-testid="replay-element-btn"
                >
                  <IconPlay size={13} />
                  Putar elemen
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={handleReplaySection}
                  title="Putar ulang semua animasi di section ini"
                  data-testid="replay-section-btn"
                >
                  <IconReplay size={13} />
                  Putar section
                </button>
              </div>

              <button
                type="button"
                className={styles.chipRemove}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
                onClick={() => handlePresetSelect("")}
                disabled={readOnly}
                title={`Hapus animasi ${currentTabDef.label}`}
              >
                <IconTrash size={12} />
                Hapus animasi {currentTabDef.label}
              </button>
            </div>
          ) : (
            <div className={styles.animEmptyNotice}>
              Belum ada animasi <strong>{currentTabDef.label}</strong>. Klik salah satu kotak di
              atas untuk menerapkan animasi.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
