"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentAudio, DocumentAudioPosition } from "@/lib/schema";
import { BACKSOUND_PRESETS, type BacksoundPreset } from "@/features/audio";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
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
  const doc = useEditor(selectDoc);
  const audio = doc.design.audio;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

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
