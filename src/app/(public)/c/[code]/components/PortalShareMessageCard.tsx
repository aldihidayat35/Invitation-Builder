"use client";

import React, { useState, useRef, useTransition } from "react";
import { interpolateMessageTemplate } from "@/features/orders/message-templates";
import type { PortalShareMessageTemplate } from "@/features/orders/service";
import { savePortalShareMessageAction, uploadPortalAssetAction } from "../actions";
import { compressImageClient, compressImageForWhatsAppCard } from "./image-compressor";
import {
  MessageCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  Edit3Icon,
  SmartphoneIcon,
  RotateCcwIcon,
  SaveIcon,
  ImageIcon,
  UploadCloudIcon,
  Trash2Icon,
} from "./PortalIcons";
import styles from "./PortalShareMessageCard.module.css";

interface PortalShareMessageCardProps {
  token: string;
  presets?: PortalShareMessageTemplate[];
  activeTemplate: string;
  initialShareImageUrl?: string | null;
  eventDetails?: {
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
  };
  shareableUrl?: string | null;
  onTemplateChange: (newTemplate: string) => void;
  onShareImageChange?: (newUrl: string | null) => void;
  onShowToast: (msg: string) => void;
}

const VARIABLE_TAGS = [
  { tag: "{guestname}", label: "Nama Tamu", desc: "Nama tamu penerima" },
  { tag: "{link}", label: "Link Undangan", desc: "Tautan unik undangan tamu" },
  { tag: "{event_title}", label: "Nama Acara", desc: "Nama acara / mempelai" },
  { tag: "{event_date}", label: "Tanggal Acara", desc: "Waktu pelaksanaan" },
  { tag: "{event_location}", label: "Lokasi Acara", desc: "Tempat / venue acara" },
];

