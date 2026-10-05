"use client";

import { useState } from "react";
import type { Element, ImageFade } from "@/lib/schema";
import type { AssetSummary } from "@/features/assets/api";
import { assetUrl } from "@/features/assets/urls";
import { AssetLibrary } from "./AssetLibrary";
import { BindingControl } from "./BindingControl";
import { useEditorStore, useWorkspaceId } from "./EditorProvider";
import { ImageCropModal } from "./ImageCropModal";
import { RemoveBgModal } from "./RemoveBgModal";
import { NumberField, SelectField, TextField } from "./fields";
import { IconCrop, IconFlipH, IconFlipV, IconWand } from "./icons";
import styles from "./editor.module.css";

type ImageElement = Extract<Element, { type: "image" }>;

const FIT_OPTIONS = [
  { value: "cover", label: "Cover (isi, potong)" },
  { value: "contain", label: "Contain (muat semua)" },
] as const;

/** Inspector section for an image element (FR-EDT-008): source, replace, fit, focal, radius, alt, binding. */
export function ImagePanel({ element, readOnly }: { element: ImageElement; readOnly: boolean }) {
  const store = useEditorStore();
  const workspaceId = useWorkspaceId();
  const [picking, setPicking] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [removeBgOpen, setRemoveBgOpen] = useState(false);
  const id = element.id;
  const disabled = readOnly || element.locked;
  const { style } = element;
  const assetId = "assetId" in element.source ? element.source.assetId : undefined;
  const boundKey = "bind" in element.source ? element.source.bind : undefined;

  const setSource = (source: ImageElement["source"]) =>
    store.getState().patchElement(id, (el) => ({ ...el, source }) as Element);
  const patchStyle = (patch: Partial<ImageElement["style"]>) =>
    store.getState().patchStyle([id], patch);

  function pick(asset: AssetSummary) {
    setSource({ assetId: asset.id });
    setPicking(false);
  }

  return (
    <div className={styles.panelStack} data-testid="image-inspector">
      {assetId ? (
        <div className={styles.imagePreview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- editor preview of a same-origin asset */}
          <img src={assetUrl(assetId)} alt="" data-testid="image-preview" />
        </div>
      ) : (
        <p className={styles.muted}>Terhubung ke variabel: {boundKey}</p>
      )}
      <button
        type="button"
        className={styles.ghostButton}
        disabled={disabled}
        data-testid="image-replace"
        onClick={() => setPicking((open) => !open)}
      >
        {picking ? "Tutup pilihan" : assetId ? "Ganti gambar" : "Pakai aset statis"}
      </button>
      {assetId ? (
        <div className={styles.imageActionGrid}>
          <button
            type="button"
            className={styles.imageToolBtn}
            disabled={disabled}
            data-testid="image-crop-btn"
            title="Potong & atur rasio gambar"
            onClick={() => setCropOpen(true)}
          >
            <IconCrop size={14} />
            <span>Potong (Crop)</span>
          </button>
          <button
            type="button"
            className={styles.imageToolBtn}
            disabled={disabled}
            data-active={Boolean(style.flipH)}
            data-testid="image-flip-h-btn"
            title="Balik horizontal (kiri-kanan)"
            onClick={() => patchStyle({ flipH: !style.flipH })}
          >
            <IconFlipH size={14} />
            <span>Flip H</span>
          </button>
          <button
            type="button"
            className={styles.imageToolBtn}
            disabled={disabled}
            data-active={Boolean(style.flipV)}
            data-testid="image-flip-v-btn"
            title="Balik vertikal (atas-bawah)"
            onClick={() => patchStyle({ flipV: !style.flipV })}
          >
            <IconFlipV size={14} />
            <span>Flip V</span>
          </button>
          <button
            type="button"
            className={styles.imageToolBtn}
            disabled={disabled}
            data-testid="image-remove-bg-btn"
            title="Hapus latar belakang menjadi transparan"
            onClick={() => setRemoveBgOpen(true)}
          >
            <IconWand size={14} />
            <span>Hapus BG</span>
          </button>
        </div>
      ) : null}
      {picking ? <AssetLibrary idPrefix="pick" pickLabel="Pakai gambar" onPick={pick} /> : null}


      <BindingControl
        id="insp-image-bind"
        slot="image"
        boundKey={boundKey}
        disabled={disabled}
        newVariableDefault={assetId ? { assetId } : undefined}
        onBind={(key) => setSource({ bind: key })}
        onUnbind={() => {
          // Keep showing something sensible: fall back to the variable's default asset if known.
          setPicking(true);
        }}
      />

      <SelectField
        id="insp-image-fit"
        label="Object fit"
        value={style.fit}
        options={FIT_OPTIONS}
        disabled={disabled}
        onChange={(fit) => patchStyle({ fit })}
      />
      <div className={styles.grid2}>
        <NumberField
          id="insp-image-focal-x"
          label="Fokus X (%)"
          value={Math.round(style.focal.x * 100)}
          min={0}
          max={100}
          disabled={disabled}
          onCommit={(p) => patchStyle({ focal: { ...style.focal, x: p / 100 } })}
        />
        <NumberField
          id="insp-image-focal-y"
          label="Fokus Y (%)"
          value={Math.round(style.focal.y * 100)}
          min={0}
          max={100}
          disabled={disabled}
          onCommit={(p) => patchStyle({ focal: { ...style.focal, y: p / 100 } })}
        />
      </div>
      <NumberField
        id="insp-image-radius"
        label="Radius sudut"
        value={style.radius}
        min={0}
        max={10000}
        disabled={disabled}
        onCommit={(radius) => patchStyle({ radius })}
      />

      <ImageFadeControl
        fade={style.fade}
        disabled={disabled}
        onChange={(fade) => patchStyle({ fade })}
      />

      <TextField
        id="insp-image-alt"
        label="Teks alternatif (kosongkan jika dekoratif)"
        value={element.alt ?? ""}
        disabled={readOnly}
        maxLength={300}
        onCommit={(alt) =>
          store.getState().patchElement(
            id,
            (el) => {
              if (el.type !== "image") return el;
              const { alt: _drop, ...rest } = el;
              void _drop;
              return alt.trim() ? { ...rest, alt: alt.trim() } : rest;
            },
            "alt",
          )
        }
      />

      {cropOpen && assetId ? (
        <ImageCropModal
          assetId={assetId}
          filename={element.alt || "gambar"}
          workspaceId={workspaceId}
          onClose={() => setCropOpen(false)}
          onCropped={(asset, ratio) => {
            setSource({ assetId: asset.id });
            if (ratio > 0) {
              const currentW = element.frame.w;
              const newH = Math.max(20, Math.round(currentW / ratio));
              store.getState().patchElement(
                id,
                (el) => ({ ...el, frame: { ...el.frame, h: newH } }),
                "crop-resize",
              );
            }
          }}

        />
      ) : null}

      {removeBgOpen && assetId ? (
        <RemoveBgModal
          assetId={assetId}
          filename={element.alt || "gambar"}
          workspaceId={workspaceId}
          onClose={() => setRemoveBgOpen(false)}
          onProcessed={(asset) => {
            setSource({ assetId: asset.id });
          }}
        />
      ) : null}
    </div>
  );
}

