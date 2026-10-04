"use client";

import { useState } from "react";
import type { Element } from "@/lib/schema";
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

