"use client";

import { useId } from "react";
import type { OpeningScreenConfig, OpeningTemplate } from "@/lib/schema";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { FieldRow } from "./fields";
import { IconSparkle, IconTrash } from "./icons";
import styles from "./editor.module.css";

export interface OpeningScreenControlProps {
  readonly readOnly?: boolean;
}

interface TemplateOption {
  readonly id: OpeningTemplate;
  readonly name: string;
  readonly icon: string;
  readonly desc: string;
  readonly accent: string;
  readonly tag: string;
}

const TEMPLATE_OPTIONS: readonly TemplateOption[] = [
  {
    id: "royal-envelope",
    name: "Royal Envelope",
    icon: "✉️",
    desc: "Amplop klasik 3D dengan segel lilin emas timbul & kartu meluncur.",
    accent: "#d4af37",
    tag: "Klasik & Mewah",
  },
  {
    id: "modern-editorial",
    name: "Modern Editorial",
    icon: "📰",
    desc: "Tipografi majalah mode tinggi Vogue, minimalis monokrom bersih.",
    accent: "#171717",
    tag: "Minimalis Chic",
  },
  {
    id: "luxury-arch",
    name: "Luxury Arch",
    icon: "👑",
    desc: "Kubah gerbang emas kerajaan dengan efek kilau & tirai terbuka.",
    accent: "#e6ca65",
    tag: "Royal Palace",
  },
  {
    id: "botanical-watercolor",
    name: "Botanical Garden",
    icon: "🌿",
    desc: "Nuansa floral romantis sage-blush & animasi kelopak bunga gugur.",
    accent: "#557153",
    tag: "Floral Romantis",
  },
  {
    id: "cinematic-glass",
    name: "Cinematic Glass",
    icon: "💎",
    desc: "Gelap romantis dengan aurora mesh glowing & kartu frosted glass.",
    accent: "#e85d8f",
    tag: "Modern Aurora",
  },
];

