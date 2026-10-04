"use client";

import { useEffect, useRef, useState } from "react";
import { IconGift, IconPlus, IconTrash } from "./icons";
import styles from "./editor.module.css";

export interface GiftEditorAccount {
  readonly bank: string;
  readonly accountNumber: string;
  readonly accountName: string;
}

const MAX_GIFT_ACCOUNTS = 10;

const BANK_PRESETS = [
  "BCA",
  "Mandiri",
  "BRI",
  "BNI",
  "BSI",
  "CIMB Niaga",
  "DANA",
  "GoPay",
  "OVO",
  "ShopeePay",
] as const;

const SAMPLE_ACCOUNTS: readonly GiftEditorAccount[] = [
  { bank: "BCA", accountNumber: "1234567890", accountName: "Sarah Jenkins" },
  { bank: "Mandiri", accountNumber: "9876543210123", accountName: "Rama Wijaya" },
];

function normalizeAccounts(value: unknown): GiftEditorAccount[] {
  if (!Array.isArray(value)) return [];
  const accounts: GiftEditorAccount[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const accountNumber = typeof rec.accountNumber === "string" ? rec.accountNumber.trim() : "";
    if (!accountNumber) continue;
    accounts.push({
      bank: typeof rec.bank === "string" ? rec.bank.trim() : "",
      accountNumber,
      accountName: typeof rec.accountName === "string" ? rec.accountName.trim() : "",
    });
    if (accounts.length === MAX_GIFT_ACCOUNTS) break;
  }
  return accounts;
}

