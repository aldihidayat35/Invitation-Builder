"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { uploadBlobAsAsset } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import {
  clampCropRect,
  constrainCropToAspectRatio,
  renderCroppedImageToBlob,
  type CropRect,
} from "../utils/crop-image";
import {
  IconCheck,
  IconClose,
  IconCrop,
  IconFlipH,
  IconFlipV,
  IconReplay,
  IconRotateLeft,
  IconRotateRight,
} from "./icons";
import styles from "./editor.module.css";

export interface ImageCropModalProps {
  readonly assetId: string;
  readonly filename?: string;
  readonly workspaceId: string;
  readonly onClose: () => void;
  readonly onCropped: (newAsset: AssetSummary, newAspectRatio: number) => void;
}

type AspectRatioPreset = {
  label: string;
  value: number | null; // width / height
};

const PRESETS: readonly AspectRatioPreset[] = [
  { label: "Bebas", value: null },
  { label: "1:1 Persegi", value: 1 },
  { label: "4:5 Potret", value: 4 / 5 },
  { label: "3:4 Klasik", value: 3 / 4 },
  { label: "16:9 Lanskap", value: 16 / 9 },
  { label: "9:16 Story", value: 9 / 16 },
];

export function ImageCropModal({
  assetId,
  filename = "gambar",
  workspaceId,
  onClose,
  onCropped,
}: ImageCropModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Display container scale
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Crop & Transform state in natural image pixels
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Interaction tracking (drag crop box or resize handles)
  const dragRef = useRef<{
    type: "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    startX: number;
    startY: number;
    initialCrop: CropRect;
  } | null>(null);

  // Load image
  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      setNaturalSize({ width: nw, height: nh });
      setImage(img);
      // Default crop: full image
      setCrop({ x: 0, y: 0, width: nw, height: nh });
    };
    img.onerror = () => {
      if (!cancelled) setLoadError("Gagal memuat gambar.");
    };
    img.src = assetUrl(assetId);
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // Recalculate rendered image display dimensions
  const updateDisplayDimensions = useCallback(() => {
    if (!imgRef.current || naturalSize.width === 0) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDisplaySize({ width: rect.width, height: rect.height });
    }
  }, [naturalSize.width]);

  useEffect(() => {
    updateDisplayDimensions();
    window.addEventListener("resize", updateDisplayDimensions);
    return () => window.removeEventListener("resize", updateDisplayDimensions);
  }, [updateDisplayDimensions, image, rotation]);

  const scale = naturalSize.width > 0 && displaySize.width > 0 ? displaySize.width / naturalSize.width : 1;

  // Apply aspect ratio preset
  function handleSelectRatio(ratio: number | null) {
    setSelectedRatio(ratio);
    if (!naturalSize.width || !naturalSize.height) return;

    if (ratio === null) return; // Keep current box

    const constrained = constrainCropToAspectRatio(
      naturalSize.width * 0.85,
      naturalSize.height * 0.85,
      ratio,
    );
    const newCrop: CropRect = {
      x: Math.round((naturalSize.width - constrained.width) / 2),
      y: Math.round((naturalSize.height - constrained.height) / 2),
      width: constrained.width,
      height: constrained.height,
    };
    setCrop(clampCropRect(newCrop, naturalSize.width, naturalSize.height));
  }

  // Handle pointer down on handles or crop box
  function handlePointerDown(
    e: ReactPointerEvent,
    type: "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w",
  ) {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    };
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!dragRef.current || scale <= 0) return;
    const { type, startX, startY, initialCrop } = dragRef.current;
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;

    const nw = naturalSize.width;
    const nh = naturalSize.height;

    if (type === "move") {
      const nextX = Math.max(0, Math.min(initialCrop.x + dx, nw - initialCrop.width));
      const nextY = Math.max(0, Math.min(initialCrop.y + dy, nh - initialCrop.height));
      setCrop({
        ...initialCrop,
        x: Math.round(nextX),
        y: Math.round(nextY),
      });
      return;
    }

    // Resize handles
    let newX = initialCrop.x;
    let newY = initialCrop.y;
    let newW = initialCrop.width;
    let newH = initialCrop.height;

    if (type.includes("e")) newW = initialCrop.width + dx;
    if (type.includes("s")) newH = initialCrop.height + dy;
    if (type.includes("w")) {
      newW = initialCrop.width - dx;
      newX = initialCrop.x + dx;
    }
    if (type.includes("n")) {
      newH = initialCrop.height - dy;
      newY = initialCrop.y + dy;
    }

    // Aspect ratio locking
    if (selectedRatio && selectedRatio > 0) {
      if (type === "e" || type === "w") {
        newH = Math.round(newW / selectedRatio);
        newY = initialCrop.y + (initialCrop.height - newH) / 2;
      } else if (type === "n" || type === "s") {
        newW = Math.round(newH * selectedRatio);
        newX = initialCrop.x + (initialCrop.width - newW) / 2;
      } else {
        // Corner handles
        newH = Math.round(newW / selectedRatio);
        if (type.includes("n")) newY = initialCrop.y + (initialCrop.height - newH);
      }
    }

    const minSize = 20;
    if (newW < minSize || newH < minSize) return;

    setCrop(clampCropRect({ x: newX, y: newY, width: newW, height: newH }, nw, nh));
  }

  function handlePointerUp(e: ReactPointerEvent) {
    if (dragRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  }

  function handleReset() {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setSelectedRatio(null);
    setCrop({
      x: 0,
      y: 0,
      width: naturalSize.width,
      height: naturalSize.height,
    });
  }

  async function handleApply() {
    if (!image || saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      const blob = await renderCroppedImageToBlob(image, {
        crop,
        rotation,
        flipH,
        flipV,
      });

      const cleanBaseName = filename.replace(/\.[^/.]+$/, "");
      const newFilename = `${cleanBaseName}-crop.png`;
      const res = await uploadBlobAsAsset(workspaceId, blob, newFilename);

      if (!res.ok) {
        setSaveError(res.error);
        setSaving(false);
        return;
      }

      const rot = (((rotation % 360) + 360) % 360);
      const isSwapped = rot === 90 || rot === 270;
      const finalW = isSwapped ? crop.height : crop.width;
      const finalH = isSwapped ? crop.width : crop.height;
      const finalRatio = finalW / Math.max(1, finalH);

      onCropped(res.asset, finalRatio);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal memproses pemotongan gambar.");
      setSaving(false);
    }
  }

  // Display crop box in CSS pixels
  const boxLeft = crop.x * scale;
  const boxTop = crop.y * scale;
  const boxWidth = crop.width * scale;
  const boxHeight = crop.height * scale;

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      data-testid="image-crop-modal"
    >
      <div className={styles.modalCard}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <div className={styles.modalTitleIcon}>
              <IconCrop size={18} />
            </div>
            <div>
              <h2 id="crop-modal-title" className={styles.modalTitle}>
                Potong Gambar (Crop)
              </h2>
              <p className={styles.modalSubtitle}>
                Sesuaikan area bingkai, rasio aspek, dan orientasi gambar Anda.
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
              <span>Memuat gambar...</span>
            </div>
          ) : (
            <>
              {/* Aspect Ratio Toolbar */}
              <div className={styles.cropToolbarRow}>
                <span className={styles.cropBarLabel}>Rasio Aspek:</span>
                <div className={styles.ratioGroup} role="radiogroup" aria-label="Rasio aspek">
                  {PRESETS.map((p) => {
                    const isActive = selectedRatio === p.value;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        className={`${styles.ratioBtn} ${isActive ? styles.ratioBtnActive : ""}`}
                        aria-pressed={isActive}
                        onClick={() => handleSelectRatio(p.value)}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.transformButtonGroup}>
                  <button
                    type="button"
                    className={styles.iconGhostBtn}
                    title="Putar 90° ke kiri"
                    aria-label="Putar 90 derajat kiri"
                    onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  >
                    <IconRotateLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconGhostBtn}
                    title="Putar 90° ke kanan"
                    aria-label="Putar 90 derajat kanan"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    <IconRotateRight size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconGhostBtn} ${flipH ? styles.iconGhostBtnActive : ""}`}
                    title="Balik horizontal"
                    aria-label="Balik horizontal"
                    onClick={() => setFlipH((f) => !f)}
                  >
                    <IconFlipH size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconGhostBtn} ${flipV ? styles.iconGhostBtnActive : ""}`}
                    title="Balik vertikal"
                    aria-label="Balik vertikal"
                    onClick={() => setFlipV((f) => !f)}
                  >
                    <IconFlipV size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconGhostBtn}
                    title="Reset pemotongan"
                    aria-label="Reset pemotongan"
                    onClick={handleReset}
                  >
                    <IconReplay size={15} />
                  </button>
                </div>
              </div>

              {/* Main Crop Stage */}
              <div
                ref={stageRef}
                className={styles.cropStage}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <div
                  className={styles.cropImageWrapper}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                    transition: "transform 0.15s ease",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={assetUrl(assetId)}
                    alt=""
                    className={styles.cropImageTarget}
                    onLoad={updateDisplayDimensions}
                    draggable={false}
                  />

                  {/* Crop Box Overlay with outer dark shadow mask */}
                  {displaySize.width > 0 && crop.width > 0 ? (
                    <div
                      className={styles.cropBox}
                      style={{
                        left: `${boxLeft}px`,
                        top: `${boxTop}px`,
                        width: `${boxWidth}px`,
                        height: `${boxHeight}px`,
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "move")}
                    >
                      {/* Rule of thirds grid lines */}
                      <div className={styles.cropGrid}>
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                      </div>

                      {/* 8 resize handles */}
                      <div
                        className={`${styles.cropHandle} ${styles.handleNW}`}
                        onPointerDown={(e) => handlePointerDown(e, "nw")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleN}`}
                        onPointerDown={(e) => handlePointerDown(e, "n")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleNE}`}
                        onPointerDown={(e) => handlePointerDown(e, "ne")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleE}`}
                        onPointerDown={(e) => handlePointerDown(e, "e")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleSE}`}
                        onPointerDown={(e) => handlePointerDown(e, "se")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleS}`}
                        onPointerDown={(e) => handlePointerDown(e, "s")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleSW}`}
                        onPointerDown={(e) => handlePointerDown(e, "sw")}
                      />
                      <div
                        className={`${styles.cropHandle} ${styles.handleW}`}
                        onPointerDown={(e) => handlePointerDown(e, "w")}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Status and Dimensions Bar */}
              <div className={styles.cropInfoRow}>
                <span className={styles.cropDimBadge}>
                  Area potong: <strong>{crop.width} × {crop.height} px</strong>
                </span>
                <span className={styles.cropDimBadgeMuted}>
                  Asli: {naturalSize.width} × {naturalSize.height} px
                </span>
                {rotation !== 0 ? (
                  <span className={styles.cropDimBadgeMuted}>Rotasi: {rotation}°</span>
                ) : null}
              </div>

              {saveError ? (
                <div className={styles.errorNotice} role="alert">
                  {saveError}
                </div>
              ) : null}
            </>
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
            data-testid="apply-crop-btn"
          >
            {saving ? (
              <>
                <div className={styles.miniSpinner} />
                <span>Menyimpan gambar...</span>
              </>
            ) : (
              <>
                <IconCheck size={16} />
                <span>Terapkan Pemotongan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
