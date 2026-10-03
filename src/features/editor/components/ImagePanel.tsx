"use client";

import { useState } from "react";
import type { Element } from "@/lib/schema";
import type { AssetSummary } from "@/features/assets/api";
import { assetUrl } from "@/features/assets/urls";
import { AssetLibrary } from "./AssetLibrary";
import { BindingControl } from "./BindingControl";
import { useEditorStore } from "./EditorProvider";
import { NumberField, SelectField, TextField } from "./fields";
import styles from "./editor.module.css";

type ImageElement = Extract<Element, { type: "image" }>;

const FIT_OPTIONS = [
  { value: "cover", label: "Cover (isi, potong)" },
  { value: "contain", label: "Contain (muat semua)" },
] as const;

/** Inspector section for an image element (FR-EDT-008): source, replace, fit, focal, radius, alt, binding. */
export function ImagePanel({ element, readOnly }: { element: ImageElement; readOnly: boolean }) {
  const store = useEditorStore();
  const [picking, setPicking] = useState(false);
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
      <h3 className={styles.subHeading}>Gambar</h3>
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
        className={styles.smallButton}
        disabled={disabled}
        data-testid="image-replace"
        onClick={() => setPicking((open) => !open)}
      >
        {picking ? "Tutup pilihan" : assetId ? "Ganti gambar" : "Pakai aset statis"}
      </button>
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
    </div>
  );
}
