"use client";

import { useState } from "react";
import type { DocumentBackground } from "@/lib/schema";
import { assetUrl } from "@/features/assets/urls";
import { resolveColor } from "../core/display";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { AssetLibrary } from "./AssetLibrary";
import { ColorField, FieldRow, SelectField } from "./fields";
import { IconCheck, IconImages, IconSparkle, IconTrash } from "./icons";
import styles from "./editor.module.css";

export interface BaseBgPreset {
  readonly id: string;
  readonly name: string;
  readonly category: "soft" | "dark" | "luxury";
  readonly color: string;
}

export const BASE_BG_PRESETS: readonly BaseBgPreset[] = [
  // Soft / Floral
  { id: "clean-white", name: "Clean White", category: "soft", color: "#ffffff" },
  { id: "soft-linen", name: "Soft Linen", category: "soft", color: "#f8f6f0" },
  { id: "rose-romance", name: "Rose Romance", category: "soft", color: "#fff1f2" },
  { id: "floral-blush", name: "Floral Blush", category: "soft", color: "#fdf2f8" },
  { id: "warm-ivory", name: "Warm Ivory", category: "soft", color: "#faf8f5" },
  { id: "lavender-mist", name: "Lavender Mist", category: "soft", color: "#f5f3ff" },
  // Dark / Modern
  { id: "dark-slate", name: "Dark Slate", category: "dark", color: "#0f172a" },
  { id: "midnight-noir", name: "Midnight Noir", category: "dark", color: "#09090b" },
  { id: "emerald-night", name: "Emerald Night", category: "dark", color: "#06281e" },
  { id: "royal-navy", name: "Royal Navy", category: "dark", color: "#0c1729" },
  // Luxury / Gold
  { id: "gold-silk", name: "Gold Silk", category: "luxury", color: "#fef9ee" },
  { id: "champagne", name: "Champagne", category: "luxury", color: "#f7f1e7" },
];

export interface BaseBackgroundControlProps {
  readonly readOnly?: boolean;
}

