"use client";

import React, { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/features/assets/urls";
import { savePortalAudioAction, uploadPortalAudioAssetAction } from "../actions";
import {
  MusicIcon,
  PlayIcon,
  PauseIcon,
  UploadCloudIcon,
  Trash2Icon,
  CheckIcon,
  AlertTriangleIcon,
} from "./PortalIcons";
import styles from "./PortalAudioField.module.css";

const ASSET_ID_REGEX = /^[0-9a-f-]{36}$/i;

export interface PortalAudioFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  disabled?: boolean;
  token: string;
  onChange: (newVal: string) => void;
  error?: string;
}

export function PortalAudioField({
  id,
  name,
  label,
  value,
  disabled = false,
  token,
  onChange,
  error,
}: PortalAudioFieldProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resolveAudioUrl = (val: string): string => {
    if (!val) return "";
    if (ASSET_ID_REGEX.test(val)) {
      return assetUrl(val);
    }
    return val;
  };

  const currentUrl = resolveAudioUrl(value);

  // Stop playback when value changes or component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleTogglePlay = () => {
    if (!audioRef.current || !currentUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = currentUrl;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio playback failed:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (disabled || isUploading) return;
    setLocalError(null);

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      setLocalError("Ukuran berkas musik maksimal 20MB.");
      return;
    }

    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)) {
      setLocalError("Berkas yang dipilih harus berupa file audio (MP3, WAV, M4A, AAC, OGG).");
      return;
    }

    setIsUploading(true);
    setUploadText(`Mengunggah "${file.name}"…`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadPortalAudioAssetAction(token, formData);
      if (res.ok && res.data) {
        const cleanTitle = file.name.replace(/\.[^.]+$/, "");
        const audioUrl = res.data.url;

        // 1. Notify variable form of the updated audio URL
        onChange(audioUrl);

        // 2. Synchronize portal audio settings so GlobalBacksoundPlayer immediately updates
        void savePortalAudioAction(token, {
          enabled: true,
          src: audioUrl,
          title: cleanTitle,
          artist: "Musik Pilihan Sendiri",
          assetId: res.data.assetId,
          presetId: undefined,
        });

        // 3. Auto-play preview
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      } else {
        setLocalError(res.error || "Gagal mengunggah berkas audio.");
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah musik.");
    } finally {
      setIsUploading(false);
      setUploadText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    onChange("");
    void savePortalAudioAction(token, {
      enabled: false,
      src: undefined,
      title: undefined,
      artist: undefined,
      presetId: undefined,
      assetId: undefined,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const trackDisplayTitle = currentUrl
    ? decodeURIComponent(currentUrl.split("/").pop()?.split("?")[0] || "Lagu Kustom")
    : "Musik Latar";

  return (
    <div className={styles.container}>
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />

      <input
        ref={fileInputRef}
        type="file"
        id={id}
        name={name}
        accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg"
        style={{ display: "none" }}
        disabled={disabled || isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileUpload(file);
        }}
      />

      {isUploading ? (
        <div className={styles.uploadingBox}>
          <div className={styles.spinner} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#2c2523" }}>
              {uploadText || "Mengunggah berkas musik…"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#786b65" }}>
              Mohon tunggu hingga proses unggah selesai.
            </div>
          </div>
        </div>
      ) : currentUrl ? (
        <div className={styles.audioCard}>
          <div className={styles.audioInfoRow}>
            <div className={`${styles.vinylIcon} ${isPlaying ? styles.vinylSpinning : ""}`}>
              <MusicIcon size={20} />
            </div>
            <div className={styles.trackDetails}>
              <div className={styles.trackTitle} title={trackDisplayTitle}>
                {trackDisplayTitle}
              </div>
              <div className={styles.trackStatus}>
                <CheckIcon size={12} />
                <span>Musik siap berputar di undangan</span>
              </div>
            </div>
          </div>

          <div className={styles.controlsRow}>
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={disabled}
              className={`${styles.btnPlay} ${isPlaying ? styles.btnPlayActive : ""}`}
              title={isPlaying ? "Jeda musik" : "Dengarkan musik"}
            >
              {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
              <span>{isPlaying ? "Jeda" : "Dengarkan"}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={styles.btnSecondary}
              title="Ganti berkas musik"
            >
              <UploadCloudIcon size={14} />
              <span>Ganti File</span>
            </button>

            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className={styles.btnDelete}
              title="Hapus musik ini"
            >
              <Trash2Icon size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
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
          <div className={styles.dropzoneIcon}>
            <UploadCloudIcon size={32} />
          </div>
          <div className={styles.dropzoneTitle}>
            Klik atau Tarik File Musik ke Sini (Upload MP3)
          </div>
          <div className={styles.dropzoneSub}>
            Format audio MP3, WAV, M4A, AAC, OGG (Maks. 20MB)
          </div>
        </div>
      )}

      {(localError || error) && (
        <div className={styles.errorText}>
          <AlertTriangleIcon size={14} />
          <span>{localError || error}</span>
        </div>
      )}
    </div>
  );
}
