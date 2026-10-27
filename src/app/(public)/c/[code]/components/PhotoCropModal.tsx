"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PhotoCropModal.module.css";

export type AspectRatioType = "1:1" | "3:4" | "4:3" | "free";

interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  defaultAspectRatio?: AspectRatioType;
  onClose: () => void;
  onConfirm: (croppedFile: File) => Promise<void> | void;
}

export function PhotoCropModal({
  isOpen,
  imageSrc,
  title = "Sesuaikan Posisi & Zoom Foto",
  defaultAspectRatio = "1:1",
  onClose,
  onConfirm,
}: PhotoCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(defaultAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);

  // Reset transforms whenever modal opens or new imageSrc is provided
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setAspectRatio(defaultAspectRatio);
    setImageLoaded(false);

    let active = true;
    let objectUrlToRevoke: string | null = null;

    const img = new Image();
    img.crossOrigin = "anonymous";

    const setupImage = async () => {
      try {
        let srcToUse = imageSrc;
        // If external or relative URL, fetch as blob to avoid tainted canvas
        if (imageSrc.startsWith("http") || imageSrc.startsWith("/")) {
          const resp = await fetch(imageSrc);
          if (resp.ok) {
            const blob = await resp.blob();
            srcToUse = URL.createObjectURL(blob);
            objectUrlToRevoke = srcToUse;
          }
        }

        img.onload = () => {
          if (!active) return;
          imgRef.current = img;
          setImageLoaded(true);
        };
        img.onerror = () => {
          if (!active) return;
          console.error("Gagal memuat gambar untuk crop:", imageSrc);
        };
        img.src = srcToUse;
      } catch (err) {
        console.error("Error fetching image for cropper:", err);
        img.onload = () => {
          if (!active) return;
          imgRef.current = img;
          setImageLoaded(true);
        };
        img.src = imageSrc;
      }
    };

    void setupImage();

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [isOpen, imageSrc, defaultAspectRatio]);

  // Compute crop box dimensions inside display canvas coordinate space (800x800)
  const getCropBox = useCallback(
    (canvasW: number, canvasH: number) => {
      const padding = 40;
      const maxW = canvasW - padding * 2;
      const maxH = canvasH - padding * 2;

      let ratio = 1;
      if (aspectRatio === "3:4") ratio = 3 / 4;
      else if (aspectRatio === "4:3") ratio = 4 / 3;
      else if (aspectRatio === "free" && imgRef.current) {
        const natW = imgRef.current.naturalWidth || 1;
        const natH = imgRef.current.naturalHeight || 1;
        const isRotated = rotation === 90 || rotation === 270;
        ratio = isRotated ? natH / natW : natW / natH;
      }

      let cropW = maxW;
      let cropH = cropW / ratio;

      if (cropH > maxH) {
        cropH = maxH;
        cropW = cropH * ratio;
      }

      const cropX = (canvasW - cropW) / 2;
      const cropY = (canvasH - cropH) / 2;

      return { x: cropX, y: cropY, w: cropW, h: cropH };
    },
    [aspectRatio, rotation],
  );

  // Draw loop onto the preview canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const crop = getCropBox(canvasW, canvasH);

    ctx.clearRect(0, 0, canvasW, canvasH);

    // 1. Draw transformed image
    ctx.save();
    ctx.translate(canvasW / 2 + pan.x, canvasH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate base scale so image fills the crop box at 1x zoom
    const isRotated = rotation === 90 || rotation === 270;
    const effImgW = isRotated ? img.naturalHeight : img.naturalWidth;
    const effImgH = isRotated ? img.naturalWidth : img.naturalHeight;

    const scaleToFitW = crop.w / effImgW;
    const scaleToFitH = crop.h / effImgH;
    const baseScale = Math.max(scaleToFitW, scaleToFitH);
    const finalScale = baseScale * zoom;

    ctx.scale(finalScale, finalScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // 2. Draw dark vignette outside crop area
    ctx.save();
    ctx.fillStyle = "rgba(10, 8, 7, 0.72)";

    // Top
    ctx.fillRect(0, 0, canvasW, crop.y);
    // Bottom
    ctx.fillRect(0, crop.y + crop.h, canvasW, canvasH - (crop.y + crop.h));
    // Left
    ctx.fillRect(0, crop.y, crop.x, crop.h);
    // Right
    ctx.fillRect(crop.x + crop.w, crop.y, canvasW - (crop.x + crop.w), crop.h);

    // 3. Draw Rule of Thirds subtle grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // vertical grid lines
    ctx.moveTo(crop.x + crop.w / 3, crop.y);
    ctx.lineTo(crop.x + crop.w / 3, crop.y + crop.h);
    ctx.moveTo(crop.x + (crop.w * 2) / 3, crop.y);
    ctx.lineTo(crop.x + (crop.w * 2) / 3, crop.y + crop.h);
    // horizontal grid lines
    ctx.moveTo(crop.x, crop.y + crop.h / 3);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h / 3);
    ctx.moveTo(crop.x, crop.y + (crop.h * 2) / 3);
    ctx.lineTo(crop.x + crop.w, crop.y + (crop.h * 2) / 3);
    ctx.stroke();

    // 4. Draw Gold Crop Boundary
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    // Corner guides
    const cornerSize = 16;
    ctx.strokeStyle = "#f3e5ab";
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Top-Left
    ctx.moveTo(crop.x, crop.y + cornerSize);
    ctx.lineTo(crop.x, crop.y);
    ctx.lineTo(crop.x + cornerSize, crop.y);
    // Top-Right
    ctx.moveTo(crop.x + crop.w - cornerSize, crop.y);
    ctx.lineTo(crop.x + crop.w, crop.y);
    ctx.lineTo(crop.x + crop.w, crop.y + cornerSize);
    // Bottom-Left
    ctx.moveTo(crop.x, crop.y + crop.h - cornerSize);
    ctx.lineTo(crop.x, crop.y + crop.h);
    ctx.lineTo(crop.x + cornerSize, crop.y + crop.h);
    // Bottom-Right
    ctx.moveTo(crop.x + crop.w - cornerSize, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h - cornerSize);
    ctx.stroke();

    ctx.restore();
  }, [getCropBox, pan, zoom, rotation, imageLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle Drag / Pan Mouse Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + zoomDelta).toFixed(2))));
  };

  // Handle Touch Events (Pan and Pinch to Zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (!touch) return;
      isDraggingRef.current = true;
      dragStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (!t1 || !t2) return;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      if (!touch) return;
      setPan({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (!t1 || !t2) return;
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = currentDist / initialPinchDistRef.current;
      const newZoom = Math.min(3, Math.max(1, +(initialPinchZoomRef.current * ratio).toFixed(2)));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    initialPinchDistRef.current = null;
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset all adjustments
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Confirm and export cropped image
  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    setIsProcessing(true);

    try {
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const crop = getCropBox(canvasW, canvasH);

      // We want high crisp resolution output (up to 1600px width/height)
      const exportScale = Math.max(1, Math.min(3, 1200 / crop.w));
      const exportW = Math.round(crop.w * exportScale);
      const exportH = Math.round(crop.h * exportScale);

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Gagal membuat canvas export.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Translate so (crop.x, crop.y) is top-left of export canvas
      ctx.translate(-crop.x * exportScale, -crop.y * exportScale);

      // Apply identical affine transform as preview
      ctx.translate((canvasW / 2 + pan.x) * exportScale, (canvasH / 2 + pan.y) * exportScale);
      ctx.rotate((rotation * Math.PI) / 180);

      const isRotated = rotation === 90 || rotation === 270;
      const effImgW = isRotated ? img.naturalHeight : img.naturalWidth;
      const effImgH = isRotated ? img.naturalWidth : img.naturalHeight;

      const scaleToFitW = crop.w / effImgW;
      const scaleToFitH = crop.h / effImgH;
      const baseScale = Math.max(scaleToFitW, scaleToFitH);
      const finalScale = baseScale * zoom * exportScale;

      ctx.scale(finalScale, finalScale);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      await new Promise<void>((resolve, reject) => {
        exportCanvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Gagal menghasilkan blob gambar."));
              return;
            }
            const file = new File([blob], `cropped-${Date.now()}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            try {
              await onConfirm(file);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          "image/jpeg",
          0.92,
        );
      });

      onClose();
    } catch (err) {
      console.error("Error cropping image:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan potongan foto.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.headerIcon}>✂️</span>
            <h3 className={styles.title}>{title}</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Canvas container */}
          <div className={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className={styles.canvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            <div className={styles.canvasOverlayHelp}>
              👆 Tarik / geser untuk atur posisi • Scroll / pinch untuk zoom
            </div>
          </div>

          {/* Aspect Ratio Presets */}
          <div className={styles.ratioSection}>
            <span className={styles.sectionLabel}>Bentuk / Rasio Potongan</span>
            <div className={styles.ratioPills}>
              <button
                type="button"
                className={`${styles.ratioPill} ${aspectRatio === "1:1" ? styles.ratioPillActive : ""}`}
                onClick={() => setAspectRatio("1:1")}
              >
                1:1 Persegi
              </button>
              <button
                type="button"
                className={`${styles.ratioPill} ${aspectRatio === "3:4" ? styles.ratioPillActive : ""}`}
                onClick={() => setAspectRatio("3:4")}
              >
                3:4 Potret
              </button>
              <button
                type="button"
                className={`${styles.ratioPill} ${aspectRatio === "4:3" ? styles.ratioPillActive : ""}`}
                onClick={() => setAspectRatio("4:3")}
              >
                4:3 Lanskap
              </button>
              <button
                type="button"
                className={`${styles.ratioPill} ${aspectRatio === "free" ? styles.ratioPillActive : ""}`}
                onClick={() => setAspectRatio("free")}
              >
                Asli Bebas
              </button>
            </div>
          </div>

          {/* Zoom and Transform Controls */}
          <div className={styles.controlsSection}>
            <div className={styles.zoomRow}>
              <button
                type="button"
                className={styles.iconBtnSmall}
                title="Perkecil Zoom"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
              >
                －
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className={styles.zoomSlider}
                aria-label="Tingkat Zoom Foto"
              />
              <button
                type="button"
                className={styles.iconBtnSmall}
                title="Perbesar Zoom"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              >
                ＋
              </button>
              <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
            </div>

            <div className={styles.toolActionsRow}>
              <button type="button" className={styles.secondaryBtn} onClick={handleRotate}>
                <span>🔄</span>
                <span>Putar 90°</span>
              </button>

              <button type="button" className={styles.secondaryBtn} onClick={handleReset}>
                <span>↩️</span>
                <span>Reset Posisi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isProcessing}
          >
            Batal
          </button>
          <button
            type="button"
            className={styles.applyBtn}
            onClick={handleConfirm}
            disabled={isProcessing || !imageLoaded}
          >
            {isProcessing ? (
              <>
                <div className={styles.spinner} />
                <span>Memproses Foto…</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Terapkan & Simpan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