export function OpeningScreenControl({ readOnly }: OpeningScreenControlProps) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const enableId = useId();

  const opening: OpeningScreenConfig | undefined = doc.design.opening;
  const isEnabled = Boolean(opening?.enabled);
  const currentTemplate: OpeningTemplate = opening?.template ?? "royal-envelope";

  const handleToggle = (checked: boolean) => {
    store.getState().patchOpeningScreen({
      enabled: checked,
      template: currentTemplate,
      title: opening?.title ?? "The Wedding Of",
      subtitle: opening?.subtitle ?? "Undangan Pernikahan",
      guestLabel: opening?.guestLabel ?? "Kepada Yth. Bapak/Ibu/Saudara/i:",
      buttonText: opening?.buttonText ?? "Buka Undangan",
    });
  };

  const handleSelectTemplate = (template: OpeningTemplate) => {
    store.getState().patchOpeningScreen({
      template,
      enabled: true,
    });
  };

  const handlePatch = (patch: Partial<OpeningScreenConfig>) => {
    store.getState().patchOpeningScreen(patch);
  };

  const handleTestPreview = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dib:replay-opening"));
    }
  };

  return (
    <div className={styles.elementPanel} data-testid="opening-screen-control">
      {/* Enable / Disable Switch */}
      <div className={styles.actionsBar} style={{ padding: "0.25rem 0 0.75rem", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
        <label htmlFor={enableId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
          <input
            id={enableId}
            type="checkbox"
            checked={isEnabled}
            disabled={readOnly}
            onChange={(e) => handleToggle(e.target.checked)}
            data-testid="opening-toggle-enabled"
            style={{ width: 16, height: 16, accentColor: "var(--accent, #e85d8f)", cursor: "pointer" }}
          />
          <span>Aktifkan Halaman Opening (Cover)</span>
        </label>
        {isEnabled && !readOnly && (
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => store.getState().setOpeningScreen(undefined)}
            title="Hapus / Reset Cover"
            style={{ color: "#ef4444", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
          >
            <IconTrash size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {!isEnabled ? (
        <div style={{ padding: "1rem 0", color: "var(--muted, #6b7280)", fontSize: "0.8rem", lineHeight: 1.5 }}>
          <p>
            Cover opening menampilkan layar pembuka eksklusif sebelum tamu masuk ke halaman undangan.
            Cocok untuk memutar musik otomatis dan menyapa nama tamu secara personal.
          </p>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => handleToggle(true)}
            style={{ marginTop: "0.75rem", width: "100%", justifyContent: "center" }}
            data-testid="opening-enable-cta"
          >
            <IconSparkle size={14} />
            <span>Gunakan Halaman Opening</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.75rem" }}>
          {/* 5 Templates Visual Selector */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted, #6b7280)" }}>
              Pilih Desain Template (5 Pilihan)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem", marginTop: "0.5rem" }}>
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = currentTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    data-testid={`opening-tpl-select-${tpl.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.65rem 0.8rem",
                      borderRadius: "0.65rem",
                      textAlign: "left",
                      cursor: "pointer",
                      border: isSelected ? `2px solid ${tpl.accent}` : "1px solid var(--border, #e5e7eb)",
                      background: isSelected ? "rgba(232, 93, 143, 0.05)" : "var(--bg-card, #ffffff)",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? `0 0 0 1px ${tpl.accent}` : "none",
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>{tpl.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground, #111827)" }}>
                          {tpl.name}
                        </span>
                        <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "9999px", background: "rgba(0,0,0,0.06)", fontWeight: 600 }}>
                          {tpl.tag}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.7rem", color: "var(--muted, #6b7280)", margin: "0.2rem 0 0", lineHeight: 1.3 }}>
                        {tpl.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Settings */}
          <div style={{ borderTop: "1px solid var(--border, #e5e7eb)", paddingTop: "0.75rem" }}>
            <FieldRow label="Judul Utama">
              <input
                type="text"
                className={styles.input}
                value={opening?.title ?? "The Wedding Of"}
                onChange={(e) => handlePatch({ title: e.target.value })}
                placeholder="The Wedding Of"
                disabled={readOnly}
                data-testid="opening-input-title"
              />
            </FieldRow>

            <FieldRow label="Sub-Judul / Acara">
              <input
                type="text"
                className={styles.input}
                value={opening?.subtitle ?? "Undangan Pernikahan"}
                onChange={(e) => handlePatch({ subtitle: e.target.value })}
                placeholder="Undangan Pernikahan"
                disabled={readOnly}
                data-testid="opening-input-subtitle"
              />
            </FieldRow>

            <FieldRow label="Nama Pasangan (Override)">
              <input
                type="text"
                className={styles.input}
                value={opening?.coupleName ?? ""}
                onChange={(e) => handlePatch({ coupleName: e.target.value || undefined })}
                placeholder="Otomatis dari data (cth: Anin & Raka)"
                disabled={readOnly}
                data-testid="opening-input-couple"
              />
            </FieldRow>

            <FieldRow label="Tanggal Acara">
              <input
                type="text"
                className={styles.input}
                value={opening?.dateText ?? ""}
                onChange={(e) => handlePatch({ dateText: e.target.value || undefined })}
                placeholder="Otomatis atau ketik manual (cth: 24 Oktober 2026)"
                disabled={readOnly}
                data-testid="opening-input-date"
              />
            </FieldRow>

            <FieldRow label="Lokasi Acara">
              <input
                type="text"
                className={styles.input}
                value={opening?.locationText ?? ""}
                onChange={(e) => handlePatch({ locationText: e.target.value || undefined })}
                placeholder="Cth: Gedung Sasana Kriya, Jakarta"
                disabled={readOnly}
                data-testid="opening-input-location"
              />
            </FieldRow>

            <FieldRow label="Label Penerima Tamu">
              <input
                type="text"
                className={styles.input}
                value={opening?.guestLabel ?? "Kepada Yth. Bapak/Ibu/Saudara/i:"}
                onChange={(e) => handlePatch({ guestLabel: e.target.value })}
                placeholder="Kepada Yth. Bapak/Ibu/Saudara/i:"
                disabled={readOnly}
                data-testid="opening-input-guest-label"
              />
            </FieldRow>

            <FieldRow label="Teks Tombol Buka">
              <input
                type="text"
                className={styles.input}
                value={opening?.buttonText ?? "Buka Undangan"}
                onChange={(e) => handlePatch({ buttonText: e.target.value })}
                placeholder="Buka Undangan"
                disabled={readOnly}
                data-testid="opening-input-btn-text"
              />
            </FieldRow>
          </div>

          {/* Test Trigger Button */}
          <div style={{ paddingTop: "0.5rem" }}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleTestPreview}
              style={{ width: "100%", justifyContent: "center" }}
              data-testid="opening-test-replay-btn"
            >
              <span>🔄 Putar Ulang Cover di Preview</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
