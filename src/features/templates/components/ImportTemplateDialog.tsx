"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import JSZip from "jszip";
import {
  IconDownload,
  IconPackage,
  IconUpload,
  IconCheckCircle,
  IconLayers,
  IconSmartphone,
} from "./template-icons";
import styles from "./templates.module.css";

interface PackageSummary {
  name: string;
  sectionsCount: number;
  elementsCount: number;
  assetsCount: number;
  versionsCount: number;
  fileName: string;
  fileSizeFormatted: string;
}

export function ImportTemplateDialog({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [summary, setSummary] = useState<PackageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSelectedFile(null);
    setSummary(null);
    setError(null);
    setUploading(false);
    setInspecting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpen = () => {
    reset();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (uploading) return;
    setIsOpen(false);
    reset();
  };

  const inspectZip = async (file: File) => {
    setError(null);
    setSelectedFile(file);
    setInspecting(true);

    try {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const manifestFile = zip.file("template.json");

      if (!manifestFile) {
        throw new Error(
          "Berkas ZIP tidak memuat berkas template.json. Pastikan berkas berasal dari ekspor template yang valid.",
        );
      }

      const raw = await manifestFile.async("string");
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object" || !parsed.name || !parsed.document) {
        throw new Error("Format template.json di dalam berkas tidak sesuai.");
      }

      const sections = Array.isArray(parsed.document.sections) ? parsed.document.sections : [];
      let totalElements = 0;
      for (const s of sections) {
        if (Array.isArray(s.elements)) totalElements += s.elements.length;
      }

      const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
      const versions = Array.isArray(parsed.versions) ? parsed.versions : [];

      const sizeKb = (file.size / 1024).toFixed(1);
      const sizeFormatted = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeKb} KB`;

      setSummary({
        name: parsed.name,
        sectionsCount: sections.length,
        elementsCount: totalElements,
        assetsCount: assets.length,
        versionsCount: versions.length,
        fileName: file.name,
        fileSizeFormatted: sizeFormatted,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memeriksa file ZIP.");
      setSummary(null);
    } finally {
      setInspecting(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) inspectZip(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setError("Hanya berkas berformat .zip yang didukung.");
        return;
      }
      inspectZip(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("workspaceId", workspaceId);

    try {
      const res = await fetch("/api/templates/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Gagal mengimpor template (${res.status}).`);
      }

      if (data.ok && data.templateId) {
        window.location.href = `/dashboard/templates/${data.templateId}`;
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah.");
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.importTriggerBtn}
        onClick={handleOpen}
        data-testid="import-template-trigger"
      >
        <IconUpload size={16} />
        <span>Impor Template (.zip)</span>
      </button>

      {isOpen ? (
        <div className={styles.modalBackdrop} onClick={handleClose}>
          <div
            className={styles.importModalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-dialog-title"
          >
            <div className={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={styles.modalIconBox}>
                  <IconPackage size={20} />
                </span>
                <div>
                  <h2 id="import-dialog-title" className={styles.modalTitle}>
                    Impor Paket Template
                  </h2>
                  <p className={styles.modalSubtitle}>
                    Pindahkan template undangan dari server atau aplikasi lain menggunakan file arsip (.zip).
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={handleClose}
                disabled={uploading}
                aria-label="Tutup dialog"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {!summary ? (
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    style={{ display: "none" }}
                    onChange={onFileChange}
                    data-testid="import-file-input"
                  />
                  <div className={styles.dropZoneIcon}>
                    <IconUpload size={32} />
                  </div>
                  <h3 className={styles.dropZoneTitle}>
                    {inspecting ? "Memeriksa berkas ZIP…" : "Pilih atau Tarik File Template (.zip)"}
                  </h3>
                  <p className={styles.dropZoneHint}>
                    Paket file ZIP yang berisi <code>template.json</code> dan berkas aset media.
                  </p>
                  <button type="button" className={styles.secondarySmall} disabled={inspecting}>
                    Pilih Berkas dari Komputer
                  </button>
                </div>
              ) : (
                <div className={styles.packageSummaryCard}>
                  <div className={styles.packageSummaryHead}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className={styles.packageCheckIcon}>
                        <IconCheckCircle size={22} />
                      </span>
                      <div>
                        <strong className={styles.packageNameTitle}>{summary.name}</strong>
                        <span className={styles.packageFileMeta}>
                          {summary.fileName} · {summary.fileSizeFormatted}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.changeFileBtn}
                      onClick={reset}
                      disabled={uploading}
                    >
                      Ganti Berkas
                    </button>
                  </div>

                  <div className={styles.packageStatsGrid}>
                    <div className={styles.packageStatBox}>
                      <span className={styles.packageStatLabel}>Bagian Undangan</span>
                      <strong className={styles.packageStatVal}>
                        {summary.sectionsCount} Section
                      </strong>
                    </div>
                    <div className={styles.packageStatBox}>
                      <span className={styles.packageStatLabel}>Objek / Elemen</span>
                      <strong className={styles.packageStatVal}>
                        {summary.elementsCount} Elemen
                      </strong>
                    </div>
                    <div className={styles.packageStatBox}>
                      <span className={styles.packageStatLabel}>Aset Media Lokal</span>
                      <strong className={styles.packageStatVal}>
                        {summary.assetsCount} Berkas
                      </strong>
                    </div>
                    <div className={styles.packageStatBox}>
                      <span className={styles.packageStatLabel}>Riwayat Versi</span>
                      <strong className={styles.packageStatVal}>
                        {summary.versionsCount} Versi
                      </strong>
                    </div>
                  </div>

                  <p className={styles.packageNoticeText}>
                    💡 Seluruh media dan konfigurasi akan diunggah ke workspace ini. Jika nama template sudah ada, sistem otomatis menambahkan pembeda nama.
                  </p>
                </div>
              )}

              {error ? (
                <p role="alert" className={styles.formError}>
                  {error}
                </p>
              ) : null}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondary}
                onClick={handleClose}
                disabled={uploading}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={handleSubmit}
                disabled={!summary || uploading || inspecting}
                data-testid="confirm-import-button"
              >
                {uploading ? "Sedang Mengimpor Template…" : "Impor Template Sekarang"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
