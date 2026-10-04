"use client";

import { useEffect, useRef, useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { assetUrl } from "@/features/assets/urls";
import { AssetLibrary } from "./AssetLibrary";
import { IconImages, IconPlus, IconTrash } from "./icons";
import styles from "./editor.module.css";

interface GalleryEditorItem {
  readonly assetId?: string;
  readonly src?: string;
  readonly alt: string;
}

const MAX_GALLERY_ITEMS = 50;
const SAFE_SRC = /^(https?:\/\/|\/)/i;

function normalizeItems(value: unknown): GalleryEditorItem[] {
  if (!Array.isArray(value)) return [];
  const items: GalleryEditorItem[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const alt = typeof item.alt === "string" ? item.alt : "";
    if (typeof item.assetId === "string") items.push({ assetId: item.assetId, alt });
    else if (typeof item.src === "string" && SAFE_SRC.test(item.src)) {
      items.push({ src: item.src, alt });
    }
    if (items.length === MAX_GALLERY_ITEMS) break;
  }
  return items;
}

function itemSource(item: GalleryEditorItem): string {
  return item.assetId ? assetUrl(item.assetId) : (item.src ?? "");
}

function defaultAlt(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 160);
}

export function GalleryItemsControl({
  elementId,
  value,
  disabled,
  onChange,
}: {
  readonly elementId: string;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (items: readonly GalleryEditorItem[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const items = normalizeItems(value);
  const itemsRef = useRef(items);
  const atLimit = items.length >= MAX_GALLERY_ITEMS;

  useEffect(() => {
    itemsRef.current = normalizeItems(value);
  }, [value]);

  const commit = (next: GalleryEditorItem[]) => {
    itemsRef.current = next;
    onChange(next);
  };

  const addAsset = (asset: AssetSummary) => {
    const current = itemsRef.current;
    if (
      disabled ||
      current.length >= MAX_GALLERY_ITEMS ||
      current.some((item) => item.assetId === asset.id)
    ) {
      return;
    }
    commit([...current, { assetId: asset.id, alt: defaultAlt(asset.filename) }]);
  };

  const replaceAt = (index: number, item: GalleryEditorItem) => {
    const next = [...items];
    next[index] = item;
    commit(next);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    commit(next);
  };

  return (
    <div className={styles.galleryEditor} data-testid="gallery-items-control">
      <div className={styles.galleryEditorHeader}>
        <span className={styles.galleryEditorCount}>
          <IconImages size={14} />
          {items.length} / {MAX_GALLERY_ITEMS} foto
        </span>
        <button
          type="button"
          className={styles.galleryAddButton}
          disabled={disabled || atLimit}
          aria-expanded={picking}
          data-testid="gallery-add-images"
          onClick={() => setPicking((open) => !open)}
        >
          <IconPlus size={13} />
          {picking ? "Tutup" : "Tambah foto"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={styles.galleryEditorEmpty}>
          <IconImages size={22} />
          <strong>Galeri masih kosong</strong>
          <span>Unggah atau pilih gambar dari pustaka aset.</span>
        </div>
      ) : (
        <ol className={styles.galleryEditorList} aria-label="Foto galeri">
          {items.map((item, index) => (
            <li
              key={`${item.assetId ?? item.src}-${index}`}
              className={styles.galleryEditorItem}
              data-testid="gallery-editor-item"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- same-origin asset or preserved safe legacy URL */}
              <img src={itemSource(item)} alt="" className={styles.galleryEditorThumb} />
              <div className={styles.galleryEditorItemBody}>
                <span className={styles.galleryEditorPosition}>Foto {index + 1}</span>
                <GalleryAltInput
                  key={`${item.assetId ?? item.src}-${index}-${item.alt}`}
                  value={item.alt}
                  disabled={disabled}
                  label={`Teks alternatif foto ${index + 1}`}
                  onCommit={(alt) => replaceAt(index, { ...item, alt })}
                />
                <div className={styles.galleryEditorActions}>
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    aria-label={`Naikkan foto ${index + 1}`}
                    onClick={() => move(index, index - 1)}
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Turunkan foto ${index + 1}`}
                    onClick={() => move(index, index + 1)}
                  >
                    &darr;
                  </button>
                  <button
                    type="button"
                    className={styles.galleryRemoveButton}
                    disabled={disabled}
                    aria-label={`Hapus foto ${index + 1}`}
                    onClick={() => commit(items.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {atLimit ? (
        <p className={styles.muted}>Batas maksimal {MAX_GALLERY_ITEMS} foto telah tercapai.</p>
      ) : null}

      {picking ? (
        <div className={styles.galleryAssetPicker}>
          <p className={styles.galleryPickerHint}>
            Gambar yang baru diunggah langsung ditambahkan. Klik gambar lama untuk menambahkannya.
          </p>
          <AssetLibrary
            idPrefix={`gallery-${elementId}`}
            pickLabel="Tambahkan ke galeri"
            onPick={addAsset}
            onUploaded={addAsset}
            disabled={disabled || atLimit}
          />
        </div>
      ) : null}
    </div>
  );
}

function GalleryAltInput({
  value,
  label,
  disabled,
  onCommit,
}: {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly onCommit: (value: string) => void;
}) {
  const commit = (draft: string) => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      className={styles.input}
      defaultValue={value}
      maxLength={300}
      disabled={disabled}
      aria-label={label}
      placeholder="Deskripsi foto (opsional)"
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          event.currentTarget.value = value;
          event.currentTarget.blur();
        }
      }}
    />
  );
}
