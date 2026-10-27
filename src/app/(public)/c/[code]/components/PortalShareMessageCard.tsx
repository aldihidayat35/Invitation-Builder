"use client";

import React, { useState, useRef, useTransition } from "react";
import type { PortalShareMessageTemplate } from "@/features/orders";
import { interpolateMessageTemplate } from "@/lib/db/repositories/message-templates";
import { savePortalShareMessageAction } from "../actions";
import styles from "./PortalShareMessageCard.module.css";

interface PortalShareMessageCardProps {
  token: string;
  presets?: PortalShareMessageTemplate[];
  activeTemplate: string;
  eventDetails?: {
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
  };
  shareableUrl?: string | null;
  onTemplateChange: (newTemplate: string) => void;
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
  eventDetails,
  shareableUrl,
  onTemplateChange,
  onShowToast,
}: PortalShareMessageCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentText, setCurrentText] = useState(activeTemplate);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSave = () => {
    if (!currentText.trim()) {
      onShowToast("Format pesan tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const res = await savePortalShareMessageAction(token, currentText);
      if (res.ok) {
        onShowToast("Format pesan undangan WhatsApp berhasil disimpan!");
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
          <div className={styles.iconBadge}>💬</div>
          <div>
            <h3 className={styles.titleText}>Format Teks Pesan WhatsApp</h3>
            <p className={styles.subText}>
              Sesuaikan kata-kata sapaan saat membagikan link ke tamu undangan atau gunakan template 1-klik
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
        >
          <span>{isOpen ? "Tutup Editor" : "Atur Format Pesan"}</span>
          <span>{isOpen ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* Collapsible Body */}
      {isOpen && (
        <div className={styles.body}>
          {/* 1-Click Presets */}
          {presets.length > 0 && (
            <div className={styles.presetsSection}>
              <div className={styles.sectionLabel}>
                <span>✨ Pilihan Template Sekali Klik:</span>
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
                      <span>{preset.isDefault ? "⭐ " : ""}{preset.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Variable Tag Insertion */}
          <div className={styles.tagsSection}>
            <div className={styles.sectionLabel}>
              <span>🏷️ Sisipkan Variabel Dinamis (Klik untuk Tambah):</span>
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

          {/* Text Editor */}
          <div className={styles.editorWrapper}>
            <div className={styles.sectionLabel}>
              <span>📝 Teks Pesan Undangan:</span>
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

          {/* Live Simulated WhatsApp Preview */}
          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>📱 Simulasi Pesan WhatsApp Tamu</span>
              <span style={{ fontFamily: "monospace", fontSize: "0.68rem" }}>09:41</span>
            </div>
            <div className={styles.previewBubble}>{previewText}</div>
          </div>

          {/* Footer Save Action */}
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
              Kembalikan ke Default
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className={styles.saveBtn}
            >
              <span>💾</span>
              <span>{isPending ? "Menyimpan..." : "Simpan Format Pesan"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
