"use client";

import { useMemo, useState } from "react";
import { animationPresetRegistry, buildDefaultTrack } from "@/features/animations";
import { ANIMATION_EASINGS, type AnimationTrack, type Element } from "@/lib/schema";
import { useEditorStore } from "./EditorProvider";
import { NumberField, SelectField } from "./fields";
import { IconPlay, IconReplay, IconTrash } from "./icons";
import { AnimationPresetIcon } from "./AnimationIcon";
import styles from "./editor.module.css";

export interface AnimationPanelProps {
  readonly element: Element;
  readonly readOnly: boolean;
  readonly sectionId: string;
}

export type AnimationTabType = "enter" | "exit" | "attention";

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
  exit: {
    id: "exit",
    label: "Keluar (Out)",
    description: "Animasi saat elemen keluar atau menghilang dari pandangan layar.",
  },
  attention: {
    id: "attention",
    label: "Lain-lain (Efek)",
    description: "Efek animasi kontinu atau penekanan berulang (looping/perhatian).",
  },
};

const TABS: readonly TabDefinition[] = [TAB_DEFS.enter, TAB_DEFS.exit, TAB_DEFS.attention];

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
  const [activeTab, setActiveTab] = useState<AnimationTabType>(() => {
    if (element.animations?.enter) return "enter";
    if (element.animations?.attention) return "attention";
    if (element.animations?.exit) return "exit";
    return "enter";
  });

  const isText = element.type === "text";
  const enterTrack = element.animations?.enter;
  const exitTrack = element.animations?.exit;
  const attentionTrack = element.animations?.attention;

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
    return animationPresetRegistry.listForElement(element.type, "attention");
  }, [activeTab, element.type, isText]);

  const act = () => store.getState();

  const handlePresetSelect = (presetId: string) => {
    if (readOnly) return;

    if (!presetId) {
      // Clear this track
      act().patchElement(element.id, (el) => {
        const nextAnims = { ...el.animations };
        delete nextAnims[activeTab];
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

    act().patchElement(element.id, (el) => ({
      ...el,
      animations: {
        ...el.animations,
        [activeTab]: newTrack,
      },
    }));

    // Dispatch instant replay for immediate visual feedback on the canvas
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dib:replay-animation", {
          detail: { elementId: element.id, sectionId, trackType: activeTab },
        }),
      );
    }
  };

  const patchTrack = (patch: Partial<AnimationTrack>) => {
    if (!currentTrack || readOnly) return;
    act().patchElement(element.id, (el) => {
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

  const handleReplayElement = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dib:replay-animation", {
          detail: { elementId: element.id, sectionId, trackType: activeTab },
        }),
      );
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
      {/* 3-Part Tabs: Enter, Out, Lain-lain */}
      <div className={styles.animTabs} role="tablist" aria-label="Kategori Animasi">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasTrack =
            tab.id === "enter"
              ? Boolean(enterTrack)
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
          // Clean short display name by removing trailing parenthesis
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
          Belum ada animasi <strong>{currentTabDef.label}</strong>. Klik salah satu kotak di atas
          untuk menerapkan animasi.
        </div>
      )}
    </div>
  );
}
