"use client";

import { useMemo } from "react";
import {
  animationPresetRegistry,
  buildDefaultTrack,
} from "@/features/animations";
import {
  ANIMATION_EASINGS,
  type AnimationTrack,
  type Element,
} from "@/lib/schema";
import { useEditorStore } from "./EditorProvider";
import { FieldRow, NumberField, SelectField } from "./fields";
import styles from "./editor.module.css";

export interface AnimationPanelProps {
  readonly element: Element;
  readonly readOnly: boolean;
  readonly sectionId: string;
}

const TRIGGER_OPTIONS = [
  { value: "onEnterViewport", label: "Saat masuk layar (onEnterViewport)" },
  { value: "onLoad", label: "Saat halaman dimuat (onLoad)" },
  { value: "onClick", label: "Saat diklik (onClick)" },
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
  const track = element.animations?.enter;
  const isText = element.type === "text";

  const availablePresets = useMemo(() => {
    return animationPresetRegistry.listForElement(element.type);
  }, [element.type]);

  const presetOptions = useMemo(() => {
    return [
      { value: "", label: "— Tidak ada animasi —" },
      ...availablePresets.map((p) => ({
        value: p.id,
        label: `${p.label} [${p.category}]`,
      })),
    ];
  }, [availablePresets]);

  const act = () => store.getState();

  const handlePresetChange = (presetId: string) => {
    if (!presetId) {
      act().patchElement(element.id, (el) => {
        const next = { ...el };
        delete next.animations;
        return next;
      });
      return;
    }

    const newTrack = buildDefaultTrack({
      presetId,
      trigger: track?.trigger ?? "onEnterViewport",
    });

    act().patchElement(element.id, (el) => ({
      ...el,
      animations: {
        ...el.animations,
        enter: newTrack,
      },
    }));
  };

  const patchTrack = (patch: Partial<AnimationTrack>) => {
    if (!track) return;
    act().patchElement(element.id, (el) => {
      const currentTrack = el.animations?.enter;
      if (!currentTrack) return el;
      return {
        ...el,
        animations: {
          ...el.animations,
          enter: {
            ...currentTrack,
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
          detail: { elementId: element.id, sectionId },
        }),
      );
    }
  };

  const handleReplaySection = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dib:replay-animation", {
          detail: { sectionId },
        }),
      );
    }
  };

  return (
    <div className={styles.subStack} data-testid="animation-inspector">
      <h3 className={styles.subHeading}>Animasi Masuk (Enter Animation)</h3>

      <SelectField
        id="insp-anim-preset"
        label="Preset"
        value={track?.presetId ?? ""}
        options={presetOptions}
        disabled={readOnly}
        onChange={handlePresetChange}
      />

      {track ? (
        <>
          <SelectField
            id="insp-anim-trigger"
            label="Pemicu (Trigger)"
            value={track.trigger}
            options={TRIGGER_OPTIONS}
            disabled={readOnly}
            onChange={(trigger) => patchTrack({ trigger })}
          />

          <div className={styles.grid2}>
            <NumberField
              id="insp-anim-duration"
              label="Durasi (ms)"
              value={track.durationMs}
              min={0}
              max={10000}
              step={50}
              disabled={readOnly}
              onCommit={(durationMs) => patchTrack({ durationMs })}
            />
            <NumberField
              id="insp-anim-delay"
              label="Jeda/Delay (ms)"
              value={track.delayMs}
              min={0}
              max={30000}
              step={50}
              disabled={readOnly}
              onCommit={(delayMs) => patchTrack({ delayMs })}
            />
          </div>

          <SelectField
            id="insp-anim-easing"
            label="Kurva Easing"
            value={track.easing}
            options={EASING_OPTIONS}
            disabled={readOnly}
            onChange={(easing) => patchTrack({ easing })}
          />

          {isText ? (
            <div className={styles.grid2}>
              <SelectField
                id="insp-anim-stagger-unit"
                label="Stagger Teks"
                value={track.staggerUnit}
                options={STAGGER_OPTIONS}
                disabled={readOnly}
                onChange={(staggerUnit) => patchTrack({ staggerUnit })}
              />
              <NumberField
                id="insp-anim-stagger-ms"
                label="Jeda Stagger (ms)"
                value={track.staggerAmountMs}
                min={0}
                max={1000}
                step={5}
                disabled={readOnly || track.staggerUnit === "none"}
                onCommit={(staggerAmountMs) => patchTrack({ staggerAmountMs })}
              />
            </div>
          ) : null}

          <FieldRow label="Hanya Sekali (Once)" htmlFor="insp-anim-once">
            <input
              id="insp-anim-once"
              type="checkbox"
              checked={track.once}
              disabled={readOnly}
              onChange={(e) => patchTrack({ once: e.target.checked })}
            />
          </FieldRow>

          <div className={styles.toolGroup} style={{ marginTop: 8 }}>
            <button
              type="button"
              className={styles.toolButton}
              onClick={handleReplayElement}
              title="Putar ulang animasi elemen ini di artboard"
              data-testid="replay-element-btn"
            >
              ▶ Replay Animasi
            </button>
            <button
              type="button"
              className={styles.toolButton}
              onClick={handleReplaySection}
              title="Putar ulang semua animasi di section ini"
              data-testid="replay-section-btn"
            >
              ⟳ Replay Section
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
