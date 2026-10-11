"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentAudio, DocumentAudioPosition } from "@/lib/schema";
import { BACKSOUND_PRESETS, type BacksoundPreset } from "@/features/audio";
import { selectDoc, useEditor, useEditorStore, useWorkspaceId } from "./EditorProvider";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import { FieldRow, SelectField, TextField } from "./fields";
import { IconSparkle } from "./icons";
import styles from "./editor.module.css";

function MusicNoteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx={6} cy={18} r={3} />
      <circle cx={18} cy={16} r={3} />
    </svg>
  );
}

function UploadIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x={6} y={4} width={4} height={16} rx={1} />
      <rect x={14} y={4} width={4} height={16} rx={1} />
    </svg>
  );
}

const POSITION_OPTIONS: Array<{ value: DocumentAudioPosition; label: string }> = [
  { value: "bottom-right", label: "Kanan Bawah (Rekomendasi)" },
  { value: "bottom-left", label: "Kiri Bawah" },
  { value: "top-right", label: "Kanan Atas" },
  { value: "top-left", label: "Kiri Atas" },
];

export interface GlobalBacksoundControlProps {
  readonly readOnly?: boolean;
}

export function GlobalBacksoundControl({ readOnly }: GlobalBacksoundControlProps) {
  const store = useEditorStore();
  const workspaceId = useWorkspaceId();
  const doc = useEditor(selectDoc);
  const audio = doc.design.audio;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isEnabled = Boolean(audio?.enabled);
  const currentSrc = audio?.src ?? "";
  const currentTitle = audio?.title ?? "";
  const currentPosition = audio?.position ?? "bottom-right";
  const loop = audio?.loop !== false;
  const autoplayOnOpen = audio?.autoplayOnOpen !== false;

  // Temukan apakah saat ini menggunakan preset tertentu
  const matchedPreset = BACKSOUND_PRESETS.find((p) => p.src === currentSrc);
  const selectedPresetId = matchedPreset ? matchedPreset.id : currentSrc ? "custom" : "gending-pengantin";

  // Stop audio preview jika src berubah atau unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSrc]);

  const handleTogglePreview = () => {
    if (!currentSrc) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(currentSrc);
      audioRef.current.onended = () => setIsPlayingPreview(false);
      audioRef.current.onerror = () => setIsPlayingPreview(false);
    } else if (audioRef.current.src !== currentSrc) {
      audioRef.current.pause();
      audioRef.current = new Audio(currentSrc);
      audioRef.current.onended = () => setIsPlayingPreview(false);
      audioRef.current.onerror = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => setIsPlayingPreview(false));
    }
  };

  const handleSelectPreset = (presetId: string) => {
    if (presetId === "custom") {
      store.getState().patchDocumentAudio({
        enabled: true,
        src: currentSrc || "https://",
        title: currentTitle || "Musik Kustom",
      });
      return;
    }
    const preset = BACKSOUND_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      store.getState().patchDocumentAudio({
        enabled: true,
        src: preset.src,
        title: preset.name,
      });
    }
  };

  const handleUploadClick = () => {
    if (readOnly || isUploading) return;
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value agar user bisa memilih kembali file yang sama bila perlu
    e.target.value = "";

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `Ukuran file melebihi batas maksimal 15 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      );
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadAssetFile(workspaceId, file);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      const fileSrc = assetUrl(result.asset.id);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").trim();

      store.getState().patchDocumentAudio({
        enabled: true,
        src: fileSrc,
        title: cleanTitle || "Musik Kustom",
      });
    } catch {
      setUploadError("Gagal mengunggah file musik. Periksa koneksi.");
    } finally {
      setIsUploading(false);
    }
  };

  const PRESET_OPTIONS = [
    ...BACKSOUND_PRESETS.map((p) => ({ value: p.id, label: `🎵 ${p.name}` })),
    { value: "custom", label: "⚙️ Kustom (Input URL MP3 Sendiri)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Switch Utama Aktifkan Backsound */}
      <label className={styles.checkRow} style={{ margin: 0, fontWeight: 600 }}>
        <input
          id="insp-doc-audio-toggle"
          type="checkbox"
          checked={isEnabled}
          disabled={readOnly}
          onChange={(e) => {
            const checked = e.target.checked;
            if (checked && !currentSrc) {
              const defaultPreset = BACKSOUND_PRESETS[0]!;
              store.getState().patchDocumentAudio({
                enabled: true,
                src: defaultPreset.src,
                title: defaultPreset.name,
                position: "bottom-right",
                loop: true,
                autoplayOnOpen: true,
              });
            } else {
              store.getState().patchDocumentAudio({ enabled: checked });
            }
          }}
          data-testid="global-audio-toggle"
        />
        <MusicNoteIcon size={14} />
        <span>Aktifkan Musik Latar Global (Backsound)</span>
      </label>

      <p className={styles.muted} style={{ fontSize: "0.78rem", margin: "0 0 4px" }}>
        Musik berputar mengiringi tamu di seluruh section undangan. Jika ada Cover Opening, musik otomatis menyala saat tombol Buka Undangan ditekan.
      </p>

      {isEnabled && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "10px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          {/* Pilihan Koleksi Preset */}
          <SelectField
            id="insp-audio-preset"
            label="Koleksi Lagu Romantis"
            value={selectedPresetId}
            options={PRESET_OPTIONS}
            disabled={readOnly}
            onChange={handleSelectPreset}
          />

          {/* Input File Tersembunyi */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,audio/mp4,audio/x-m4a,.mp3,.ogg,.m4a"
            style={{ display: "none" }}
            disabled={readOnly || isUploading}
            onChange={handleFileChange}
            data-testid="audio-file-input"
          />

          {/* Tombol Unggah File Musik */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--color-text-secondary, #a3a3a3)",
              }}
            >
              Unggah File Musik Sendiri
            </label>
            <button
              type="button"
              className={styles.ghostButton}
              disabled={readOnly || isUploading}
              onClick={handleUploadClick}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                background: isUploading
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(212, 175, 55, 0.08)",
                borderColor: isUploading
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(212, 175, 55, 0.35)",
                color: isUploading ? "var(--color-text-muted, #888)" : "#d4af37",
                cursor: isUploading || readOnly ? "not-allowed" : "pointer",
                fontWeight: 500,
                fontSize: "0.82rem",
              }}
              data-testid="audio-upload-btn"
            >
              <UploadIcon size={14} />
              <span>
                {isUploading
                  ? "Sedang Mengunggah Musik..."
                  : "📁 Unggah File MP3 / OGG / M4A"}
              </span>
            </button>
            {uploadError && (
              <span style={{ fontSize: "0.75rem", color: "#f87171" }}>
                ⚠️ {uploadError}
              </span>
            )}
            <span className={styles.muted} style={{ fontSize: "0.72rem" }}>
              Maksimal 15 MB dari komputer atau HP Anda.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "2px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "rgba(255, 255, 255, 0.06)",
              }}
            />
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted, #777)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              atau input link URL
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "rgba(255, 255, 255, 0.06)",
              }}
            />
          </div>

          {/* Input URL Audio */}
          <TextField
            id="insp-audio-src"
            label="URL File Audio (MP3 / OGG)"
            value={currentSrc}
            disabled={readOnly}
            onCommit={(src) => store.getState().patchDocumentAudio({ src: src.trim() })}
          />

          {/* Input Judul Lagu */}
          <TextField
            id="insp-audio-title"
            label="Judul Musik / Artis"
            value={currentTitle}
            disabled={readOnly}
            onCommit={(title) => store.getState().patchDocumentAudio({ title: title.trim() })}
          />

          {/* Tombol Tes Dengar Audio di Editor */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={handleTogglePreview}
              disabled={!currentSrc}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                padding: "6px 12px",
                borderRadius: "6px",
                background: isPlayingPreview ? "rgba(212, 175, 55, 0.18)" : undefined,
                color: isPlayingPreview ? "#d4af37" : undefined,
                borderColor: isPlayingPreview ? "rgba(212, 175, 55, 0.4)" : undefined,
              }}
              data-testid="audio-preview-toggle-btn"
            >
              {isPlayingPreview ? <PauseIcon /> : <PlayIcon />}
              <span>{isPlayingPreview ? "Jeda Dengar" : "▶ Tes Dengar Audio"}</span>
            </button>
            {isPlayingPreview && (
              <span className={styles.muted} style={{ fontSize: "0.74rem", color: "#d4af37" }}>
                Sedang memutar...
              </span>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.06)", margin: "4px 0" }} />

          {/* Posisi Floating Disc di Layar */}
          <SelectField
            id="insp-audio-pos"
            label="Posisi Tombol Piringan (Floating Disc)"
            value={currentPosition}
            options={POSITION_OPTIONS}
            disabled={readOnly}
            onChange={(val) =>
              store.getState().patchDocumentAudio({ position: val as DocumentAudioPosition })
            }
          />

          {/* Opsi Putar Ulang & Autoplay saat buka */}
          <label className={styles.checkRow} style={{ margin: "2px 0 0" }}>
            <input
              type="checkbox"
              checked={loop}
              disabled={readOnly}
              onChange={(e) => store.getState().patchDocumentAudio({ loop: e.target.checked })}
            />
            <span style={{ fontSize: "0.8rem" }}>Putar ulang terus-menerus (Looping)</span>
          </label>

          <label className={styles.checkRow} style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={autoplayOnOpen}
              disabled={readOnly}
              onChange={(e) =>
                store.getState().patchDocumentAudio({ autoplayOnOpen: e.target.checked })
              }
            />
            <span style={{ fontSize: "0.8rem" }}>Otomatis putar saat Buka Undangan ditekan</span>
          </label>
        </div>
      )}
    </div>
  );
}
