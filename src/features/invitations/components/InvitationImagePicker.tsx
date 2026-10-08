"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { listAssetsAction } from "@/features/assets/actions";
import type { AssetSummary } from "@/features/assets/api";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import styles from "./InvitationImagePicker.module.css";

export interface InvitationImagePickerProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly required?: boolean;
  readonly imageOptions?: readonly { readonly id: string; readonly label: string }[];
  readonly workspaceId?: string;
  readonly initialAssets?: readonly AssetSummary[];
  readonly describedBy?: string;
  readonly disabled?: boolean;
}

export function InvitationImagePicker({
  id,
  name,
  label,
  value = "",
  required = false,
  imageOptions = [],
  workspaceId,
  initialAssets = [],
  describedBy,
  disabled = false,
}: InvitationImagePickerProps) {
  const [selectedId, setSelectedId] = useState<string>(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"gallery" | "upload">("gallery");
  const [assets, setAssets] = useState<AssetSummary[]>(() => {
    if (initialAssets.length > 0) return [...initialAssets];
    return imageOptions.map((opt) => ({
      id: opt.id,
      filename: opt.label,
      mimeType: "image/png",
      bytes: 0,
      width: null,
      height: null,
      createdAt: new Date(),
    }));
  });
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const searchInputId = useId();

  // Keep state synchronized if value changes from outside
  useEffect(() => {
    setSelectedId(value);
  }, [value]);

  // Load fresh assets if workspaceId is available when modal opens
  const refreshAssets = useCallback(async () => {
    if (!workspaceId) return;
    const res = await listAssetsAction(workspaceId);
    if (res.ok) {
      setAssets(res.data.filter((a) => a.mimeType.startsWith("image/")));
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      void refreshAssets();
    }
  }, [isOpen, refreshAssets]);

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const commitSelection = (newId: string) => {
    setSelectedId(newId);
    if (selectRef.current) {
      selectRef.current.value = newId;
      selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const handleSelectAsset = (asset: AssetSummary) => {
    commitSelection(asset.id);
    setIsOpen(false);
  };

  const handleRemoveAsset = () => {
    commitSelection("");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (!file.type.startsWith("image/")) {
      setUploadError("Hanya file gambar (JPG, PNG, WEBP, GIF) yang didukung.");
      return;
    }

    if (!workspaceId) {
      setUploadError("Workspace ID tidak ditemukan.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadAssetFile(workspaceId, file);
      if (result.ok) {
        setAssets((prev) => [result.asset, ...prev.filter((a) => a.id !== result.asset.id)]);
        commitSelection(result.asset.id);
        setIsOpen(false);
      } else {
        setUploadError(result.error || "Gagal mengunggah gambar.");
      }
    } catch {
      setUploadError("Terjadi kesalahan saat mengunggah.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Find currently selected asset info
  const currentAsset = assets.find((a) => a.id === selectedId);
  const currentLabel =
    currentAsset?.filename ||
    imageOptions.find((o) => o.id === selectedId)?.label ||
    (selectedId ? "Foto Terpilih" : "");

  const filteredAssets = assets.filter((a) =>
    a.filename.toLowerCase().includes(search.toLowerCase().trim()),
  );

  return (
    <div className={styles.container} data-testid={`image-picker-${id}`}>
      {/* Hidden accessible select element: ensures full compatibility with FormData & component tests */}
      <select
        ref={selectRef}
        id={id}
        name={name}
        value={selectedId}
        aria-label={label}
        onChange={(e) => setSelectedId(e.target.value)}
        required={required}
        aria-describedby={describedBy}
        disabled={disabled}
        className={styles.hiddenAccessibleSelect}
        tabIndex={-1}
      >
        <option value="">-</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.filename}
          </option>
        ))}
      </select>

      {/* Selected Image Card or Empty Dropzone Trigger */}
      {selectedId ? (
        <div className={styles.selectedCard} data-testid="selected-image-card">
          <div className={styles.selectedThumbWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(selectedId)}
              alt={currentLabel}
              className={styles.selectedThumb}
            />
          </div>
          <div className={styles.selectedInfo}>
            <span className={styles.selectedBadge}>✓ Terpilih</span>
            <span className={styles.selectedFilename} title={currentLabel}>
              {currentLabel}
            </span>
          </div>
          <div className={styles.selectedActions}>
            <button
              type="button"
              className={styles.actionButton}
              disabled={disabled}
              onClick={() => {
                setActiveTab("gallery");
                setIsOpen(true);
              }}
              data-testid="change-image-btn"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span>Ganti Foto</span>
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
              disabled={disabled}
              onClick={handleRemoveAsset}
              title="Hapus foto ini"
              data-testid="remove-image-btn"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.emptyTriggerCard}
          disabled={disabled}
          onClick={() => {
            setActiveTab("gallery");
            setIsOpen(true);
          }}
          aria-label="Pilih Foto"
          data-testid="open-image-modal-btn"
        >
          <span className={styles.emptyIconWrapper}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </span>
          <span className={styles.emptyTitle}>Pilih atau Unggah Foto</span>
          <span className={styles.emptySubtitle}>
            Klik untuk memilih dari galeri aset atau unggah foto langsung dari perangkat Anda.
          </span>
        </button>
      )}

      {/* Modal Dialog for Gallery & Upload */}
      {isOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`modal-title-${id}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          data-testid="image-picker-modal"
        >
          <div className={styles.modalDialog}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <h3 id={`modal-title-${id}`} className={styles.modalTitle}>
                  Pilih Foto: {label}
                </h3>
                <p className={styles.modalSubtitle}>
                  Pilih foto dari galeri aset atau unggah foto baru dari perangkat Anda.
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsOpen(false)}
                aria-label="Tutup modal"
                data-testid="close-modal-btn"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.modalTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "gallery"}
                className={`${styles.tabBtn} ${activeTab === "gallery" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab("gallery")}
                data-testid="tab-gallery-btn"
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span>Pilih dari Galeri</span>
                <span className={styles.tabCountBadge}>{assets.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "upload"}
                className={`${styles.tabBtn} ${activeTab === "upload" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab("upload")}
                data-testid="tab-upload-btn"
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <span>Unggah Foto Baru</span>
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {activeTab === "gallery" ? (
                <>
                  {/* Search Bar */}
                  {assets.length > 0 && (
                    <div className={styles.searchBar}>
                      <svg
                        className={styles.searchIcon}
                        width={15}
                        height={15}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        id={searchInputId}
                        type="text"
                        className={styles.searchInput}
                        placeholder="Cari foto berdasarkan nama..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="gallery-search-input"
                      />
                      {search && (
                        <button
                          type="button"
                          className={styles.searchClearBtn}
                          onClick={() => setSearch("")}
                          aria-label="Bersihkan pencarian"
                        >
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Gallery Grid */}
                  {filteredAssets.length > 0 ? (
                    <div className={styles.galleryGrid} data-testid="gallery-grid">
                      {filteredAssets.map((asset) => {
                        const isChosen = asset.id === selectedId;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            className={`${styles.galleryCard} ${isChosen ? styles.galleryCardSelected : ""}`}
                            onClick={() => handleSelectAsset(asset)}
                            title={asset.filename}
                            data-testid={`gallery-card-${asset.id}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={assetUrl(asset.id)}
                              alt={asset.filename}
                              loading="lazy"
                              className={styles.galleryCardImg}
                            />
                            {isChosen && (
                              <div className={styles.selectedCheckmark}>
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </div>
                            )}
                            <div className={styles.galleryCardOverlay}>
                              <span>{asset.filename}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyGalleryState}>
                      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.5}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        {search ? "Tidak ada foto yang cocok dengan pencarian" : "Belum ada foto di galeri"}
                      </p>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => setActiveTab("upload")}
                      >
                        Unggah Foto Sekarang
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Upload Tab */
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => void handleFiles(e.target.files)}
                    data-testid="file-upload-input"
                  />
                  <div
                    className={`${styles.uploadDropzone} ${dragOver ? styles.uploadDropzoneDragOver : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void handleFiles(e.dataTransfer.files);
                    }}
                    data-testid="upload-dropzone"
                  >
                    <span className={styles.uploadIconCircle}>
                      {uploading ? (
                        <svg
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          style={{ animation: "spin 1s linear infinite" }}
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                      )}
                    </span>
                    <span className={styles.uploadTitle}>
                      {uploading ? "Sedang Mengunggah Foto..." : "Klik untuk Memilih File atau Tarik ke Sini"}
                    </span>
                    <span className={styles.uploadSubtitle}>
                      Mendukung format JPG, PNG, WEBP, GIF (maks. 10MB)
                    </span>
                    {uploadError && <div className={styles.uploadErrorMsg}>{uploadError}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setIsOpen(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