export function PortalShareMessageCard({
  token,
  presets = [],
  activeTemplate,
  initialShareImageUrl,
  eventDetails,
  shareableUrl,
  onTemplateChange,
  onShareImageChange,
  onShowToast,
}: PortalShareMessageCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentText, setCurrentText] = useState(activeTemplate);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(
    initialShareImageUrl || null,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleUrl = shareableUrl
    ? (typeof window !== "undefined" ? window.location.origin : "") +
      `${shareableUrl}?to=${encodeURIComponent("Bpk. Fajar Pratama")}`
    : "https://undangan.id/i/contoh?to=Bpk.+Fajar+Pratama";

  const previewText = interpolateMessageTemplate(currentText, {
    guestName: "Bpk. Fajar Pratama & Keluarga",
    link: sampleUrl,
    eventTitle: eventDetails?.eventTitle || "Acara Spesial",
    eventDate: eventDetails?.eventDate || "Sabtu, 28 November 2026",
    eventLocation: eventDetails?.eventLocation || "Gedung Pertemuan Utama",
  });

  const handleSelectPreset = (preset: PortalShareMessageTemplate) => {
    setCurrentText(preset.content);
    setSelectedPresetId(preset.id);
    onTemplateChange(preset.content);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
    setSelectedPresetId(null);
    onTemplateChange(e.target.value);
  };

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const updated = currentText + tag;
      setCurrentText(updated);
      onTemplateChange(updated);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const updated = currentText.substring(0, start) + tag + currentText.substring(end);
    setCurrentText(updated);
    onTemplateChange(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onShowToast("Berkas yang dipilih harus berupa file gambar.");
      return;
    }

    try {
      setIsUploadingImage(true);
      // Format specifically to 1200x630 WhatsApp card format (landscape with aesthetic blurred backdrop if portrait)
      const compressed = await compressImageForWhatsAppCard(file);
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await uploadPortalAssetAction(token, formData);
      if (res.ok && res.data?.url) {
        const newUrl = res.data.url;
        setShareImageUrl(newUrl);
        onShareImageChange?.(newUrl);

        // Auto-save immediately so thumbnail is live right away without needing extra clicks
        const saveRes = await savePortalShareMessageAction(token, currentText, newUrl);
        if (saveRes.ok) {
          onShowToast("Foto kartu WhatsApp berhasil diunggah & disimpan otomatis!");
        } else {
          onShowToast("Foto diunggah. Klik Simpan untuk memperbarui format pesan.");
        }
      } else {
        onShowToast(res.error || "Gagal mengunggah foto.");
      }
    } catch {
      onShowToast("Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setShareImageUrl(null);
    onShareImageChange?.(null);
    startTransition(async () => {
      const res = await savePortalShareMessageAction(token, currentText, null);
      if (res.ok) {
        onShowToast("Foto kartu WhatsApp dihapus & disimpan otomatis.");
      } else {
        onShowToast("Foto kartu dihapus. Klik Simpan untuk menerapkan.");
      }
    });
  };

  const handleSave = () => {
    if (!currentText.trim()) {
      onShowToast("Format pesan tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const res = await savePortalShareMessageAction(token, currentText, shareImageUrl);
      if (res.ok) {
        onShowToast("Format pesan dan foto kartu WhatsApp berhasil disimpan!");
      } else {
        onShowToast(res.error || "Gagal menyimpan format pesan.");
      }
    });
  };

  return (
    <div className={styles.card}>
      {/* Clickable Header */}
      <div className={styles.header} onClick={() => setIsOpen((prev) => !prev)}>
        <div className={styles.titleArea}>
          <div className={styles.iconBadge}>
            <MessageCircleIcon size={20} />
          </div>
          <div>
            <h3 className={styles.titleText}>Format Teks & Foto Pesan WhatsApp</h3>
            <p className={styles.subText}>
              Unggah foto kartu preview WhatsApp dan sesuaikan kata-kata sapaan saat membagikan link ke tamu undangan
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label={isOpen ? "Tutup Editor Format Pesan & Foto" : "Atur Format Pesan & Foto"}
        >
          <span>{isOpen ? "Tutup Editor" : "Atur Format Pesan & Foto"}</span>
          {isOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </button>
      </div>

      {/* Collapsible Body */}
      {isOpen && (
        <div className={styles.body}>
          {/* 1. Custom WhatsApp Card Photo Upload */}
          <div className={styles.imageUploadSection}>
            <div className={styles.sectionLabel}>
              <ImageIcon size={14} />
              <span>Foto Kartu Preview WhatsApp (Thumbnail Kustom):</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp,image/avif"
              style={{ display: "none" }}
            />

            {shareImageUrl ? (
              <div className={styles.imagePreviewWrapper}>
                <div className={styles.imagePreviewCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shareImageUrl}
                    alt="Pratinjau Foto Kartu WhatsApp"
                    className={styles.imagePreviewImg}
                  />
                  <div className={styles.imageBadgeActive}>Foto Kustom Aktif</div>
                </div>
                <div className={styles.imageActionsRow}>
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.btnChangeImg}
                  >
                    <UploadCloudIcon size={14} />
                    <span>{isUploadingImage ? "Mengunggah..." : "Ganti Foto"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={handleRemoveImage}
                    className={styles.btnRemoveImg}
                  >
                    <Trash2Icon size={14} />
                    <span>Hapus Foto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={styles.uploadDropzone}
                onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className={styles.uploadIconWrap}>
                  <UploadCloudIcon size={22} />
                </div>
                <div className={styles.uploadMainText}>
                  {isUploadingImage ? "Sedang Mengunggah Foto..." : "Klik untuk Unggah Foto Kartu WhatsApp"}
                </div>
                <div className={styles.uploadSubText}>
                  Foto ini akan otomatis muncul sebagai gambar utama saat link dibagikan di WhatsApp. (Disarankan rasio lanskap atau foto terbaik Anda, JPG/PNG maks. 15MB)
                </div>
              </div>
            )}
          </div>

          {/* 2. 1-Click Presets */}
          {presets.length > 0 && (
            <div className={styles.presetsSection}>
              <div className={styles.sectionLabel}>
                <SparklesIcon size={14} />
                <span>Pilihan Template Sekali Klik:</span>
              </div>
              <div className={styles.presetPills}>
                {presets.map((preset) => {
                  const isCurrent =
                    selectedPresetId === preset.id ||
                    currentText.trim() === preset.content.trim();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`${styles.presetBtn} ${isCurrent ? styles.presetBtnActive : ""}`}
                    >
                      {preset.isDefault && <StarIcon size={12} />}
                      <span>{preset.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Quick Variable Tag Insertion */}
          <div className={styles.tagsSection}>
            <div className={styles.sectionLabel}>
              <TagIcon size={14} />
              <span>Sisipkan Variabel Dinamis (Klik untuk Tambah):</span>
            </div>
            <div className={styles.tagChips}>
              {VARIABLE_TAGS.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => insertTag(t.tag)}
                  className={styles.tagChip}
                  title={t.desc}
                >
                  <span>{t.tag}</span>
                  <span className={styles.tagDesc}>({t.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Text Editor */}
          <div className={styles.editorWrapper}>
            <div className={styles.sectionLabel}>
              <Edit3Icon size={14} />
              <span>Teks Pesan Undangan:</span>
            </div>
            <textarea
              ref={textareaRef}
              rows={8}
              value={currentText}
              onChange={handleTextChange}
              placeholder="Tuliskan format pesan undangan Anda di sini..."
              className={styles.textarea}
            />
            <span className={styles.charCount}>{currentText.length} karakter</span>
          </div>

          {/* 5. Live Simulated WhatsApp Preview */}
          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <SmartphoneIcon size={14} />
                <span>Simulasi Tampilan Pesan di WhatsApp Tamu</span>
              </div>
              <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>09:41</span>
            </div>

            <div className={styles.simulatedBubble}>
              {/* WhatsApp Link Card Preview */}
              <div className={styles.waCardPreview}>
                <div className={styles.waCardImageWrap}>
                  {shareImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shareImageUrl}
                      alt="Thumbnail Undangan WhatsApp"
                      className={styles.waCardImage}
                    />
                  ) : (
                    <div className={styles.waCardPlaceholder}>
                      <ImageIcon size={28} />
                      <span>Thumbnail Template Standar (Otomatis)</span>
                    </div>
                  )}
                </div>
                <div className={styles.waCardInfo}>
                  <div className={styles.waCardTitle}>
                    {eventDetails?.eventTitle || "Undangan Digital"}
                  </div>
                  <div className={styles.waCardDesc}>
                    {eventDetails?.eventDate || "Undangan Pernikahan Digital"}
                  </div>
                  <div className={styles.waCardDomain}>
                    {typeof window !== "undefined" ? window.location.hostname : "undangan.id"}
                  </div>
                </div>
              </div>

              {/* Message text below the card */}
              <div className={styles.waCardText}>{previewText}</div>
            </div>
          </div>

          {/* 6. Footer Save Action */}
          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={() => {
                const defaultP = presets.find((p) => p.isDefault) || presets[0];
                if (defaultP) {
                  handleSelectPreset(defaultP);
                }
              }}
              className={styles.resetBtn}
            >
              <RotateCcwIcon size={14} />
              <span>Kembalikan ke Default</span>
            </button>
            <button
              type="button"
              disabled={isPending || isUploadingImage}
              onClick={handleSave}
              className={styles.saveBtn}
            >
              <SaveIcon size={15} />
              <span>{isPending ? "Menyimpan..." : "Simpan Format & Foto"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
