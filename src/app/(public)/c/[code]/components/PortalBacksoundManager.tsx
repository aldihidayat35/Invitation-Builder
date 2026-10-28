"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BACKSOUND_PRESETS, type BacksoundPreset } from "@/features/audio";
import { savePortalAudioAction, uploadPortalAudioAssetAction } from "../actions";
import type { PortalAudioSettings } from "@/features/orders/service";
import {
  MusicIcon,
  CheckIcon,
  XIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  DiscIcon,
  UploadCloudIcon,
  HeadphonesIcon,
  AlertTriangleIcon,
  Edit3Icon,
} from "./PortalIcons";
import styles from "./PortalBacksoundManager.module.css";

interface PortalBacksoundManagerProps {
  token: string;
  initialAudio?: PortalAudioSettings;
  previewUrl?: string | null;
  onSaved?: (audio: PortalAudioSettings) => void;
}

const CATEGORIES = [
  { id: "semua", label: "Semua Genre" },
  { id: "romantis", label: "Romantis" },
  { id: "klasik", label: "Klasik" },
  { id: "akustik", label: "Akustik" },
  { id: "tradisional", label: "Tradisional" },
  { id: "islami", label: "Islami" },
  { id: "pop", label: "Pop Romantis" },
] as const;

export function PortalBacksoundManager({
  token,
  initialAudio,
  previewUrl,
  onSaved,
}: PortalBacksoundManagerProps) {
  const [audio, setAudio] = useState<PortalAudioSettings>(() => ({
    enabled: initialAudio?.enabled ?? true,
    src: initialAudio?.src || BACKSOUND_PRESETS[0]!.src,
    title: initialAudio?.title || BACKSOUND_PRESETS[0]!.name,
    artist: initialAudio?.artist || BACKSOUND_PRESETS[0]!.artist,
    presetId: initialAudio?.presetId || BACKSOUND_PRESETS[0]!.id,
    assetId: initialAudio?.assetId,
  }));

  const [sourceTab, setSourceTab] = useState<"presets" | "upload">("presets");
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");
  const [playingPreviewSrc, setPlayingPreviewSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadText, setUploadText] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const saveAudio = useCallback(
    async (newSettings: PortalAudioSettings) => {
      setSaveStatus("saving");
      setStatusMessage("Menyimpan pengaturan musik latar…");

      try {
        const res = await savePortalAudioAction(token, newSettings);
        if (res.ok) {
          setSaveStatus("saved");
          setStatusMessage(res.message || "Pengaturan musik tersimpan.");
          onSaved?.(newSettings);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan musik.");
        }
      } catch (err: unknown) {
        setSaveStatus("error");
        setStatusMessage(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    },
    [token, onSaved],
  );

  const handleToggleEnabled = (enabled: boolean) => {
    const updated = { ...audio, enabled };
    setAudio(updated);
    void saveAudio(updated);
    if (!enabled && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewSrc(null);
    }
  };

  const handleSelectPreset = (preset: BacksoundPreset) => {
    const updated: PortalAudioSettings = {
      enabled: true,
      src: preset.src,
      title: preset.name,
      artist: preset.artist,
      presetId: preset.id,
      assetId: undefined,
    };
    setAudio(updated);
    void saveAudio(updated);

    // Also play the newly selected preset
    handlePlayPreview(preset.src);
  };

  const handlePlayPreview = (src: string) => {
    if (!previewAudioRef.current) return;

    if (playingPreviewSrc === src) {
      // Toggle pause
      previewAudioRef.current.pause();
      setPlayingPreviewSrc(null);
    } else {
      // Play new preview
      previewAudioRef.current.src = src;
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current
        .play()
        .then(() => {
          setPlayingPreviewSrc(src);
        })
        .catch((err) => {
          console.warn("Autoplay was blocked or audio load error:", err);
          setPlayingPreviewSrc(null);
        });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isUploading) return;

    // Check size max 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Ukuran berkas audio maksimal 20MB.");
      return;
    }

    setIsUploading(true);
    setUploadText(`Mengunggah berkas musik "${file.name}"…`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadPortalAudioAssetAction(token, formData);
      if (res.ok && res.data) {
        const cleanName = file.name.replace(/\.[^.]+$/, "");
        const updated: PortalAudioSettings = {
          enabled: true,
          src: res.data.url,
          title: cleanName,
          artist: "Musik Pilihan Sendiri",
          assetId: res.data.assetId,
          presetId: undefined,
        };
        setAudio(updated);
        void saveAudio(updated);
        handlePlayPreview(res.data.url);
      } else {
        alert(res.error || "Gagal mengunggah berkas audio.");
      }
    } catch (err) {
      console.error("Error uploading audio:", err);
      alert("Terjadi kesalahan saat mengunggah musik.");
    } finally {
      setIsUploading(false);
      setUploadText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const filteredPresets =
    selectedCategory === "semua"
      ? BACKSOUND_PRESETS
      : BACKSOUND_PRESETS.filter((p) => p.category === selectedCategory);

  const isCurrentAudioPlaying = audio.src && playingPreviewSrc === audio.src;

  return (
    <div className={styles.wrapper}>
      {/* Hidden audio element for preview playback */}
      <audio
        ref={previewAudioRef}
        onEnded={() => setPlayingPreviewSrc(null)}
        onError={() => setPlayingPreviewSrc(null)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg"
        style={{ display: "none" }}
        disabled={isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileUpload(file);
        }}
      />

      {/* Header Info Card */}
      <div className={styles.headerCard}>
        <div className={styles.topRow}>
          <div className={styles.titleArea}>
            <span className={styles.titleIcon}>
              <MusicIcon size={22} />
            </span>
            <h2 className={styles.title}>Musik Latar & Backsound Undangan</h2>
            <span
              className={styles.counterBadge}
              style={{
                background: audio.enabled ? "#ecfdf5" : "#fff1f2",
                color: audio.enabled ? "#065f46" : "#dc2626",
                borderColor: audio.enabled ? "#a7f3d0" : "#fecdd3",
              }}
            >
              {audio.enabled ? (
                <>
                  <CheckIcon size={14} />
                  <span>Musik Aktif</span>
                </>
              ) : (
                <>
                  <XIcon size={14} />
                  <span>Nonaktif</span>
                </>
              )}
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
                <EyeIcon size={16} />
                <span>Buka Preview Undangan</span>
              </a>
            )}
          </div>
        </div>

        <p className={styles.desc}>
          Atur lagu romantis yang mengiringi undangan digital Anda. Musik akan otomatis berputar
          dengan syahdu ketika tamu mengklik tombol <strong>&quot;Buka Undangan&quot;</strong>, dan tamu
          dapat mematikan/menghidupkannya kapan saja melalui tombol pemutar musik mengambang.
        </p>

        {/* Toggle Switch */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleLabelGroup}>
            <div className={styles.toggleTitle}>
              <span>Putar Musik Latar di Undangan</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "9999px",
                  background: audio.enabled ? "#ecfdf5" : "#fff1f2",
                  color: audio.enabled ? "#065f46" : "#dc2626",
                  fontWeight: 700,
                  border: `1px solid ${audio.enabled ? "#a7f3d0" : "#fecdd3"}`,
                }}
              >
                {audio.enabled ? "Aktif" : "Mati"}
              </span>
            </div>
            <div className={styles.toggleSub}>
              Jika dimatikan, undangan digital tidak akan memutar musik dan ikon pemutar musik tidak akan muncul.
            </div>
          </div>

          <label className={styles.switchWrapper}>
            <input
              type="checkbox"
              checked={audio.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              className={styles.switchInput}
            />
            <span className={styles.switchSlider} />
          </label>
        </div>

        {/* Save Bar / Notification */}
        <div className={styles.saveBar}>
          <div className={styles.saveStatus}>
            {saveStatus === "saving" && (
              <>
                <div className={styles.spinner} style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span className={styles.saveStatusSaving}>Menyimpan musik…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <span style={{ color: "#059669", display: "inline-flex" }}>
                  <CheckIcon size={16} />
                </span>
                <span className={styles.saveStatusSuccess}>
                  {statusMessage || "Pengaturan musik tersimpan otomatis."}
                </span>
              </>
            )}
            {saveStatus === "dirty" && (
              <>
                <span style={{ color: "#c59b27", display: "inline-flex" }}>
                  <Edit3Icon size={16} />
                </span>
                <span>Ada perubahan belum tersimpan…</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <span style={{ color: "#dc2626", display: "inline-flex" }}>
                  <AlertTriangleIcon size={16} />
                </span>
                <span style={{ color: "#dc2626" }}>{statusMessage || "Gagal menyimpan."}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Currently Active Track Soft Luxury Card */}
      {audio.enabled && (
        <div className={styles.activeTrackCard}>
          <div className={styles.activeTrackLeft}>
            <div
              className={`${styles.vinylDisc} ${isCurrentAudioPlaying ? styles.vinylSpinning : ""}`}
            >
              <MusicIcon size={20} />
            </div>
            <div className={styles.trackInfo}>
              <span className={styles.trackBadgeActive}>
                <DiscIcon size={13} />
                <span>{audio.assetId ? "Musik Kustom Anda" : "Lagu Latar Terpilih"}</span>
              </span>
              <h3 className={styles.trackTitle}>{audio.title || "Lagu Pernikahan"}</h3>
              <p className={styles.trackArtist}>{audio.artist || "Artis Pilihan"}</p>
            </div>
          </div>

          <div className={styles.activeTrackControls}>
            {audio.src && (
              <button
                type="button"
                onClick={() => handlePlayPreview(audio.src!)}
                className={styles.playToggleBtn}
                title={isCurrentAudioPlaying ? "Jeda Musik" : "Putar Musik Sekarang"}
                aria-label={isCurrentAudioPlaying ? "Jeda Musik" : "Putar Musik"}
              >
                {isCurrentAudioPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Source Selection Tabs */}
      <div className={styles.sourceTabs}>
        <button
          type="button"
          onClick={() => setSourceTab("presets")}
          className={`${styles.sourceTabBtn} ${
            sourceTab === "presets" ? styles.sourceTabBtnActive : ""
          }`}
        >
          <DiscIcon size={16} />
          <span>Pilih dari Katalog Lagu</span>
        </button>
        <button
          type="button"
          onClick={() => setSourceTab("upload")}
          className={`${styles.sourceTabBtn} ${
            sourceTab === "upload" ? styles.sourceTabBtnActive : ""
          }`}
        >
          <UploadCloudIcon size={16} />
          <span>Unggah Musik Sendiri (MP3)</span>
        </button>
      </div>

      {/* Tab 1: Presets Catalog */}
      {sourceTab === "presets" && (
        <div>
          {/* Category Filter Pills */}
          <div className={styles.categoryPills}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`${styles.categoryPill} ${
                  selectedCategory === cat.id ? styles.categoryPillActive : ""
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Presets Grid */}
          <div className={styles.presetGrid}>
            {filteredPresets.map((preset) => {
              const isSelected = audio.presetId === preset.id || audio.src === preset.src;
              const isPlayingThis = playingPreviewSrc === preset.src;

              return (
                <div
                  key={preset.id}
                  className={`${styles.presetCard} ${isSelected ? styles.presetCardActive : ""}`}
                >
                  <div className={styles.presetCardHeader}>
                    <div>
                      <span className={styles.presetCategoryBadge}>{preset.category}</span>
                      <h4 className={styles.presetTitle}>{preset.name}</h4>
                      <p className={styles.presetArtist}>{preset.artist}</p>
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          background: "#c59b27",
                          color: "#ffffff",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "9999px",
                          fontWeight: 700,
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <CheckIcon size={12} />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>

                  {preset.description && (
                    <p className={styles.presetDesc}>{preset.description}</p>
                  )}

                  <div className={styles.presetCardFooter}>
                    <button
                      type="button"
                      onClick={() => handlePlayPreview(preset.src)}
                      className={`${styles.btnPreviewSong} ${
                        isPlayingThis ? styles.btnPreviewSongActive : ""
                      }`}
                      title="Dengarkan cuplikan lagu"
                    >
                      {isPlayingThis ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                      <span>{isPlayingThis ? "Jeda" : "Dengarkan"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      disabled={isSelected}
                      className={`${styles.btnSelectSong} ${
                        isSelected ? styles.btnSelectSongActive : ""
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckIcon size={14} />
                          <span>Digunakan</span>
                        </>
                      ) : (
                        "Pilih Lagu"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Upload MP3 */}
      {sourceTab === "upload" && (
        <div className={styles.uploadPanel}>
          <div>
            <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1.1rem", color: "#2c2523", fontWeight: 700 }}>
              Unggah Berkas Musik Anda Sendiri
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#786b65", lineHeight: 1.5 }}>
              Punya lagu spesial atau rekaman suara sendiri? Unggah berkas audio Anda di sini.
              Mendukung format MP3, WAV, M4A, AAC, atau OGG (maksimal 20MB).
            </p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className={styles.uploadingBox}>
              <div className={styles.spinner} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#2c2523" }}>
                  {uploadText || "Mengunggah berkas audio…"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#786b65" }}>
                  Mohon tunggu hingga proses unggah selesai.
                </div>
              </div>
            </div>
          )}

          {/* Dropzone */}
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
            <div className={styles.dropzoneIcon}>
              <UploadCloudIcon size={40} />
            </div>
            <div className={styles.dropzoneTitle}>Pilih atau Tarik Berkas Audio ke Sini</div>
            <div className={styles.dropzoneSubtitle}>
              Format MP3, WAV, M4A, AAC, OGG (Maks. 20MB per berkas)
            </div>
          </div>

          {/* Custom Track In-Use Card */}
          {audio.assetId && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderRadius: "14px",
                background: "#fbf9f6",
                border: "1px solid #eae3d9",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <span style={{ color: "#8c6d37", display: "inline-flex" }}>
                  <HeadphonesIcon size={24} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#2c2523" }}>
                    {audio.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#065f46", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <CheckIcon size={13} />
                    <span>Berkas musik kustom Anda sedang aktif digunakan di undangan</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {audio.src && (
                  <button
                    type="button"
                    onClick={() => handlePlayPreview(audio.src!)}
                    className={styles.btnSecondary}
                    style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
                  >
                    {isCurrentAudioPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                    <span>{isCurrentAudioPlaying ? "Jeda" : "Dengarkan"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.btnSecondary}
                  style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
                >
                  Ganti File
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
