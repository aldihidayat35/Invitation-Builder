"use client";

import { useEffect, useRef, useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { assetUrl } from "@/features/assets/urls";
import { isBindingCompatible, variableKeySchema } from "@/lib/schema";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { AssetLibrary } from "./AssetLibrary";
import { IconClose, IconImages, IconPlus, IconTrash, IconVariable } from "./icons";
import styles from "./editor.module.css";

export interface GalleryEditorItem {
  readonly assetId?: string;
  readonly src?: string;
  readonly bind?: string;
  readonly alt: string;
}

const MAX_GALLERY_ITEMS = 50;
const ASSET_ID = /^[0-9a-f-]{36}$/i;
const SAFE_SRC = /^(https?:\/\/|\/|data:image\/)/i;

function labelFromKey(key: string): string {
  const text = key.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function uniqueKey(taken: ReadonlySet<string>, base: string): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}

function normalizeItems(value: unknown): GalleryEditorItem[] {
  if (!Array.isArray(value)) return [];
  const items: GalleryEditorItem[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const alt = typeof item.alt === "string" ? item.alt : "";
    if (typeof item.bind === "string") {
      items.push({
        bind: item.bind,
        alt: alt || `{${item.bind}}`,
        ...(typeof item.assetId === "string" && { assetId: item.assetId }),
        ...(typeof item.src === "string" && { src: item.src }),
      });
    } else if (typeof item.assetId === "string") {
      items.push({ assetId: item.assetId, alt });
    } else if (typeof item.src === "string" && SAFE_SRC.test(item.src)) {
      items.push({ src: item.src, alt });
    }
    if (items.length === MAX_GALLERY_ITEMS) break;
  }
  return items;
}

function itemSource(
  item: GalleryEditorItem,
  variables?: readonly { key: string; default?: unknown }[],
): string {
  if (item.assetId) return assetUrl(item.assetId);
  if (item.src) return item.src;
  if (item.bind && variables) {
    const matching = variables.find((v) => v.key === item.bind);
    if (matching?.default) {
      if (typeof matching.default === "string") {
        if (SAFE_SRC.test(matching.default)) return matching.default;
        if (ASSET_ID.test(matching.default)) return assetUrl(matching.default);
      } else if (typeof matching.default === "object" && matching.default !== null) {
        const d = matching.default as Record<string, unknown>;
        if (typeof d.assetId === "string") return assetUrl(d.assetId);
        if (typeof d.src === "string") return d.src;
      }
    }
  }
  return "";
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
  const store = useEditorStore();
  const doc = useEditor(selectDoc);

  const [picking, setPicking] = useState(false);
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [selectedVarKey, setSelectedVarKey] = useState("");
  const [newVarKey, setNewVarKey] = useState("");
  const [varError, setVarError] = useState<string | null>(null);

  const [bindingItemIndex, setBindingItemIndex] = useState<number | null>(null);

  const items = normalizeItems(value);
  const itemsRef = useRef(items);
  const atLimit = items.length >= MAX_GALLERY_ITEMS;

  const declaredImageVars = doc.variables.filter(
    (v) => v.type === "image" || v.type === "url" || isBindingCompatible("image", v.type),
  );
  const declaredKeys = new Set(doc.variables.map((v) => v.key));

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

  const addBoundVariable = (key: string) => {
    const current = itemsRef.current;
    if (disabled || current.length >= MAX_GALLERY_ITEMS) return;
    commit([...current, { bind: key, alt: labelFromKey(key) }]);
    setShowVarPicker(false);
    setSelectedVarKey("");
  };

  const handleCreateAndAddVariable = () => {
    const key = newVarKey.trim();
    if (!variableKeySchema.safeParse(key).success) {
      setVarError("Kunci harus berupa dot path, misal: media.gallery1");
      return;
    }
    if (declaredKeys.has(key)) {
      setVarError("Kunci variabel ini sudah ada.");
      return;
    }

    store.getState().addVariable({
      key,
      label: labelFromKey(key),
      type: "image",
      required: false,
    } as Parameters<ReturnType<typeof store.getState>["addVariable"]>[0]);

    addBoundVariable(key);
    setNewVarKey("");
    setVarError(null);
  };

  const handleConvertItemToVariable = (index: number, key: string) => {
    const target = items[index];
    if (!target) return;
    const next = [...items];
    next[index] = {
      ...target,
      bind: key,
      alt: target.alt || labelFromKey(key),
    };
    commit(next);
    setBindingItemIndex(null);
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
        <div style={{ display: "flex", gap: 4 }}>
          {/* Tambah Variabel Foto */}
          <button
            type="button"
            className={styles.galleryAddButton}
            disabled={disabled || atLimit}
            aria-expanded={showVarPicker}
            data-testid="gallery-add-variable-btn"
            onClick={() => {
              setShowVarPicker((open) => !open);
              if (picking) setPicking(false);
              setNewVarKey(uniqueKey(declaredKeys, "media.gallery"));
              setVarError(null);
            }}
            title="Tambah foto dari variabel dinamis"
          >
            <IconVariable size={13} />
            {showVarPicker ? "Tutup" : "+ Variabel"}
          </button>

          {/* Tambah Foto Unggah / Pustaka */}
          <button
            type="button"
            className={styles.galleryAddButton}
            disabled={disabled || atLimit}
            aria-expanded={picking}
            data-testid="gallery-add-images"
            onClick={() => {
              setPicking((open) => !open);
              if (showVarPicker) setShowVarPicker(false);
            }}
          >
            <IconPlus size={13} />
            {picking ? "Tutup" : "Tambah foto"}
          </button>
        </div>
      </div>

      {/* Variabel Picker Drawer */}
      {showVarPicker && (
        <div className={styles.galleryVariablePicker} data-testid="gallery-variable-picker">
          <div className={styles.galleryVariablePickerHeader}>
            <span>Tambah Foto dari Variabel</span>
            <button
              type="button"
              className={styles.closeDrawerBtn}
              onClick={() => setShowVarPicker(false)}
            >
              <IconClose size={13} />
            </button>
          </div>

          {/* Pilih dari variabel yang sudah ada */}
          {declaredImageVars.length > 0 && (
            <div className={styles.galleryVarPickerSection}>
              <span className={styles.fieldLabel}>Pilih Variabel Tersedia:</span>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  className={styles.input}
                  value={selectedVarKey}
                  onChange={(e) => setSelectedVarKey(e.target.value)}
                  data-testid="gallery-var-select"
                >
                  <option value="">-- Pilih Variabel Foto --</option>
                  {declaredImageVars.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label} ({v.key})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.smallButton}
                  disabled={!selectedVarKey}
                  onClick={() => addBoundVariable(selectedVarKey)}
                  data-testid="gallery-add-var-submit"
                >
                  Pilih
                </button>
              </div>
            </div>
          )}

          {/* Atau Buat Variabel Baru */}
          <div className={styles.galleryVarPickerSection}>
            <span className={styles.fieldLabel}>Buat Variabel Foto Baru:</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="text"
                className={styles.input}
                placeholder="misal: media.gallery1 atau couple.moment"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                data-testid="gallery-new-var-input"
              />
              {varError && (
                <span className={styles.errorText} style={{ fontSize: 11 }}>
                  {varError}
                </span>
              )}
              <button
                type="button"
                className={styles.smallButton}
                style={{ background: "var(--dash-accent)", color: "#fff", borderColor: "var(--dash-accent)" }}
                onClick={handleCreateAndAddVariable}
                data-testid="gallery-create-var-submit"
              >
                Buat &amp; Tambahkan ke Galeri
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={styles.galleryEditorEmpty}>
          <IconImages size={22} />
          <strong>Galeri masih kosong</strong>
          <span>Unggah gambar dari pustaka aset atau hubungkan ke variabel dinamis.</span>
        </div>
      ) : (
        <ol className={styles.galleryEditorList} aria-label="Foto galeri">
          {items.map((item, index) => {
            const src = itemSource(item, doc.variables);
            const isBound = Boolean(item.bind);

            return (
              <li
                key={`${item.bind ?? item.assetId ?? item.src}-${index}`}
                className={styles.galleryEditorItem}
                data-testid="gallery-editor-item"
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- same-origin asset or preserved safe legacy URL
                  <img src={src} alt="" className={styles.galleryEditorThumb} />
                ) : (
                  <div className={styles.galleryVarThumb}>
                    <IconVariable size={20} />
                    <span className={styles.galleryVarThumbKey}>{item.bind || "Foto"}</span>
                  </div>
                )}

                <div className={styles.galleryEditorItemBody}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span className={styles.galleryEditorPosition}>Foto {index + 1}</span>
                    {isBound ? (
                      <div className={styles.galleryVarBadge} title={`Variabel: ${item.bind}`}>
                        <IconVariable size={11} />
                        <span>{item.bind}</span>
                      </div>
                    ) : null}
                  </div>

                  <GalleryAltInput
                    key={`${item.bind ?? item.assetId ?? item.src}-${index}-${item.alt}`}
                    value={item.alt}
                    disabled={disabled}
                    label={`Teks alternatif foto ${index + 1}`}
                    onCommit={(alt) => replaceAt(index, { ...item, alt })}
                  />

                  {/* Inline Variable Binding Selector */}
                  {bindingItemIndex === index && (
                    <div className={styles.newVariableBox} style={{ margin: "4px 0" }}>
                      <span style={{ fontSize: 10, fontWeight: 700 }}>Hubungkan ke Variabel:</span>
                      <select
                        className={styles.input}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) handleConvertItemToVariable(index, e.target.value);
                        }}
                      >
                        <option value="">-- Pilih Variabel Foto --</option>
                        {declaredImageVars.map((v) => (
                          <option key={v.key} value={v.key}>
                            {v.label} ({v.key})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => setBindingItemIndex(null)}
                      >
                        Batal
                      </button>
                    </div>
                  )}

                  <div className={styles.galleryEditorActions}>
                    {/* Toggle Variable vs Static */}
                    {isBound ? (
                      <button
                        type="button"
                        className={styles.galleryVarActionBtn}
                        disabled={disabled}
                        title="Lepas variabel dan ubah menjadi foto statis"
                        onClick={() => {
                          const next = [...items];
                          next[index] = { ...item, bind: undefined };
                          commit(next);
                        }}
                        data-testid={`gallery-unbind-btn-${index}`}
                      >
                        Jadikan Statis
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.galleryVarActionBtn}
                        disabled={disabled}
                        title="Hubungkan foto ini ke variabel dinamis"
                        onClick={() => setBindingItemIndex(index)}
                        data-testid={`gallery-bind-btn-${index}`}
                      >
                        <IconVariable size={11} />
                        Variabel
                      </button>
                    )}

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
            );
          })}
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
