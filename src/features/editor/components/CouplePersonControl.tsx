"use client";

import { useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import { parseCouplePerson, type CouplePerson } from "@/features/widgets/runtime/CoupleProfileWidget";
import { parseFrameImage } from "@/features/widgets/runtime/PhotoFrameWidget";
import { AssetLibrary } from "./AssetLibrary";
import { IconImages, IconTrash } from "./icons";
import styles from "./editor.module.css";

export interface CouplePersonControlProps {
  readonly personType: "groom" | "bride";
  readonly label: string;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (value: Record<string, unknown>) => void;
}

export function CouplePersonControl({
  personType,
  label,
  value,
  disabled,
  onChange,
}: CouplePersonControlProps) {
  const defaultRole = personType === "groom" ? "Mempelai Pria" : "Mempelai Wanita";
  const person: CouplePerson = parseCouplePerson(value, defaultRole);

  const [picking, setPicking] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const photoSrc = parseFrameImage(person.photo);

  const updateField = (field: string, val: unknown) => {
    const base = typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
    const next = { ...base };
    if (val === undefined || val === "") {
      delete next[field];
    } else {
      next[field] = val;
    }
    onChange(next);
  };

  const handlePickAsset = (asset: AssetSummary) => {
    updateField("photo", { assetId: asset.id });
    setPicking(false);
  };

  const handleRemovePhoto = () => {
    updateField("photo", undefined);
  };

  const handleApplyUrl = () => {
    const trimmed = urlDraft.trim();
    if (trimmed) {
      updateField("photo", trimmed);
      setUrlDraft("");
      setShowUrlInput(false);
    }
  };

  return (
    <div
      className={styles.couplePersonControl}
      data-testid={`couple-person-control-${personType}`}
    >
      <div className={styles.couplePersonCardHeader}>
        <span className={styles.couplePersonBadge}>
          {personType === "groom" ? "🤵" : "👰"} {label}
        </span>
      </div>

      {/* Photo Picker Preview */}
      <div className={styles.photoFrameThumbWrapper} style={{ height: 110 }}>
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={`Foto ${label}`}
            className={styles.photoFrameThumbImg}
          />
        ) : (
          <div className={styles.photoFrameCanvaPlaceholderThumb}>
            <span className={styles.canvaIconEmoji}>
              {personType === "groom" ? "🤵" : "👰"}
            </span>
            <span className={styles.canvaThumbText}>
              Belum ada foto {label}
            </span>
          </div>
        )}
      </div>

      {/* Photo Actions */}
      <div className={styles.photoFrameActionsRow}>
        <button
          type="button"
          className={styles.primaryActionButton}
          disabled={disabled}
          onClick={() => setPicking((prev) => !prev)}
          data-testid={`couple-${personType}-pick-btn`}
        >
          <IconImages size={14} />
          {photoSrc ? "Ganti Foto" : "Pilih / Unggah Foto"}
        </button>

        {photoSrc && (
          <button
            type="button"
            className={styles.ghostIconButton}
            disabled={disabled}
            onClick={handleRemovePhoto}
            title="Hapus foto"
            data-testid={`couple-${personType}-remove-btn`}
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>

      {/* URL Toggle */}
      <div className={styles.photoFrameUrlSection}>
        <button
          type="button"
          className={styles.urlToggleLink}
          disabled={disabled}
          onClick={() => setShowUrlInput((v) => !v)}
        >
          {showUrlInput ? "− Tutup input URL" : "+ Masukkan link URL foto"}
        </button>
        {showUrlInput && (
          <div className={styles.urlInputRow}>
            <input
              type="url"
              className={styles.input}
              placeholder="https://example.com/foto.jpg"
              value={urlDraft}
              disabled={disabled}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyUrl();
                }
              }}
            />
            <button
              type="button"
              className={styles.smallButton}
              disabled={disabled || !urlDraft.trim()}
              onClick={handleApplyUrl}
            >
              Pasang
            </button>
          </div>
        )}
      </div>

      {/* Asset Library Modal */}
      {picking && (
        <div className={styles.photoFrameLibraryDrawer}>
          <div className={styles.libraryDrawerHeader}>
            <span className={styles.libraryDrawerTitle}>
              Pustaka Foto {label}
            </span>
            <button
              type="button"
              className={styles.closeDrawerBtn}
              onClick={() => setPicking(false)}
            >
              ✕
            </button>
          </div>
          <AssetLibrary
            idPrefix={`couple-${personType}`}
            pickLabel={`Gunakan untuk ${label}`}
            onPick={handlePickAsset}
            onUploaded={handlePickAsset}
            disabled={disabled}
          />
        </div>
      )}

      {/* Text Fields */}
      <div className={styles.panelStack} style={{ marginTop: 8 }}>
        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel} htmlFor={`couple-${personType}-name`}>
            Nama Panggilan
          </label>
          <input
            id={`couple-${personType}-name`}
            type="text"
            className={styles.input}
            placeholder={personType === "groom" ? "Rama" : "Alya"}
            value={person.name ?? ""}
            disabled={disabled}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel} htmlFor={`couple-${personType}-fullname`}>
            Nama Lengkap &amp; Gelar
          </label>
          <input
            id={`couple-${personType}-fullname`}
            type="text"
            className={styles.input}
            placeholder={
              personType === "groom"
                ? "Rama Pratama, S.T."
                : "Alya Putri Saraswati, S.Ked."
            }
            value={person.fullName ?? ""}
            disabled={disabled}
            onChange={(e) => updateField("fullName", e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel} htmlFor={`couple-${personType}-parents`}>
            Keterangan Orang Tua
          </label>
          <input
            id={`couple-${personType}-parents`}
            type="text"
            className={styles.input}
            placeholder={
              personType === "groom"
                ? "Putra pertama dari Bpk. Bambang & Ibu Sri"
                : "Putri kedua dari Bpk. Hendra & Ibu Ratna"
            }
            value={person.parents ?? ""}
            disabled={disabled}
            onChange={(e) => updateField("parents", e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel} htmlFor={`couple-${personType}-ig`}>
            Instagram (tanpa @)
          </label>
          <input
            id={`couple-${personType}-ig`}
            type="text"
            className={styles.input}
            placeholder={personType === "groom" ? "ramapratama" : "alyasaraswati"}
            value={person.instagram ?? ""}
            disabled={disabled}
            onChange={(e) => updateField("instagram", e.target.value.replace(/^@/, "").trim())}
          />
        </div>
      </div>
    </div>
  );
}
