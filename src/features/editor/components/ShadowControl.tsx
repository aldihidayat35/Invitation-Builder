"use client";

import { useMemo } from "react";
import type { ElementShadow } from "@/lib/schema";
import {
  SHADOW_PRESETS,
  createShadowFromPreset,
  detectShadowPreset,
  resolveShadowColor,
  type ShadowPreset,
} from "@/lib/shadow";
import {
  IconShadowNone,
  IconShadowSoft,
  IconShadowDrop,
  IconShadowLift,
  IconShadowGlow,
  IconShadowHard,
} from "./icons";
import { ColorField, NumberField, OpacityField } from "./fields";
import styles from "./editor.module.css";

const SHADOW_ICONS: Record<ShadowPreset, React.ComponentType<{ size?: number }>> = {
  none: IconShadowNone,
  soft: IconShadowSoft,
  drop: IconShadowDrop,
  lift: IconShadowLift,
  glow: IconShadowGlow,
  hard: IconShadowHard,
};

export interface ShadowControlProps {
  readonly shadow?: ElementShadow | undefined;
  readonly tokens: { colors: Record<string, string> };
  readonly disabled?: boolean;
  readonly onChange: (shadow: ElementShadow | undefined) => void;
}

export function ShadowControl({
  shadow,
  tokens,
  disabled = false,
  onChange,
}: ShadowControlProps) {
  const currentPreset: ShadowPreset = useMemo(() => detectShadowPreset(shadow), [shadow]);
  const isEnabled = shadow !== undefined;
  const resolvedColor = useMemo(
    () => resolveShadowColor(shadow?.color, tokens, "#000000"),
    [shadow?.color, tokens],
  );

  const handleSelectPreset = (presetId: ShadowPreset) => {
    if (disabled) return;
    if (presetId === "none") {
      onChange(undefined);
    } else {
      onChange(createShadowFromPreset(presetId, shadow?.color));
    }
  };

  return (
    <div className={styles.shadowControlStack} data-testid="shadow-control">
      {/* Top Header Status & Reset */}
      <div className={styles.shadowHeaderRow}>
        <div className={styles.shadowHeaderBadge}>
          <span className={styles.shadowDot} data-active={isEnabled} />
          <span>{isEnabled ? `Efek: ${currentPreset.toUpperCase()}` : "Tidak ada bayangan"}</span>
        </div>
        {isEnabled && (
          <button
            type="button"
            className={styles.shadowResetBtn}
            disabled={disabled}
            onClick={() => onChange(undefined)}
            data-testid="shadow-reset-btn"
            title="Hapus efek bayangan"
          >
            Hapus
          </button>
        )}
      </div>

      {/* Preset Selector Grid (Canva-inspired) */}
      <div className={styles.shadowPresetGrid} role="radiogroup" aria-label="Pilihan efek bayangan">
        {SHADOW_PRESETS.map((preset) => {
          const isSelected =
            preset.id === "none" ? !isEnabled : isEnabled && currentPreset === preset.id;
          const PresetIcon = SHADOW_ICONS[preset.id] ?? IconShadowNone;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.shadowPresetTile} ${isSelected ? styles.shadowPresetTileActive : ""}`}
              disabled={disabled}
              onClick={() => handleSelectPreset(preset.id)}
              data-testid={`shadow-preset-${preset.id}`}
              title={preset.description}
            >
              <span className={styles.shadowPresetIcon}>
                <PresetIcon size={22} />
              </span>
              <span className={styles.shadowPresetLabel}>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Fine-Tuning Controls (Active when shadow is enabled) */}
      {isEnabled && shadow && (
        <div className={styles.shadowSlidersSection} data-testid="shadow-sliders">
          {/* Mini Live Preview Chip */}
          <div className={styles.shadowPreviewBox}>
            <div
              className={styles.shadowPreviewObject}
              style={{
                boxShadow: `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${resolvedColor}${Math.round(
                  shadow.opacity * 255,
                )
                  .toString(16)
                  .padStart(2, "0")}`,
              }}
            >
              <span>Pratinjau Bayangan</span>
            </div>
          </div>

          {/* Color & Opacity Row */}
          <div className={styles.shadowFieldGroup}>
            <ColorField
              id="insp-shadow-color"
              label="Warna bayangan"
              value={shadow.color}
              resolvedHex={resolvedColor}
              tokens={tokens.colors}
              disabled={disabled}
              onChange={(color) => onChange({ ...shadow, color: color ?? "#000000" })}
            />

            <OpacityField
              id="insp-shadow-opacity"
              value={shadow.opacity}
              disabled={disabled}
              onChange={(opacity) => onChange({ ...shadow, opacity })}
            />
          </div>

          {/* Blur & Offset Geometry Grid */}
          <div className={styles.grid3} style={{ marginTop: 8 }}>
            <NumberField
              id="insp-shadow-blur"
              label="Blur (px)"
              value={shadow.blur}
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              onCommit={(blur) => onChange({ ...shadow, blur: Math.max(0, blur) })}
            />
            <NumberField
              id="insp-shadow-x"
              label="Jarak X"
              value={shadow.offsetX}
              min={-100}
              max={100}
              step={1}
              disabled={disabled}
              onCommit={(offsetX) => onChange({ ...shadow, offsetX })}
            />
            <NumberField
              id="insp-shadow-y"
              label="Jarak Y"
              value={shadow.offsetY}
              min={-100}
              max={100}
              step={1}
              disabled={disabled}
              onCommit={(offsetY) => onChange({ ...shadow, offsetY })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
