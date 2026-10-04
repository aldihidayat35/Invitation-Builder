"use client";

import { useState } from "react";
import type { Section, SectionTransitionType } from "@/lib/schema";
import {
  EASING_OPTIONS,
  SECTION_TRANSITIONS_CATALOG,
  getSectionTransitionMeta,
} from "@/features/animations/section-transitions";
import { useEditorStore } from "./EditorProvider";
import { NumberField, SelectField } from "./fields";
import { IconCheck, IconPlay, IconReplay } from "./icons";
import { SectionTransitionIcon } from "./SectionTransitionIcon";
import styles from "./editor.module.css";

interface SectionTransitionControlProps {
  readonly section: Section;
  readonly readOnly: boolean;
}

const CATEGORIES = ["Semua", "Dasar", "Geser", "Zoom & 3D", "Sinematik"] as const;

export function SectionTransitionControl({ section, readOnly }: SectionTransitionControlProps) {
  const store = useEditorStore();
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("Semua");
  const [previewing, setPreviewing] = useState(false);

  const transition = section.transition ?? {
    type: "none",
    durationMs: 800,
    delayMs: 0,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    once: false,
  };

  const currentType = transition.type;
  const currentMeta = getSectionTransitionMeta(currentType);

  const filteredPresets =
    activeCategory === "Semua"
      ? SECTION_TRANSITIONS_CATALOG
      : SECTION_TRANSITIONS_CATALOG.filter((t) => t.category === activeCategory);

  function handleSelectType(type: SectionTransitionType) {
    if (readOnly) return;
    store.getState().patchSection(section.id, {
      transition: {
        ...transition,
        type,
      },
    });
  }

  function handlePatch(patch: Partial<typeof transition>) {
    if (readOnly) return;
    store.getState().patchSection(section.id, {
      transition: {
        ...transition,
        ...patch,
      },
    });
  }

  function handlePreview() {
    setPreviewing(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dib:preview-section-transition", {
          detail: { sectionId: section.id, transition },
        }),
      );
    }
    setTimeout(() => setPreviewing(false), (transition.durationMs || 800) + 200);
  }

  return (
    <div className={styles.sectionTransitionWrap} data-testid="section-transition-control">
      {/* Category Tabs */}
      <div className={styles.animCategoryTabs} role="tablist" aria-label="Kategori transisi section">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.animTabBtn} ${isActive ? styles.animTabBtnActive : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Preset Card Grid */}
      <div className={styles.animBoxGrid} role="radiogroup" aria-label="Pilihan transisi section">
        {filteredPresets.map((preset) => {
          const isSelected = currentType === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={readOnly}
              className={`${styles.animBox} ${isSelected ? styles.animBoxActive : ""}`}
              onClick={() => handleSelectType(preset.id)}
              title={`${preset.label}: ${preset.description}`}
              data-testid={`section-trans-${preset.id}`}
            >
              <div className={styles.animBoxIcon}>
                <SectionTransitionIcon transitionType={preset.id} size={22} />
              </div>
              <span className={styles.animBoxLabel}>{preset.label}</span>
              {isSelected ? (
                <span className={styles.animBoxCheck}>
                  <IconCheck size={10} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Configuration Section (when active) */}
      {currentType !== "none" ? (
        <div className={styles.animConfigSection}>
          <div className={styles.transDescBanner}>
            <strong>{currentMeta.label}:</strong> {currentMeta.description}
          </div>

          <div className={styles.grid2}>
            <NumberField
              id="insp-st-duration"
              label="Durasi (ms)"
              value={transition.durationMs}
              min={100}
              max={4000}
              step={50}
              disabled={readOnly}
              onCommit={(durationMs) => handlePatch({ durationMs })}
            />
            <NumberField
              id="insp-st-delay"
              label="Jeda / Delay (ms)"
              value={transition.delayMs}
              min={0}
              max={3000}
              step={50}
              disabled={readOnly}
              onCommit={(delayMs) => handlePatch({ delayMs })}
            />
          </div>

          <SelectField
            id="insp-st-easing"
            label="Kurva Gerakan (Easing)"
            value={transition.easing}
            disabled={readOnly}
            options={EASING_OPTIONS}
            onChange={(easing) => handlePatch({ easing })}
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!transition.once}
              disabled={readOnly}
              onChange={(e) => handlePatch({ once: !e.target.checked })}
              className={styles.checkboxInput}
            />
            <div>
              <span className={styles.checkboxTitle}>Ulangi animasi saat scroll kembali</span>
              <p className={styles.checkboxDesc}>
                Animasi transisi akan diputar ulang setiap kali section ini di-scroll masuk ke layar.
              </p>
            </div>
          </label>

          <button
            type="button"
            className={`${styles.ghostButton} ${previewing ? styles.ghostBtnActive : ""}`}
            onClick={handlePreview}
            disabled={readOnly}
            data-testid="preview-section-trans-btn"
            title="Lihat simulasi transisi section di kanvas"
          >
            {previewing ? <IconReplay size={13} /> : <IconPlay size={13} />}
            <span>{previewing ? "Memutar pratinjau..." : "Putar Pratinjau Transisi"}</span>
          </button>
        </div>
      ) : (
        <div className={styles.animEmptyNotice}>
          Section ini akan tampil normal tanpa efek transisi saat di-scroll.
        </div>
      )}
    </div>
  );
}
