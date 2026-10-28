"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FormGroup } from "@/lib/engine";
import {
  isGiftAccountVariableKey,
  MASTER_BANKS_DEFAULT,
  resolveFallbackBankLogo,
  type BankVerificationMeta,
} from "@/lib/engine";
import { savePortalInvitationDataAction } from "../actions";
import { PortalImageField } from "./PortalImageField";
import {
  VariableGroupIcon,
  ClockIcon,
  CheckIcon,
  Edit3Icon,
  AlertTriangleIcon,
  SaveIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  XIcon,
  LightbulbIcon,
  WhatsAppIcon,
} from "./PortalIcons";
import styles from "../client-portal.module.css";

interface PortalVariableFormProps {
  token: string;
  groups: FormGroup[];
  initialValues: Record<string, string>;
  initialErrors: Record<string, string>;
  previewUrl?: string | null;
  bankVerification?: BankVerificationMeta | null;
  onSwitchToAdmin?: () => void;
  onSaved?: (values: Record<string, string>) => void;
}

type SaveStatus = "saved" | "dirty" | "saving" | "error";

export function PortalVariableForm({
  token,
  groups,
  initialValues,
  initialErrors,
  previewUrl,
  bankVerification,
  onSwitchToAdmin,
  onSaved,
}: PortalVariableFormProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isRequestingBankChange, setIsRequestingBankChange] = useState(false);
  const [bankChangeNote, setBankChangeNote] = useState(bankVerification?.clientNote ?? "");

  const isBankVerified = bankVerification?.status === "verified";

  const valuesRef = useRef(values);
  valuesRef.current = values;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);

  const saveToServer = useCallback(
    async (
      currentValues: Record<string, string>,
      opts?: { requestingBankChange?: boolean; bankNote?: string },
    ) => {
      const currentSeq = ++sequenceRef.current;
      setSaveStatus("saving");
      setStatusMessage("Menyimpan perubahan…");

      const payload: Record<string, string> = { ...currentValues };
      const reqChange = opts?.requestingBankChange ?? isRequestingBankChange;
      const bNote = opts?.bankNote ?? bankChangeNote;
      if (reqChange) {
        payload["_requestBankChange"] = "true";
        if (bNote) {
          payload["_bankChangeNote"] = bNote;
        }
      }

      try {
        const res = await savePortalInvitationDataAction(token, payload);
        if (currentSeq !== sequenceRef.current) return;

        if (res.ok) {
          setSaveStatus("saved");
          setStatusMessage(
            reqChange
              ? "Perubahan data & permohonan rekening berhasil dikirim ke Admin."
              : "Perubahan tersimpan otomatis.",
          );
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
    [token, onSaved, isRequestingBankChange, bankChangeNote],
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
    const field = groups.flatMap((g) => g.fields).find((f) => f.key === key);
    const finalVal = field?.maxLength ? val.slice(0, field.maxLength) : val;
    setValues((prev) => ({ ...prev, [key]: finalVal }));
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
            {saveStatus === "saving" && (
              <>
                <ClockIcon size={14} />
                <span>Menyimpan…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckIcon size={14} />
                <span>Tersimpan</span>
              </>
            )}
            {saveStatus === "dirty" && (
              <>
                <Edit3Icon size={14} />
                <span>Belum disimpan</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertTriangleIcon size={14} />
                <span>Gagal menyimpan</span>
              </>
            )}
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
            <SaveIcon size={16} />
            <span>{isPending || saveStatus === "saving" ? "Menyimpan…" : "Simpan Perubahan"}</span>
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.btnSecondary}
              style={{ fontSize: "0.85rem", padding: "0.55rem 1rem" }}
            >
              <span>Lihat Pratinjau</span>
              <ExternalLinkIcon size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Field Groups */}
      <div className={styles.varGroupsList}>
        {groups.map((group) => {
          const hasBankFields = group.fields.some((f) => isGiftAccountVariableKey(f.key));

          return (
            <fieldset key={group.group} className={styles.varGroupCard}>
              <legend className={styles.varGroupLegend}>
                <span className={styles.varGroupIcon}>
                  <VariableGroupIcon groupName={group.group} label={group.label} size={20} />
                </span>
                <span>{group.label}</span>
              </legend>

              <div className={styles.varGrid}>
                {group.fields.map((field) => {
                  const val = values[field.key] ?? "";
                  const err = errors[field.key];
                  const fieldId = `portal-field-${field.key}`;
                  const isBankField = isGiftAccountVariableKey(field.key);
                  const isFieldLocked = isBankField && isBankVerified && !isRequestingBankChange;

                  return (
                    <div
                      key={field.key}
                      className={`${styles.varField} ${
                        field.control === "richtext" ? styles.varFieldFull : ""
                      }`}
                    >
                      <label htmlFor={fieldId} className={styles.varLabel}>
                        <span>{field.label}</span>
                        {field.required && (
                          <span className={styles.varRequired} title="Wajib diisi">
                            {" "}
                            *
                          </span>
                        )}
                        {isBankField && isFieldLocked && (
                          <span
                            className={styles.bankVerifiedTag}
                            title="Terkunci demi keamanan, telah diverifikasi resmi oleh Admin"
                          >
                            <ShieldCheckIcon size={12} />
                            <span>Terverifikasi Admin</span>
                          </span>
                        )}
                        {isBankField && isRequestingBankChange && (
                          <span
                            className={styles.bankProposalTag}
                            title="Usulan rekening ini akan ditinjau dan diverifikasi oleh Admin"
                          >
                            <Edit3Icon size={12} />
                            <span>Usulan Baru</span>
                          </span>
                        )}
                        {isBankField && !isBankVerified && !isRequestingBankChange && (
                          <span
                            className={styles.bankPendingTag}
                            title="Rekening akan diverifikasi oleh Admin sebelum terbit"
                          >
                            <ClockIcon size={12} />
                            <span>Usulan Rekening</span>
                          </span>
                        )}
                      </label>

                      {field.control === "richtext" ? (
                        <textarea
                          id={fieldId}
                          name={field.key}
                          rows={3}
                          maxLength={field.maxLength}
                          disabled={isFieldLocked}
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className={`${styles.textarea} ${err ? styles.inputError : ""}`}
                          placeholder={`Isi ${field.label.toLowerCase()}…`}
                        />
                      ) : field.control === "select" ? (
                        <select
                          id={fieldId}
                          name={field.key}
                          disabled={isFieldLocked}
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
                      ) : field.control === "image" ? (
                        <PortalImageField
                          id={fieldId}
                          name={field.key}
                          label={field.label}
                          value={val}
                          disabled={isFieldLocked}
                          token={token}
                          onChange={(newVal) => handleChange(field.key, newVal)}
                          error={err}
                        />
                      ) : isBankField &&
                        (field.key === "gift.bank" ||
                          field.key === "gift.bank2" ||
                          field.key === "gift.bank_name" ||
                          field.key === "gift.bank_name2" ||
                          field.key === "bank" ||
                          field.key === "bank2") ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {val ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "48px",
                                  height: "36px",
                                  borderRadius: "6px",
                                  border: "1px solid #e5e0dc",
                                  backgroundColor: "#ffffff",
                                  padding: "2px 4px",
                                  flexShrink: 0,
                                }}
                                title={val}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={resolveFallbackBankLogo(val)}
                                  alt={val}
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                              </div>
                            ) : null}
                            <select
                              id={fieldId}
                              name={field.key}
                              disabled={isFieldLocked}
                              value={
                                MASTER_BANKS_DEFAULT.some(
                                  (b) =>
                                    b.name.toLowerCase() === val.toLowerCase() ||
                                    b.code.toLowerCase() === val.toLowerCase(),
                                )
                                  ? MASTER_BANKS_DEFAULT.find(
                                      (b) =>
                                        b.name.toLowerCase() === val.toLowerCase() ||
                                        b.code.toLowerCase() === val.toLowerCase(),
                                    )?.code
                                  : val
                                    ? "__custom__"
                                    : ""
                              }
                              onChange={(e) => {
                                const selectedCode = e.target.value;
                                if (selectedCode === "__custom__") {
                                  // Client chose custom, input below will be used
                                } else {
                                  const found = MASTER_BANKS_DEFAULT.find(
                                    (b) => b.code === selectedCode,
                                  );
                                  if (found) {
                                    handleChange(field.key, found.name);
                                    if (
                                      field.key === "gift.bank" ||
                                      field.key === "gift.bank_name" ||
                                      field.key === "bank"
                                    ) {
                                      handleChange("gift.bankLogo", found.logoUrl);
                                    } else if (
                                      field.key === "gift.bank2" ||
                                      field.key === "bank2"
                                    ) {
                                      handleChange("gift.bankLogo2", found.logoUrl);
                                    }
                                  } else {
                                    handleChange(field.key, "");
                                  }
                                }
                              }}
                              className={`${styles.input} ${err ? styles.inputError : ""}`}
                              style={{ flex: 1 }}
                            >
                              <option value="">- Pilih Bank / E-Wallet -</option>
                              <optgroup label="Bank Populer">
                                {MASTER_BANKS_DEFAULT.filter((b) => b.category === "bank").map(
                                  (b) => (
                                    <option key={b.code} value={b.code}>
                                      {b.name}
                                    </option>
                                  ),
                                )}
                              </optgroup>
                              <optgroup label="Dompet Digital & QRIS">
                                {MASTER_BANKS_DEFAULT.filter((b) => b.category !== "bank").map(
                                  (b) => (
                                    <option key={b.code} value={b.code}>
                                      {b.name}
                                    </option>
                                  ),
                                )}
                              </optgroup>
                              <option value="__custom__">Bank Lainnya (Input Manual)...</option>
                            </select>
                          </div>
                          {(!val ||
                            !MASTER_BANKS_DEFAULT.some(
                              (b) =>
                                b.name.toLowerCase() === val.toLowerCase() ||
                                b.code.toLowerCase() === val.toLowerCase(),
                            )) && (
                            <input
                              type="text"
                              disabled={isFieldLocked}
                              value={val}
                              onChange={(e) => {
                                handleChange(field.key, e.target.value);
                                const autoLogo = resolveFallbackBankLogo(e.target.value);
                                if (
                                  field.key === "gift.bank" ||
                                  field.key === "gift.bank_name" ||
                                  field.key === "bank"
                                ) {
                                  handleChange("gift.bankLogo", autoLogo);
                                } else if (
                                  field.key === "gift.bank2" ||
                                  field.key === "bank2"
                                ) {
                                  handleChange("gift.bankLogo2", autoLogo);
                                }
                              }}
                              className={`${styles.input} ${err ? styles.inputError : ""}`}
                              placeholder="Ketik nama bank lainnya di sini…"
                            />
                          )}
                        </div>
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
                          maxLength={field.maxLength}
                          disabled={isFieldLocked}
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className={`${styles.input} ${err ? styles.inputError : ""}`}
                          placeholder={
                            field.control === "url"
                              ? "https://maps.google.com/..."
                              : `Masukkan ${field.label.toLowerCase()}…`
                          }
                        />
                      )}

                      {field.maxLength !== undefined && (
                        <div className={styles.charCountRow}>
                          <span className={styles.charCountText}>
                            {val.length} / {field.maxLength} karakter
                          </span>
                          {val.length >= field.maxLength && (
                            <span className={styles.charLimitTag}>Batas tercapai</span>
                          )}
                        </div>
                      )}

                      {err && (
                        <span className={styles.varErrorText}>
                          <AlertTriangleIcon size={13} />
                          <span>{err}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bank Verification & Security Box */}
              {hasBankFields && (
                <>
                  {isBankVerified ? (
                    !isRequestingBankChange ? (
                      <div className={styles.bankNoticeBox}>
                        <div className={styles.bankNoticeHeader}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <ShieldCheckIcon size={16} />
                            <strong>Rekening Resmi Terkunci</strong>
                          </span>
                          {bankVerification?.verifiedAt && (
                            <span className={styles.bankNoticeDate}>
                              Diverifikasi pada{" "}
                              {new Date(bankVerification.verifiedAt).toLocaleDateString("id-ID")}
                            </span>
                          )}
                        </div>
                        <p className={styles.bankNoticeText}>
                          Nomor rekening amplop digital ini telah diverifikasi resmi oleh tim Admin demi
                          keamanan transaksi undangan Anda. Kolom rekening dikunci dari pengeditan langsung.
                        </p>
                        {bankVerification?.proposedPrimary && (
                          <div className={styles.bankPendingAlert}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
                              <ClockIcon size={14} />
                              <span>Permohonan perubahan rekening sedang ditinjau Admin:</span>
                            </div>
                            <div style={{ marginTop: "0.25rem" }}>
                              {bankVerification.proposedPrimary.bank} -{" "}
                              {bankVerification.proposedPrimary.accountNumber} a/n{" "}
                              {bankVerification.proposedPrimary.accountName}
                            </div>
                            {bankVerification.clientNote && (
                              <div style={{ fontStyle: "italic", marginTop: "0.2rem" }}>
                                Catatan: &ldquo;{bankVerification.clientNote}&rdquo;
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsRequestingBankChange(true)}
                          className={styles.btnSecondary}
                          style={{
                            alignSelf: "flex-start",
                            fontSize: "0.825rem",
                            padding: "0.55rem 1rem",
                            marginTop: "0.35rem",
                            minHeight: "44px",
                          }}
                        >
                          <RefreshCwIcon size={15} />
                          <span>Ajukan Perubahan Rekening</span>
                        </button>
                      </div>
                    ) : (
                      <div className={styles.bankChangeRequestBox}>
                        <div className={styles.bankNoticeHeader}>
                          <span style={{ color: "#92400e", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Edit3Icon size={16} />
                            <strong>Form Pengajuan Perubahan Rekening</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsRequestingBankChange(false)}
                            className={styles.bankCancelBtn}
                          >
                            <XIcon size={14} />
                            <span>Batal</span>
                          </button>
                        </div>
                        <p className={styles.bankNoticeText}>
                          Silakan ketik nomor rekening baru pada kolom di atas. Kolom rekening kini dapat diedit
                          untuk pengajuan usulan baru. Masukkan alasan perubahan di bawah ini lalu klik Simpan Perubahan.
                        </p>
                        <div>
                          <label
                            htmlFor="portal-bank-change-note"
                            style={{
                              fontSize: "0.785rem",
                              fontWeight: 600,
                              color: "#78350f",
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Alasan / Catatan Perubahan untuk Admin:
                          </label>
                          <input
                            id="portal-bank-change-note"
                            type="text"
                            value={bankChangeNote}
                            onChange={(e) => setBankChangeNote(e.target.value)}
                            placeholder="Contoh: Mengganti rekening BCA karena rekening lama sudah pasif"
                            className={styles.input}
                            style={{ background: "#ffffff" }}
                          />
                        </div>
                      </div>
                    )
                  ) : (
                    <div className={styles.bankUnverifiedNotice}>
                      <span style={{ fontSize: "0.85rem", color: "#2c2523", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <ShieldCheckIcon size={16} />
                        <strong>Verifikasi Keamanan Rekening</strong>
                      </span>
                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#786b5e" }}>
                        Rekening yang Anda isikan di atas merupakan <strong>usulan awal</strong>. Tim Admin
                        akan memeriksa dan memverifikasi rekening Anda sebelum menguncinya secara resmi pada undangan live.
                      </p>
                      {bankVerification?.status === "pending_review" && (
                        <div className={styles.bankPendingAlert} style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <ClockIcon size={14} />
                          <span>Usulan rekening Anda sedang menunggu verifikasi oleh tim Admin.</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </fieldset>
          );
        })}
      </div>

      {/* Assistance Switcher Banner */}
      <div className={styles.switcherNoticeCard}>
        <div className={styles.switcherNoticeContent}>
          <span className={styles.switcherNoticeIcon}>
            <LightbulbIcon size={20} />
          </span>
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
            style={{ whiteSpace: "nowrap", alignSelf: "center", minHeight: "44px" }}
          >
            <WhatsAppIcon size={16} />
            <span>Minta Bantuan Admin via WA</span>
          </button>
        )}
      </div>
    </form>
  );
}
