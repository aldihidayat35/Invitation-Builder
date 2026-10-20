"use client";

import React, { useRef, useState } from "react";
import { assetUrl } from "@/features/assets/urls";
import { uploadPortalAssetAction } from "../actions";
import { compressImageClient } from "./image-compressor";
import styles from "./PortalImageField.module.css";

const ASSET_ID_REGEX = /^[0-9a-f-]{36}$/i;

interface PortalImageFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  disabled?: boolean;
  token: string;
  onChange: (newVal: string) => void;
  error?: string;
}

export function PortalImageField({
  id,
  name,
  label,
  value,
  disabled = false,
  token,
  onChange,
  error,
}: PortalImageFieldProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolveImageUrl = (val: string): string => {
    if (!val) return "";
    if (ASSET_ID_REGEX.test(val)) {
      return assetUrl(val);
    }
    return val;
  };

  const handleFile = async (file: File) => {
    if (disabled || isUploading) return;
    setLocalError(null);

    // Basic MIME check
    if (!file.type.startsWith("image/")) {
      setLocalError("Berkas yang dipilih harus berupa gambar.");
      return;
    }

    setIsUploading(true);
    try {
      // Compress large images on client side
      const processedFile = await compressImageClient(file);

      const formData = new FormData();
      formData.append("file", processedFile);

      const res = await uploadPortalAssetAction(token, formData);
      if (res.ok && res.data) {
        onChange(res.data.assetId);
      } else {
        setLocalError(res.error || "Gagal mengunggah foto.");
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const currentUrl = resolveImageUrl(value);

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        disabled={disabled || isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <input type="hidden" id={id} name={name} value={value} />

      {isUploading ? (
        <div className={styles.uploadingBox}>
          <div className={styles.spinner} />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#3f2e1e" }}>
              Mengunggah & memproses foto…
            </div>
            <div style={{ fontSize: "0.75rem", color: "#8c7d6f" }}>
              Mohon tunggu beberapa saat.
            </div>
          </div>
        </div>
      ) : currentUrl ? (
        <div className={styles.previewWrapper}>
          <img
            src={currentUrl}
            alt={label}
            className={styles.previewThumb}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23ccc'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23666'%3ENo Preview%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className={styles.previewInfo}>
            <span className={styles.previewLabel}>{label}</span>
            <div className={styles.previewActions}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className={styles.btnAction}
              >
                🔄 Ganti Foto
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("")}
                className={`${styles.btnAction} ${styles.btnDanger}`}
              >
                🗑️ Hapus
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ""} ${
            disabled ? styles.disabled : ""
          }`}
        >
          <div className={styles.dropzoneIcon}>📷</div>
          <div className={styles.dropzoneTitle}>Pilih atau Tarik Foto ke Sini</div>
          <div className={styles.dropzoneSub}>
            Format JPG, PNG, WebP, GIF (Maks. 15MB)
          </div>
        </div>
      )}

      {(localError || error) && (
        <span className={styles.errorText}>⚠️ {localError || error}</span>
      )}
    </div>
  );
}
