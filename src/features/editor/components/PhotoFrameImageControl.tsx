"use client";

import { useEffect, useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { parseFrameImage } from "@/features/widgets/runtime/PhotoFrameWidget";
import { isBindingCompatible, variableKeySchema } from "@/lib/schema";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { AssetLibrary } from "./AssetLibrary";
import { IconClose, IconImages, IconLandscape, IconTrash, IconVariable, IconPlus } from "./icons";
import styles from "./editor.module.css";

function labelFromKey(key: string): string {
  const text = key.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function uniqueKey(taken: ReadonlySet<string>, base: string): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}

export function PhotoFrameImageControl({
  value,
  disabled,
  onChange,
}: {
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (value: unknown) => void;
}) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);

  const isBound =
    typeof value === "object" &&
    value !== null &&
    "bind" in value &&
    typeof (value as { bind: unknown }).bind === "string";
  const boundKey = isBound ? (value as { bind: string }).bind : undefined;

  const [activeTab, setActiveTab] = useState<"static" | "variable">(() =>
    isBound ? "variable" : "static",
  );

  // Keep tab updated if value binding changes externally
  useEffect(() => {
    if (isBound) {
      setActiveTab("variable");
    }
  }, [isBound]);

  const [picking, setPicking] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Variable creation state
  const [creatingVar, setCreatingVar] = useState(false);
  const [newVarKey, setNewVarKey] = useState("");
  const [varError, setVarError] = useState<string | null>(null);

  const declaredImageVars = doc.variables.filter(
    (v) => v.type === "image" || v.type === "url" || isBindingCompatible("image", v.type),
  );
  const declaredKeys = new Set(doc.variables.map((v) => v.key));

  const currentSrc = parseFrameImage(value, doc.variables);

  const handlePickAsset = (asset: AssetSummary) => {
    onChange({ assetId: asset.id });
    setPicking(false);
  };

  const handleRemovePhoto = () => {
    onChange(undefined);
  };

  const handleApplyUrl = () => {
    const trimmed = urlDraft.trim();
    if (trimmed) {
      onChange(trimmed);
      setUrlDraft("");
      setShowUrlInput(false);
    }
  };

  const handleSelectVariable = (key: string) => {
    if (!key) {
      onChange(undefined);
    } else {
      onChange({ bind: key });
    }
  };

  const handleStartCreateVariable = () => {
    setNewVarKey(uniqueKey(declaredKeys, "photo.frame"));
    setVarError(null);
    setCreatingVar(true);
  };

  const handleCreateVariable = () => {
    const key = newVarKey.trim();
    if (!variableKeySchema.safeParse(key).success) {
      setVarError("Kunci harus berupa dot path, mis. couple.bride.photo atau photo.frame1");
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

    setCreatingVar(false);
    onChange({ bind: key });
  };

  return (
    <div className={styles.photoFrameControl} data-testid="photo-frame-image-control">
      {/* Tab Switcher: Foto Statis vs Variabel Dinamis */}
      <div className={styles.photoModeSwitcher} role="tablist" aria-label="Mode Sumber Foto">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "static"}
          className={`${styles.photoModeBtn} ${activeTab === "static" ? styles.photoModeBtnActive : ""}`}
          onClick={() => {
            setActiveTab("static");
            if (isBound) {
              onChange(undefined);
            }
          }}
          data-testid="photo-mode-static"
        >
          <IconImages size={13} />
          <span>Foto Statis</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "variable"}
          className={`${styles.photoModeBtn} ${activeTab === "variable" ? styles.photoModeBtnActive : ""}`}
          onClick={() => setActiveTab("variable")}
          data-testid="photo-mode-variable"
        >
          <IconVariable size={13} />
          <span>Variabel Dinamis</span>
        </button>
      </div>

      {/* Current Photo / Placeholder Preview */}
      <div className={styles.photoFrameThumbWrapper}>
        {currentSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentSrc} alt="Preview foto" className={styles.photoFrameThumbImg} />
        ) : (
          <div className={styles.photoFrameCanvaPlaceholderThumb}>
            <span
              className={styles.canvaIconEmoji}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <IconLandscape size={32} />
            </span>
            <span className={styles.canvaThumbText}>
              {boundKey ? `{${boundKey}}` : "Slot Foto Bingkai (Canva Frame)"}
            </span>
          </div>
        )}

        {isBound && (
          <div className={styles.variableThumbBadge} title={`Terhubung ke variabel: ${boundKey}`}>
            <IconVariable size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
            {`{${boundKey}}`}
          </div>
        )}
      </div>

      {activeTab === "static" ? (
        <>
          <div className={styles.photoFrameActionsRow}>
            <button
              type="button"
              className={styles.primaryActionButton}
              disabled={disabled}
              onClick={() => setPicking((prev) => !prev)}
              data-testid="photo-frame-pick-btn"
            >
              <IconImages size={14} />
              {currentSrc ? "Ganti Foto" : "Pilih / Unggah Foto"}
            </button>

            {currentSrc && (
              <button
                type="button"
                className={styles.ghostIconButton}
                disabled={disabled}
                onClick={handleRemovePhoto}
                title="Hapus foto (kembali ke placeholder)"
                data-testid="photo-frame-remove-btn"
              >
                <IconTrash size={14} />
              </button>
            )}
          </div>

          {/* Optional URL Toggle */}
          <div className={styles.photoFrameUrlSection}>
            <button
              type="button"
              className={styles.urlToggleLink}
              disabled={disabled}
              onClick={() => setShowUrlInput((v) => !v)}
            >
              {showUrlInput ? "− Tutup input URL" : "+ Masukkan link URL gambar"}
            </button>
            {showUrlInput && (
              <div className={styles.urlInputRow}>
                <input
                  type="url"
                  className={styles.input}
                  placeholder="https://example.com/foto.jpg"
                  value={urlDraft}
                  disabled={disabled}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.smallButton}
                  disabled={disabled || !urlDraft.trim()}
                  onClick={handleApplyUrl}
                >
                  Pasang
                </button>
              </div>
            )}
          </div>

          {/* Asset Library Picker Drawer / Modal */}
          {picking && (
            <div className={styles.photoFrameLibraryDrawer} data-testid="photo-frame-library-drawer">
              <div className={styles.libraryDrawerHeader}>
                <span className={styles.libraryDrawerTitle}>Pustaka Aset &amp; Unggah</span>
                <button
                  type="button"
                  className={styles.closeDrawerBtn}
                  onClick={() => setPicking(false)}
                >
                  <IconClose size={13} />
                </button>
              </div>
              <AssetLibrary
                idPrefix="photo-frame"
                pickLabel="Gunakan untuk bingkai"
                onPick={handlePickAsset}
                onUploaded={handlePickAsset}
                disabled={disabled}
              />
            </div>
          )}
        </>
      ) : (
        /* Variabel Dinamis Tab */
        <div className={styles.variableControlBox} data-testid="photo-variable-controls">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className={styles.fieldLabel} htmlFor="photo-frame-var-select">
              Pilih Variabel Foto
            </label>
            <select
              id="photo-frame-var-select"
              className={styles.input}
              value={boundKey ?? ""}
              disabled={disabled}
              onChange={(e) => handleSelectVariable(e.target.value)}
              data-testid="photo-frame-var-select"
            >
              <option value="">-- Pilih Variabel Foto --</option>
              {declaredImageVars.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label} ({v.key})
                </option>
              ))}
              {boundKey && !declaredImageVars.some((v) => v.key === boundKey) && (
                <option value={boundKey}>{boundKey} (runtime)</option>
              )}
            </select>
          </div>

          {boundKey && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <div className={styles.variableChip}>
                <IconVariable size={12} />
                <span>{boundKey}</span>
              </div>
              <button
                type="button"
                className={styles.smallButton}
                disabled={disabled}
                onClick={() => {
                  onChange(undefined);
                  setActiveTab("static");
                }}
                data-testid="photo-frame-unbind-btn"
              >
                Lepas Variabel
              </button>
            </div>
          )}

          {/* + Buat Variabel Baru */}
          {!disabled && (
            creatingVar ? (
              <div className={styles.newVariableBox} data-testid="photo-new-var-box">
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text)" }}>
                  Buat Variabel Foto Baru
                </span>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="misal: couple.moment.photo"
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  data-testid="photo-new-var-input"
                />
                {varError && (
                  <span className={styles.errorText} style={{ fontSize: 11 }}>
                    {varError}
                  </span>
                )}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => setCreatingVar(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className={styles.smallButton}
                    style={{ background: "var(--dash-accent)", color: "#fff", borderColor: "var(--dash-accent)" }}
                    onClick={handleCreateVariable}
                    data-testid="photo-create-var-submit"
                  >
                    Buat &amp; Hubungkan
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.smallButton}
                style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 4 }}
                onClick={handleStartCreateVariable}
                data-testid="photo-start-create-var"
              >
                <IconPlus size={12} />
                <span>+ Buat Variabel Baru</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
