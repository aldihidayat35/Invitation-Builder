"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { assetUrl } from "@/features/assets/urls";
import { savePortalGalleryAction, uploadPortalAssetAction } from "../actions";
import { compressImageClient } from "./image-compressor";
import styles from "./PortalGalleryManager.module.css";

const MAX_GALLERY_PHOTOS = 15;
const ASSET_ID_REGEX = /^[0-9a-f-]{36}$/i;

export interface GalleryItem {
  assetId?: string;
  src?: string;
  alt?: string;
}

interface PortalGalleryManagerProps {
  token: string;
  initialItems?: GalleryItem[];
  previewUrl?: string | null;
  onSaved?: (items: GalleryItem[]) => void;
}

export function PortalGalleryManager({
  token,
  initialItems = [],
  previewUrl,
  onSaved,
}: PortalGalleryManagerProps) {
  const [items, setItems] = useState<GalleryItem[]>(() => [...initialItems]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveImageUrl = (item: GalleryItem): string => {
    if (item.assetId && ASSET_ID_REGEX.test(item.assetId)) {
      return assetUrl(item.assetId);
    }
    if (item.src) return item.src;
    return "";
  };

  const saveGallery = useCallback(
    async (itemsToSave: GalleryItem[]) => {
      setSaveStatus("saving");
      setStatusMessage("Menyimpan galeri foto…");

      try {
        const res = await savePortalGalleryAction(token, itemsToSave);
        if (res.ok) {
          setSaveStatus("saved");
          setStatusMessage(res.message || "Galeri foto tersimpan otomatis.");
          onSaved?.(itemsToSave);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan galeri.");
        }
      } catch (err: unknown) {
        setSaveStatus("error");
        setStatusMessage(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    },
    [token, onSaved],
  );

  const queueAutoSave = useCallback(
    (newItems: GalleryItem[]) => {
      setSaveStatus("dirty");
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        void saveGallery(newItems);
      }, 1200);
    },
    [saveGallery],
  );

  const handleFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (rawFiles.length === 0) {
      alert("Silakan pilih berkas gambar (JPG, PNG, WebP, GIF).");
      return;
    }

    const availableSlots = MAX_GALLERY_PHOTOS - items.length;
    if (availableSlots <= 0) {
      alert(`Batas maksimal ${MAX_GALLERY_PHOTOS} foto galeri telah tercapai.`);
      return;
    }

    const filesToUpload = rawFiles.slice(0, availableSlots);
    if (rawFiles.length > availableSlots) {
      alert(
        `Hanya ${availableSlots} foto yang dapat ditambahkan karena batas maksimal ${MAX_GALLERY_PHOTOS} foto.`,
      );
    }

    setIsUploading(true);
    const newlyUploaded: GalleryItem[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      if (!file) continue;
      setUploadText(
        `Mengompres & mengunggah foto (${i + 1} dari ${filesToUpload.length}): ${file.name}…`,
      );

      try {
        const compressed = await compressImageClient(file);
        const formData = new FormData();
        formData.append("file", compressed);

        const res = await uploadPortalAssetAction(token, formData);
        if (res.ok && res.data) {
          newlyUploaded.push({
            assetId: res.data.assetId,
            alt: file.name.replace(/\.[^.]+$/, "").slice(0, 50),
          });
        } else {
          console.error("Gagal mengunggah foto:", res.error);
        }
      } catch (err) {
        console.error("Error upload foto:", err);
      }
    }

    setIsUploading(false);
    setUploadText("");

    if (newlyUploaded.length > 0) {
      const updated = [...items, ...newlyUploaded];
      setItems(updated);
      void saveGallery(updated);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (index: number) => {
    if (!confirm("Hapus foto ini dari galeri undangan?")) return;
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    void saveGallery(updated);
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const updated = [...items];
    const currentItem = updated[index];
    const targetItem = updated[targetIdx];
    if (!currentItem || !targetItem) return;
    updated[index] = targetItem;
    updated[targetIdx] = currentItem;
    setItems(updated);
    void saveGallery(updated);
  };

  const handleCaptionChange = (index: number, newAlt: string) => {
    const updated = items.map((item, idx) => (idx === index ? { ...item, alt: newAlt } : item));
    setItems(updated);
    queueAutoSave(updated);
  };

  const isAtLimit = items.length >= MAX_GALLERY_PHOTOS;

  return (
    <div className={styles.wrapper}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        disabled={isUploading || isAtLimit}
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Header Info Card */}
      <div className={styles.headerCard}>
        <div className={styles.topRow}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 className={styles.title}>Galeri Foto Undangan</h2>
            <span
              className={`${styles.counterBadge} ${isAtLimit ? styles.counterLimit : ""}`}
            >
              {items.length} / {MAX_GALLERY_PHOTOS} Foto
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.btnSecondary}
              >
                <span>👁️</span>
                <span>Buka Preview</span>
              </a>
            )}
            <button
              type="button"
              disabled={isUploading || isAtLimit}
              onClick={() => fileInputRef.current?.click()}
              className={styles.btnPrimary}
            >
              <span>➕</span>
              <span>Tambah Foto</span>
            </button>
          </div>
        </div>

        <p className={styles.desc}>
          Unggah foto pre-wedding, momen spesial, atau kenangan indah Anda. Foto akan tampil di
          widget galeri undangan digital Anda secara rapi. Maksimal {MAX_GALLERY_PHOTOS} foto.
        </p>

        {/* Save Bar / Notification */}
        <div className={styles.saveBar}>
          <div className={styles.saveStatus}>
            {saveStatus === "saving" && (
              <>
                <div className={styles.spinner} style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span className={styles.saveStatusSaving}>Menyimpan galeri…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <span>✓</span>
                <span className={styles.saveStatusSuccess}>
                  {statusMessage || "Semua perubahan galeri tersimpan."}
                </span>
              </>
            )}
            {saveStatus === "dirty" && <span>✏️ Ada perubahan belum tersimpan…</span>}
            {saveStatus === "error" && (
              <span style={{ color: "#dc2626" }}>⚠️ {statusMessage || "Gagal menyimpan."}</span>
            )}
          </div>

          {saveStatus === "dirty" && (
            <button
              type="button"
              onClick={() => void saveGallery(items)}
              className={styles.btnPrimary}
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
            >
              Simpan Sekarang
            </button>
          )}
        </div>
      </div>

      {/* Uploading Status */}
      {isUploading && (
        <div className={styles.uploadProgressBox}>
          <div className={styles.spinner} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#23180d" }}>
              {uploadText || "Mengunggah foto…"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#8c7d6f" }}>
              Gambar otomatis dikompres untuk menghemat kuota dan mempercepat tampilan tamu.
            </div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      {!isAtLimit && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isUploading) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ""} ${
            isUploading ? styles.dropzoneDisabled : ""
          }`}
        >
          <div className={styles.dropzoneIcon}>🖼️</div>
          <div className={styles.dropzoneTitle}>Tarik & Letakkan Foto Anda di Sini</div>
          <div className={styles.dropzoneSubtitle}>
            Bisa pilih beberapa foto sekaligus • Format JPG, PNG, WebP (Maks. 15MB per foto)
          </div>
        </div>
      )}

      {/* Gallery Items Grid */}
      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📷</div>
          <h3 className={styles.emptyTitle}>Belum Ada Foto Galeri</h3>
          <p className={styles.emptyDesc}>
            Klik tombol &quot;Tambah Foto&quot; di atas untuk mulai menambahkan foto momen bahagia Anda
            ke dalam undangan pernikahan.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.btnPrimary}
          >
            Pilih Foto Pertama
          </button>
        </div>
      ) : (
        <div className={styles.galleryGrid}>
          {items.map((item, idx) => {
            const url = resolveImageUrl(item);
            return (
              <div key={item.assetId || item.src || idx} className={styles.galleryCard}>
                <div className={styles.thumbContainer}>
                  <img
                    src={url}
                    alt={item.alt || `Foto ${idx + 1}`}
                    className={styles.thumbImg}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23ccc'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23666'%3ENo Preview%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className={styles.orderBadge}>#{idx + 1}</div>
                </div>

                <div className={styles.cardBody}>
                  <input
                    type="text"
                    value={item.alt || ""}
                    placeholder="Keterangan foto (opsional)…"
                    onChange={(e) => handleCaptionChange(idx, e.target.value)}
                    className={styles.captionInput}
                    maxLength={100}
                  />

                  <div className={styles.cardFooter}>
                    <div className={styles.orderButtons}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        title="Geser ke kiri / urutan sebelumnya"
                        onClick={() => handleMove(idx, -1)}
                        className={styles.iconBtn}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        disabled={idx === items.length - 1}
                        title="Geser ke kanan / urutan berikutnya"
                        onClick={() => handleMove(idx, 1)}
                        className={styles.iconBtn}
                      >
                        ▶
                      </button>
                    </div>

                    <button
                      type="button"
                      title="Hapus foto ini"
                      onClick={() => handleRemove(idx)}
                      className={`${styles.iconBtn} ${styles.deleteBtn}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
