"use client";

import { useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { parseFrameImage } from "@/features/widgets/runtime/PhotoFrameWidget";
import { AssetLibrary } from "./AssetLibrary";
import { IconImages, IconTrash } from "./icons";
import styles from "./editor.module.css";

export function PhotoFrameImageControl({
  value,
  disabled,
  onChange,
}: {
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (value: unknown) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const currentSrc = parseFrameImage(value);

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

  return (
    <div className={styles.photoFrameControl} data-testid="photo-frame-image-control">
      {/* Current Photo / Placeholder Preview */}
      <div className={styles.photoFrameThumbWrapper}>
        {currentSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentSrc} alt="Preview foto" className={styles.photoFrameThumbImg} />
        ) : (
          <div className={styles.photoFrameCanvaPlaceholderThumb}>
            <span className={styles.canvaIconEmoji}>🏞️</span>
            <span className={styles.canvaThumbText}>Canva Cloud &amp; Hill Slot</span>
          </div>
        )}
      </div>

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
              ✕
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
    </div>
  );
}