export function GiftAccountsControl({
  value,
  disabled,
  onChange,
}: {
  readonly elementId?: string;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (accounts: readonly GiftEditorAccount[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form draft state
  const [draftBank, setDraftBank] = useState("");
  const [draftNumber, setDraftNumber] = useState("");
  const [draftName, setDraftName] = useState("");

  const accounts = normalizeAccounts(value);
  const accountsRef = useRef(accounts);
  const atLimit = accounts.length >= MAX_GIFT_ACCOUNTS;

  useEffect(() => {
    accountsRef.current = normalizeAccounts(value);
  }, [value]);

  const commit = (next: GiftEditorAccount[]) => {
    accountsRef.current = next;
    onChange(next);
  };

  const startAdd = () => {
    setEditingIndex(null);
    setDraftBank("BCA");
    setDraftNumber("");
    setDraftName("");
    setIsAdding(true);
  };

  const startEdit = (index: number) => {
    const acc = accounts[index];
    if (!acc) return;
    setIsAdding(false);
    setEditingIndex(index);
    setDraftBank(acc.bank);
    setDraftNumber(acc.accountNumber);
    setDraftName(acc.accountName);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setDraftBank("");
    setDraftNumber("");
    setDraftName("");
  };

  const saveForm = () => {
    const bank = draftBank.trim() || "BANK";
    const accountNumber = draftNumber.trim();
    const accountName = draftName.trim();
    if (!accountNumber) return;

    const newAccount: GiftEditorAccount = { bank, accountNumber, accountName };
    if (editingIndex !== null) {
      const next = [...accounts];
      next[editingIndex] = newAccount;
      commit(next);
    } else {
      commit([...accounts, newAccount]);
    }
    cancelForm();
  };

  const removeAt = (index: number) => {
    if (editingIndex === index) cancelForm();
    commit(accounts.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= accounts.length) return;
    const next = [...accounts];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    commit(next);
  };

  const loadSamples = () => {
    commit([...SAMPLE_ACCOUNTS]);
  };

  return (
    <div className={styles.giftAccountsControl} data-testid="gift-accounts-control">
      {/* Header */}
      <div className={styles.giftControlHeader}>
        <span className={styles.giftControlCount}>
          <IconGift size={14} />
          {accounts.length} / {MAX_GIFT_ACCOUNTS} rekening
        </span>
        <button
          type="button"
          className={styles.galleryAddButton}
          disabled={disabled || atLimit}
          data-testid="gift-add-button"
          onClick={isAdding ? cancelForm : startAdd}
        >
          <IconPlus size={13} />
          {isAdding ? "Batal" : "Tambah"}
        </button>
      </div>

      {/* Add / Edit Form Modal-like card */}
      {(isAdding || editingIndex !== null) && (
        <div className={styles.giftFormCard} data-testid="gift-account-form">
          <p className={styles.giftFormTitle}>
            {editingIndex !== null ? `Edit Rekening #${editingIndex + 1}` : "Tambah Rekening Baru"}
          </p>

          {/* Quick Bank Presets */}
          <div className={styles.giftPresets}>
            {BANK_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={[styles.giftPresetChip, draftBank === p && styles.giftPresetChipActive]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setDraftBank(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div className={styles.giftFormFields}>
            <label className={styles.giftFieldLabel}>
              Nama Bank / E-Wallet
              <input
                type="text"
                className={styles.input}
                placeholder="Contoh: BCA, Mandiri, DANA"
                value={draftBank}
                maxLength={40}
                disabled={disabled}
                onChange={(e) => setDraftBank(e.target.value)}
              />
            </label>

            <label className={styles.giftFieldLabel}>
              Nomor Rekening / HP
              <input
                type="text"
                className={styles.input}
                placeholder="Contoh: 1234 5678 90"
                value={draftNumber}
                maxLength={40}
                disabled={disabled}
                onChange={(e) => setDraftNumber(e.target.value)}
              />
            </label>

            <label className={styles.giftFieldLabel}>
              Atas Nama (a.n.)
              <input
                type="text"
                className={styles.input}
                placeholder="Contoh: Nama Pemilik"
                value={draftName}
                maxLength={60}
                disabled={disabled}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.giftFormActions}>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={cancelForm}
              disabled={disabled}
            >
              Batal
            </button>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={saveForm}
              disabled={disabled || !draftNumber.trim()}
              data-testid="gift-save-account-btn"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      {accounts.length === 0 ? (
        <div className={styles.giftEmptyBox}>
          <IconGift size={24} />
          <strong>Belum ada rekening</strong>
          <span className={styles.muted}>
            Tambahkan rekening atau e-wallet untuk menerima hadiah digital.
          </span>
          <button
            type="button"
            className={styles.giftSampleButton}
            onClick={loadSamples}
            disabled={disabled}
          >
            Gunakan Contoh Rekening
          </button>
        </div>
      ) : (
        <ol className={styles.giftEditorList} aria-label="Daftar rekening hadiah">
          {accounts.map((acc, index) => (
            <li
              key={`${acc.bank}-${acc.accountNumber}-${index}`}
              className={[
                styles.giftEditorItem,
                editingIndex === index && styles.giftEditorItemActive,
              ]
                .filter(Boolean)
                .join(" ")}
              data-testid="gift-editor-item"
            >
              <span className={styles.giftItemBadge}>
                {(acc.bank || "$").slice(0, 3).toUpperCase()}
              </span>

              <div className={styles.giftItemDetails}>
                <div className={styles.giftItemHeader}>
                  <strong className={styles.giftItemBank}>{acc.bank}</strong>
                  {acc.accountName ? (
                    <span className={styles.giftItemName}>a.n. {acc.accountName}</span>
                  ) : null}
                </div>
                <span className={styles.giftItemNumber}>{acc.accountNumber}</span>
              </div>

              <div className={styles.giftItemControls}>
                <button
                  type="button"
                  className={styles.giftItemBtn}
                  disabled={disabled || index === 0}
                  aria-label={`Naikkan rekening ${index + 1}`}
                  onClick={() => move(index, index - 1)}
                  title="Pindah ke atas"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  className={styles.giftItemBtn}
                  disabled={disabled || index === accounts.length - 1}
                  aria-label={`Turunkan rekening ${index + 1}`}
                  onClick={() => move(index, index + 1)}
                  title="Pindah ke bawah"
                >
                  &darr;
                </button>
                <button
                  type="button"
                  className={styles.giftItemBtn}
                  disabled={disabled}
                  aria-label={`Edit rekening ${index + 1}`}
                  onClick={() => startEdit(index)}
                  title="Edit rekening"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.galleryRemoveButton}
                  disabled={disabled}
                  aria-label={`Hapus rekening ${index + 1}`}
                  onClick={() => removeAt(index)}
                  title="Hapus rekening"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {atLimit ? (
        <p className={styles.muted}>Batas maksimal {MAX_GIFT_ACCOUNTS} rekening telah tercapai.</p>
      ) : null}
    </div>
  );
}