export function BaseBackgroundControl({ readOnly }: BaseBackgroundControlProps) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const [pickingImage, setPickingImage] = useState(false);

  const bg: DocumentBackground | undefined = doc.design.background;
  const tokens = doc.design.tokens;
  const resolvedBgHex = resolveColor(bg?.color, tokens, "#ffffff");

  const imageAssetId = bg?.image && "assetId" in bg.image ? bg.image.assetId : undefined;
  const overlayColor = bg?.overlayColor ?? "#000000";
  const overlayOpacity = Math.round((bg?.overlayOpacity ?? 0) * 100);

  const applyPreset = (preset: BaseBgPreset) => {
    store.getState().patchBaseBackground({
      color: preset.color,
      fit: bg?.fit ?? "cover",
    });
  };

  const clearBackground = () => {
    store.getState().setBaseBackground(undefined);
    setPickingImage(false);
  };

  return (
    <div className={styles.baseBgControl} data-testid="base-background-control">
      {/* Informational Hint */}
      <div className={styles.baseBgHint}>
        <span className={styles.baseBgHintIcon}>
          <IconSparkle size={13} />
        </span>
        <p className={styles.baseBgHintText}>
          <strong>Latar Layar Tetap:</strong> Latar ini diam memenuhi layar ponsel saat di-scroll.
          Section yang tidak memiliki latar warna akan menampakkan latar ini di baliknya.
        </p>
      </div>

      {/* Preset Swatches */}
      <div className={styles.baseBgSection}>
        <span className={styles.baseBgLabel}>Preset Warna Populer</span>
        <div className={styles.baseBgPresetsGrid}>
          {BASE_BG_PRESETS.map((preset) => {
            const isSelected =
              typeof bg?.color === "string" &&
              bg.color.toLowerCase() === preset.color.toLowerCase();

            return (
              <button
                key={preset.id}
                type="button"
                className={styles.baseBgPresetBtn}
                style={{ backgroundColor: preset.color }}
                title={`${preset.name} (${preset.color})`}
                disabled={readOnly}
                data-testid={`base-bg-preset-${preset.id}`}
                onClick={() => applyPreset(preset)}
              >
                {isSelected ? (
                  <span
                    className={styles.baseBgPresetCheck}
                    style={{
                      color:
                        preset.color === "#ffffff" || preset.category === "soft"
                          ? "#111827"
                          : "#ffffff",
                    }}
                  >
                    <IconCheck size={12} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Color Field */}
      <div className={styles.baseBgSection}>
        <ColorField
          id="base-bg-color"
          label="Warna Kustom"
          value={bg?.color}
          resolvedHex={resolvedBgHex}
          tokens={tokens.colors}
          allowNone
          disabled={readOnly}
          onChange={(color) => {
            store.getState().patchBaseBackground({ color });
          }}
        />
      </div>

      {/* Background Image / Pattern Section */}
      <div className={styles.baseBgSection}>
        <span className={styles.baseBgLabel}>Gambar / Pola Latar</span>
        {imageAssetId ? (
          <div className={styles.baseBgImageCard}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(imageAssetId)}
              alt="Latar layar"
              className={styles.baseBgImageThumb}
            />
            <div className={styles.baseBgImageActions}>
              <button
                type="button"
                className={styles.smallButton}
                disabled={readOnly}
                onClick={() => setPickingImage(true)}
              >
                Ganti Gambar
              </button>
              <button
                type="button"
                className={styles.smallGhostButton}
                disabled={readOnly}
                onClick={() =>
                  store.getState().patchBaseBackground({ image: undefined })
                }
              >
                Hapus Gambar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.ghostButton}
            disabled={readOnly}
            data-testid="base-bg-pick-image-btn"
            onClick={() => setPickingImage(!pickingImage)}
          >
            <IconImages size={13} />
            {pickingImage ? "Tutup Pustaka Media" : "Pilih Gambar Latar"}
          </button>
        )}

        {pickingImage ? (
          <div className={styles.baseBgLibraryWrapper}>
            <AssetLibrary
              pickLabel="Pilih sebagai latar"
              idPrefix="base-bg"
              onPick={(asset) => {
                store.getState().patchBaseBackground({
                  image: { assetId: asset.id },
                });
                setPickingImage(false);
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Image Fit & Repeat Mode */}
      {imageAssetId ? (
        <div className={styles.baseBgSection}>
          <SelectField
            id="base-bg-fit"
            label="Mode Tampilan Gambar"
            value={bg?.fit ?? "cover"}
            disabled={readOnly}
            options={[
              { value: "cover", label: "Penuhi Layar (Cover)" },
              { value: "contain", label: "Muat Utuh (Contain)" },
              { value: "repeat", label: "Pola Berulang (Tile / Repeat)" },
            ]}
            onChange={(fit) => {
              store.getState().patchBaseBackground({
                fit: fit as "cover" | "contain" | "repeat",
              });
            }}
          />
        </div>
      ) : null}

      {/* Tint Overlay (especially useful for image backgrounds) */}
      {imageAssetId ? (
        <div className={styles.baseBgSection}>
          <ColorField
            id="base-bg-overlay-color"
            label="Warna Lapisan Gelap/Terang (Tint)"
            value={overlayColor}
            resolvedHex={overlayColor}
            tokens={tokens.colors}
            disabled={readOnly}
            onChange={(val) => {
              const hex =
                typeof val === "string"
                  ? val
                  : val?.token
                    ? tokens.colors[val.token]
                    : undefined;
              store.getState().patchBaseBackground({ overlayColor: hex });
            }}
          />
          <FieldRow label={`Opasitas Lapisan (${overlayOpacity}%)`}>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={overlayOpacity}
              disabled={readOnly}
              className={styles.rangeInput || ""}
              style={{ width: "100%", accentColor: "var(--dash-accent, #7c3aed)" }}
              onChange={(e) => {
                const val = Number(e.target.value) / 100;
                store.getState().patchBaseBackground({ overlayOpacity: val });
              }}
            />
          </FieldRow>
        </div>
      ) : null}

      {/* Reset Background */}
      {bg ? (
        <button
          type="button"
          className={styles.ghostButton}
          disabled={readOnly}
          data-testid="base-bg-reset-btn"
          onClick={clearBackground}
          style={{ color: "var(--dash-danger, #ef4444)", marginTop: 8 }}
        >
          <IconTrash size={13} />
          Reset Latar Layar (Gunakan Default)
        </button>
      ) : null}
    </div>
  );
}