interface ImageFadeControlProps {
  readonly fade?: ImageFade | undefined;
  readonly disabled?: boolean;
  readonly onChange: (fade: ImageFade | undefined) => void;
}

export function ImageFadeControl({ fade, disabled, onChange }: ImageFadeControlProps) {
  const currentMode = fade?.mode ?? "linear";
  const top = fade?.top ?? 0;
  const bottom = fade?.bottom ?? 0;
  const left = fade?.left ?? 0;
  const right = fade?.right ?? 0;
  const radial = fade?.radial ?? 0;

  const hasFade =
    (currentMode === "radial" && radial > 0) ||
    (currentMode === "linear" && (top > 0 || bottom > 0 || left > 0 || right > 0));

  const setSide = (side: "top" | "bottom" | "left" | "right", value: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    const next: ImageFade = {
      mode: "linear",
      top: side === "top" ? clamped : top,
      bottom: side === "bottom" ? clamped : bottom,
      left: side === "left" ? clamped : left,
      right: side === "right" ? clamped : right,
      radial,
    };
    onChange(next);
  };

  const setRadial = (value: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    const next: ImageFade = {
      mode: "radial",
      top,
      bottom,
      left,
      right,
      radial: clamped,
    };
    onChange(next);
  };

  const setMode = (mode: "linear" | "radial") => {
    onChange({
      mode,
      top,
      bottom,
      left,
      right,
      radial,
    });
  };

  return (
    <div className={styles.fadeContainer} data-testid="image-fade-control">
      <div className={styles.fadeHeader}>
        <div className={styles.fadeTitle}>
          <span>Blend Transparan</span>
          {hasFade && <span className={styles.fadeBadge}>Aktif</span>}
        </div>
        {hasFade && (
          <button
            type="button"
            className={styles.fadePresetBtn}
            disabled={disabled}
            onClick={() => onChange(undefined)}
            data-testid="fade-reset-btn"
          >
            Reset
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className={styles.fadeTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={currentMode === "linear"}
          data-active={currentMode === "linear"}
          className={styles.fadeTabBtn}
          disabled={disabled}
          onClick={() => setMode("linear")}
          data-testid="fade-mode-linear"
        >
          <span>Tepi Sisi</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentMode === "radial"}
          data-active={currentMode === "radial"}
          className={styles.fadeTabBtn}
          disabled={disabled}
          onClick={() => setMode("radial")}
          data-testid="fade-mode-radial"
        >
          <span>Vignette Oval</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className={styles.fadePresets} role="group" aria-label="Preset blend transparan">
        {currentMode === "linear" ? (
          <>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={bottom === 40 && top === 0 && left === 0 && right === 0}
              onClick={() =>
                onChange({ mode: "linear", top: 0, bottom: 40, left: 0, right: 0, radial: 0 })
              }
              data-testid="fade-preset-bottom-40"
            >
              Bawah 40%
            </button>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={top === 35 && bottom === 35 && left === 0 && right === 0}
              onClick={() =>
                onChange({ mode: "linear", top: 35, bottom: 35, left: 0, right: 0, radial: 0 })
              }
              data-testid="fade-preset-vertical-35"
            >
              Atas-Bawah 35%
            </button>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={left === 35 && right === 35 && top === 0 && bottom === 0}
              onClick={() =>
                onChange({ mode: "linear", top: 0, bottom: 0, left: 35, right: 35, radial: 0 })
              }
              data-testid="fade-preset-horizontal-35"
            >
              Kiri-Kanan 35%
            </button>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={top === 25 && bottom === 25 && left === 25 && right === 25}
              onClick={() =>
                onChange({ mode: "linear", top: 25, bottom: 25, left: 25, right: 25, radial: 0 })
              }
              data-testid="fade-preset-all-25"
            >
              Semua Sisi 25%
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={radial === 30}
              onClick={() =>
                onChange({ mode: "radial", top: 0, bottom: 0, left: 0, right: 0, radial: 30 })
              }
              data-testid="fade-preset-radial-30"
            >
              Lembut 30%
            </button>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={radial === 50}
              onClick={() =>
                onChange({ mode: "radial", top: 0, bottom: 0, left: 0, right: 0, radial: 50 })
              }
              data-testid="fade-preset-radial-50"
            >
              Sedang 50%
            </button>
            <button
              type="button"
              className={styles.fadePresetBtn}
              disabled={disabled}
              data-active={radial === 75}
              onClick={() =>
                onChange({ mode: "radial", top: 0, bottom: 0, left: 0, right: 0, radial: 75 })
              }
              data-testid="fade-preset-radial-75"
            >
              Kuat 75%
            </button>
          </>
        )}
      </div>

      {/* Sliders */}
      {currentMode === "linear" ? (
        <div className={styles.fadeSliderGrid}>
          <FadeSliderRow
            id="fade-top"
            label="Atas"
            value={top}
            disabled={disabled}
            onChange={(val) => setSide("top", val)}
          />
          <FadeSliderRow
            id="fade-bottom"
            label="Bawah"
            value={bottom}
            disabled={disabled}
            onChange={(val) => setSide("bottom", val)}
          />
          <FadeSliderRow
            id="fade-left"
            label="Kiri"
            value={left}
            disabled={disabled}
            onChange={(val) => setSide("left", val)}
          />
          <FadeSliderRow
            id="fade-right"
            label="Kanan"
            value={right}
            disabled={disabled}
            onChange={(val) => setSide("right", val)}
          />
        </div>
      ) : (
        <div className={styles.fadeSliderGrid}>
          <FadeSliderRow
            id="fade-radial"
            label="Radius"
            value={radial}
            disabled={disabled}
            onChange={setRadial}
          />
          <p className={styles.fadeHint}>
            Memudarkan tepi luar oval ke bagian tengah foto secara lembut.
          </p>
        </div>
      )}
    </div>
  );
}

function FadeSliderRow({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}) {
  return (
    <div className={styles.fadeSliderRow}>
      <label htmlFor={id} className={styles.fadeSliderLabel}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        className={styles.fadeSlider}
        aria-label={`${label} fade slider`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className={styles.fadeNumberWrapper}>
        <input
          id={`${id}-input`}
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          className={styles.fadeNumberInput}
          aria-label={`${label} fade value`}
          onChange={(e) => {
            const num = Number(e.target.value);
            if (Number.isFinite(num)) {
              onChange(Math.min(100, Math.max(0, num)));
            }
          }}
        />
        <span className={styles.fadeUnit}>%</span>
      </div>
    </div>
  );
}


