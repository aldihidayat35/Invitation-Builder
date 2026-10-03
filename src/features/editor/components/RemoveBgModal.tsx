"use client";

import { useEffect, useRef, useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { uploadBlobAsAsset } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import {
  applyBackgroundRemovalToImageData,
  removeImageBackground,
  sampleBackgroundCorners,
  type RGBColor,
} from "../utils/remove-background";
import {
  IconCheck,
  IconClose,
  IconDropper,
  IconEye,
  IconReplay,
  IconWand,
} from "./icons";
import styles from "./editor.module.css";

export interface RemoveBgModalProps {
  readonly assetId: string;
  readonly filename?: string;
  readonly workspaceId: string;
  readonly onClose: () => void;
  readonly onProcessed: (newAsset: AssetSummary) => void;
}

type BackdropType = "checkerboard" | "dark" | "light" | "green";

function rgbToHex({ r, g, b }: RGBColor): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function RemoveBgModal({
  assetId,
  filename = "gambar",
  workspaceId,
  onClose,
  onProcessed,
}: RemoveBgModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Settings
  const [tolerance, setTolerance] = useState<number>(25);
  const [feather, setFeather] = useState<number>(2);
  const [contiguousOnly, setContiguousOnly] = useState<boolean>(true);
  const [customKeyColor, setCustomKeyColor] = useState<RGBColor | null>(null);
  const [detectedKeyColor, setDetectedKeyColor] = useState<RGBColor>({ r: 255, g: 255, b: 255 });
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropType>("checkerboard");

  // Output feedback
  const [removedPercent, setRemovedPercent] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Canvas preview
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewDataRef = useRef<ImageData | null>(null);

  // Load image
  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setLoadError("Gagal memuat gambar untuk penghapusan latar.");
    };
    img.src = assetUrl(assetId);
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // Run preview processing whenever parameters change
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    setProcessing(true);
    const canvas = canvasRef.current;
    const nw = image.naturalWidth || image.width;
    const nh = image.naturalHeight || image.height;

    // Use scaled preview size for instant interactive responsiveness
    const maxPreviewSize = 800;
    const previewScale = Math.min(1, maxPreviewSize / Math.max(nw, nh));
    const pw = Math.max(1, Math.round(nw * previewScale));
    const ph = Math.max(1, Math.round(nh * previewScale));

    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(image, 0, 0, pw, ph);
    const imageData = ctx.getImageData(0, 0, pw, ph);

    // Sample default background color if not custom
    const autoColor = sampleBackgroundCorners(imageData);
    setDetectedKeyColor(autoColor);

    const activeColor = customKeyColor ?? autoColor;

    const { removedPixels } = applyBackgroundRemovalToImageData(imageData, {
      tolerance,
      feather,
      contiguousOnly,
      customKeyColor: activeColor,
      despill: true,
    });

    previewDataRef.current = imageData;
    ctx.putImageData(imageData, 0, 0);

    const percent = Math.round((removedPixels / (pw * ph)) * 100);
    setRemovedPercent(percent);
    setProcessing(false);
  }, [image, tolerance, feather, contiguousOnly, customKeyColor]);

  // Handle clicking on image to pick a specific color
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isPickingColor || !canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw original to sample raw pixel color accurately
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const p = tempCtx.getImageData(x, y, 1, 1).data;

    setCustomKeyColor({ r: p[0] ?? 255, g: p[1] ?? 255, b: p[2] ?? 255 });
    setIsPickingColor(false);
  }


  // Apply final removal to full-res image and upload as new asset
  async function handleApply() {
    if (!image || saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      const activeColor = customKeyColor ?? detectedKeyColor;
      const blob = await removeImageBackground(image, {
        tolerance,
        feather,
        contiguousOnly,
        customKeyColor: activeColor,
        despill: true,
      });

      const cleanBaseName = filename.replace(/\.[^/.]+$/, "");
      const newFilename = `${cleanBaseName}-nobg.png`;
      const res = await uploadBlobAsAsset(workspaceId, blob, newFilename);

      if (!res.ok) {
        setSaveError(res.error);
        setSaving(false);
        return;
      }

      onProcessed(res.asset);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal memproses penghapusan latar belakang.");
      setSaving(false);
    }
  }

  const currentColor = customKeyColor ?? detectedKeyColor;

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="removebg-modal-title"
      data-testid="remove-bg-modal"
    >
      <div className={styles.modalCard}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <div className={styles.modalTitleIcon}>
              <IconWand size={18} />
            </div>
            <div>
              <h2 id="removebg-modal-title" className={styles.modalTitle}>
                Hapus Latar Belakang (Remove BG)
              </h2>
              <p className={styles.modalSubtitle}>
                Hapus latar belakang foto secara otomatis dengan hasil potongan transparan.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup dialog"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {loadError ? (
            <div className={styles.errorNotice} role="alert">
              {loadError}
            </div>
          ) : !image ? (
            <div className={styles.loadingArea}>
              <div className={styles.spinner} />
              <span>Memproses analisis gambar...</span>
            </div>
          ) : (
            <div className={styles.removeBgGrid}>
              {/* Preview Area */}
              <div className={styles.removeBgPreviewCol}>
                {/* Stage toolbar */}
                <div className={styles.removeBgStageBar}>
                  <div className={styles.backdropSelector}>
                    <span className={styles.stageBarLabel}>Latar pratinjau:</span>
                    <button
                      type="button"
                      className={`${styles.backdropBtn} ${backdrop === "checkerboard" ? styles.backdropBtnActive : ""}`}
                      onClick={() => setBackdrop("checkerboard")}
                      title="Papan catur transparan"
                    >
                      Papan Catur
                    </button>
                    <button
                      type="button"
                      className={`${styles.backdropBtn} ${backdrop === "dark" ? styles.backdropBtnActive : ""}`}
                      onClick={() => setBackdrop("dark")}
                      title="Latar Gelap"
                    >
                      Gelap
                    </button>
                    <button
                      type="button"
                      className={`${styles.backdropBtn} ${backdrop === "light" ? styles.backdropBtnActive : ""}`}
                      onClick={() => setBackdrop("light")}
                      title="Latar Terang"
                    >
                      Terang
                    </button>
                    <button
                      type="button"
                      className={`${styles.backdropBtn} ${backdrop === "green" ? styles.backdropBtnActive : ""}`}
                      onClick={() => setBackdrop("green")}
                      title="Hijau Kontras"
                    >
                      Kontras
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`${styles.iconGhostBtn} ${showOriginal ? styles.iconGhostBtnActive : ""}`}
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    title="Tahan untuk melihat gambar asli"
                  >
                    <IconEye size={14} />
                    <span>Lihat Asli</span>
                  </button>
                </div>

                {/* Canvas Display */}
                <div
                  className={`${styles.removeBgStage} ${
                    backdrop === "checkerboard"
                      ? styles.checkerboardPattern
                      : backdrop === "dark"
                      ? styles.stageDark
                      : backdrop === "light"
                      ? styles.stageLight
                      : styles.stageGreen
                  } ${isPickingColor ? styles.stageDropperActive : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(assetId)}
                    alt=""
                    className={styles.removeBgOriginalImg}
                    style={{ display: showOriginal ? "block" : "none" }}
                  />
                  <canvas
                    ref={canvasRef}
                    className={styles.removeBgCanvas}
                    style={{ display: showOriginal ? "none" : "block" }}
                    onClick={handleCanvasClick}
                  />

                  {processing ? (
                    <div className={styles.stageOverlayProcessing}>
                      <div className={styles.miniSpinner} />
                      <span>Memperbarui preview...</span>
                    </div>
                  ) : null}

                  {isPickingColor ? (
                    <div className={styles.dropperBanner}>
                      <IconDropper size={14} />
                      <span>Klik pada area latar belakang gambar untuk memilih warnanya</span>
                    </div>
                  ) : null}
                </div>

                <div className={styles.cropInfoRow}>
                  <span className={styles.cropDimBadge}>
                    Area dihapus: <strong>{removedPercent}%</strong>
                  </span>
                  <span className={styles.cropDimBadgeMuted}>
                    Dimensi: {image.naturalWidth} × {image.naturalHeight} px
                  </span>
                </div>
              </div>

              {/* Controls Column */}
              <div className={styles.removeBgControlsCol}>
                <div className={styles.settingCard}>
                  <div className={styles.settingRow}>
                    <span className={styles.settingLabel}>Warna Latar Terdeteksi</span>
                    <div className={styles.colorSwatchRow}>
                      <div
                        className={styles.colorSwatchBox}
                        style={{
                          backgroundColor: `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`,
                        }}
                        title={rgbToHex(currentColor)}
                      />
                      <span className={styles.colorHexText}>{rgbToHex(currentColor)}</span>
                    </div>
                  </div>

                  <div className={styles.buttonActionRow}>
                    <button
                      type="button"
                      className={`${styles.ghostBtn} ${isPickingColor ? styles.ghostBtnActive : ""}`}
                      onClick={() => setIsPickingColor((p) => !p)}
                    >
                      <IconDropper size={14} />
                      {isPickingColor ? "Batal Pipet" : "Pilih Warna (Pipet)"}
                    </button>
                    {customKeyColor ? (
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => setCustomKeyColor(null)}
                        title="Kembali ke deteksi otomatis"
                      >
                        <IconReplay size={14} />
                        Auto
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Sliders */}
                <div className={styles.settingCard}>
                  <div className={styles.sliderControl}>
                    <div className={styles.sliderHeader}>
                      <label htmlFor="bg-tolerance" className={styles.settingLabel}>
                        Toleransi Warna
                      </label>
                      <span className={styles.sliderValBadge}>{tolerance}%</span>
                    </div>
                    <input
                      id="bg-tolerance"
                      type="range"
                      min={5}
                      max={75}
                      step={1}
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className={styles.rangeInput}
                    />
                    <p className={styles.sliderHint}>
                      Tingkatkan jika masih ada sisa warna latar di sekeliling objek.
                    </p>
                  </div>

                  <div className={styles.sliderControl}>
                    <div className={styles.sliderHeader}>
                      <label htmlFor="bg-feather" className={styles.settingLabel}>
                        Kehalusan Tepi (Feather)
                      </label>
                      <span className={styles.sliderValBadge}>{feather} px</span>
                    </div>
                    <input
                      id="bg-feather"
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={feather}
                      onChange={(e) => setFeather(Number(e.target.value))}
                      className={styles.rangeInput}
                    />
                    <p className={styles.sliderHint}>
                      Menghilangkan efek garis kasar bergerigi di tepian potongan.
                    </p>
                  </div>
                </div>

                <div className={styles.settingCard}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={contiguousOnly}
                      onChange={(e) => setContiguousOnly(e.target.checked)}
                      className={styles.checkboxInput}
                    />
                    <div>
                      <strong className={styles.checkboxTitle}>
                        Hanya hapus yang terhubung ke tepi
                      </strong>
                      <p className={styles.checkboxDesc}>
                        Mencegah warna pakaian atau kulit di bagian dalam ikut terhapus. Nonaktifkan
                        jika ingin menghapus semua lubang latar.
                      </p>
                    </div>
                  </label>
                </div>

                {saveError ? (
                  <div className={styles.errorNotice} role="alert">
                    {saveError}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={onClose}
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={handleApply}
            disabled={!image || saving}
            data-testid="apply-remove-bg-btn"
          >
            {saving ? (
              <>
                <div className={styles.miniSpinner} />
                <span>Menyimpan gambar transparan...</span>
              </>
            ) : (
              <>
                <IconCheck size={16} />
                <span>Terapkan &amp; Simpan Transparan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
