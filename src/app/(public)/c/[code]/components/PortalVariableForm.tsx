"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FormGroup } from "@/lib/engine";
import { savePortalInvitationDataAction } from "../actions";
import styles from "../client-portal.module.css";

interface PortalVariableFormProps {
  token: string;
  groups: FormGroup[];
  initialValues: Record<string, string>;
  initialErrors: Record<string, string>;
  previewUrl?: string | null;
  onSwitchToAdmin?: () => void;
  onSaved?: (values: Record<string, string>) => void;
}

type SaveStatus = "saved" | "dirty" | "saving" | "error";

function getGroupIcon(groupName: string, label: string): string {
  const g = `${groupName} ${label}`.toLowerCase();
  if (g.includes("mempelai") || g.includes("pengantin") || g.includes("couple")) return "💍";
  if (g.includes("akad") || g.includes("pemberkatan") || g.includes("nikah")) return "🕌";
  if (g.includes("resepsi") || g.includes("acara") || g.includes("jadwal")) return "🎊";
  if (g.includes("lokasi") || g.includes("tempat") || g.includes("venue") || g.includes("peta")) return "📍";
  if (g.includes("rekening") || g.includes("hadiah") || g.includes("amplop") || g.includes("gift") || g.includes("bank")) return "🎁";
  if (g.includes("doa") || g.includes("ucapan") || g.includes("cerita") || g.includes("quote")) return "💌";
  if (g.includes("foto") || g.includes("galeri") || g.includes("media")) return "🖼️";
  return "✍️";
}

export function PortalVariableForm({
  token,
  groups,
  initialValues,
  initialErrors,
  previewUrl,
  onSwitchToAdmin,
  onSaved,
}: PortalVariableFormProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valuesRef = useRef(values);
  valuesRef.current = values;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);

  const saveToServer = useCallback(
    async (currentValues: Record<string, string>) => {
      const currentSeq = ++sequenceRef.current;
      setSaveStatus("saving");
      setStatusMessage("Menyimpan perubahan…");

      try {
        const res = await savePortalInvitationDataAction(token, currentValues);
        if (currentSeq !== sequenceRef.current) return;

        if (res.ok) {
          setSaveStatus("saved");
          setStatusMessage("Perubahan tersimpan otomatis.");
          setErrors(res.errors || {});
          onSaved?.(currentValues);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan data.");
        }
      } catch (err: unknown) {
        if (currentSeq !== sequenceRef.current) return;
        setSaveStatus("error");
        setStatusMessage(
          err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.",
        );
      }
    },
    [token, onSaved],
  );

  const triggerDebouncedSave = useCallback(() => {
    setSaveStatus("dirty");
    setStatusMessage("Menunggu penyimpanan…");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveToServer(valuesRef.current);
    }, 800);
  }, [saveToServer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    triggerDebouncedSave();
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    startTransition(async () => {
      await saveToServer(valuesRef.current);
    });
  };

  if (groups.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyBox}>
          Template undangan ini belum memiliki variabel yang perlu diisi.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleManualSave} className={styles.varFormContainer}>
      {/* Top Controls Bar */}
      <div className={styles.varFormTopBar}>
        <div className={styles.varStatusRow}>
          <span
            className={`${styles.saveStatusBadge} ${
              saveStatus === "saving"
                ? styles.badgeSaving
                : saveStatus === "error"
                  ? styles.badgeError
                  : saveStatus === "dirty"
                    ? styles.badgeDirty
                    : styles.badgeSaved
            }`}
          >
            {saveStatus === "saving" && "⏳ Menyimpan…"}
            {saveStatus === "saved" && "✓ Tersimpan"}
            {saveStatus === "dirty" && "✏️ Belum disimpan"}
            {saveStatus === "error" && "⚠️ Gagal menyimpan"}
          </span>
          {statusMessage && <span className={styles.varStatusDesc}>{statusMessage}</span>}
        </div>

        <div className={styles.varActionsRow}>
          <button
            type="submit"
            disabled={isPending || saveStatus === "saving"}
            className={styles.btnPrimary}
            style={{ fontSize: "0.85rem", padding: "0.55rem 1.15rem" }}
          >
            {isPending || saveStatus === "saving" ? "Menyimpan…" : "💾 Simpan Perubahan"}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.btnSecondary}
              style={{ fontSize: "0.85rem", padding: "0.55rem 1rem" }}
            >
              Lihat Pratinjau ↗
            </a>
          )}
        </div>
      </div>

      {/* Field Groups */}
      <div className={styles.varGroupsList}>
        {groups.map((group) => {
          const icon = getGroupIcon(group.group, group.label);
          return (
            <fieldset key={group.group} className={styles.varGroupCard}>
              <legend className={styles.varGroupLegend}>
                <span className={styles.varGroupIcon}>{icon}</span>
                <span>{group.label}</span>
              </legend>

              <div className={styles.varGrid}>
                {group.fields.map((field) => {
                  const val = values[field.key] ?? "";
                  const err = errors[field.key];
                  const fieldId = `portal-field-${field.key}`;

                  return (
                    <div
                      key={field.key}
                      className={`${styles.varField} ${
                        field.control === "richtext" ? styles.varFieldFull : ""
                      }`}
                    >
                      <label htmlFor={fieldId} className={styles.varLabel}>
                        {field.label}
                        {field.required && (
                          <span className={styles.varRequired} title="Wajib diisi">
                            {" "}
                            *
                          </span>
                        )}
                      </label>

                      {field.control === "richtext" ? (
                        <textarea
                          id={fieldId}
                          name={field.key}
                          rows={3}
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className={`${styles.textarea} ${err ? styles.inputError : ""}`}
                          placeholder={`Isi ${field.label.toLowerCase()}…`}
                        />
                      ) : field.control === "select" ? (
                        <select
                          id={fieldId}
                          name={field.key}
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className={`${styles.input} ${err ? styles.inputError : ""}`}
                        >
                          <option value="">- Pilih Opsi -</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={fieldId}
                          type={
                            field.control === "number"
                              ? "number"
                              : field.control === "date"
                                ? "date"
                                : field.control === "datetime-local"
                                  ? "datetime-local"
                                  : field.control === "url"
                                    ? "url"
                                    : "text"
                          }
                          name={field.key}
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className={`${styles.input} ${err ? styles.inputError : ""}`}
                          placeholder={
                            field.control === "url"
                              ? "https://maps.google.com/..."
                              : field.control === "image"
                                ? "URL Gambar / Foto (atau kirim via WA)"
                                : `Masukkan ${field.label.toLowerCase()}…`
                          }
                        />
                      )}

                      {err && <span className={styles.varErrorText}>⚠️ {err}</span>}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      {/* Assistance Switcher Banner */}
      <div className={styles.switcherNoticeCard}>
        <div className={styles.switcherNoticeContent}>
          <span className={styles.switcherNoticeIcon}>💡</span>
          <div>
            <strong>Merasa repot mengisi banyak kolom formulir?</strong>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.825rem", color: "#786b5e" }}>
              Anda bisa meminta bantuan tim kami untuk menginputkan seluruh data dan materi acara
              langsung via chat WhatsApp.
            </p>
          </div>
        </div>
        {onSwitchToAdmin && (
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className={styles.btnSecondary}
            style={{ whiteSpace: "nowrap", alignSelf: "center" }}
          >
            💬 Minta Bantuan Admin via WA
          </button>
        )}
      </div>
    </form>
  );
}
