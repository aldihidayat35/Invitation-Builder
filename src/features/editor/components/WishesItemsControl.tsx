"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconClose, IconPencil, IconPlus, IconTrash, IconWishes } from "./icons";
import styles from "./editor.module.css";
import type { WishItem } from "@/features/widgets/runtime/WishesWidget";

const MAX_WISH_ITEMS = 20;

const WISH_PRESETS: readonly {
  readonly label: string;
  readonly name: string;
  readonly message: string;
  readonly presence: "hadir" | "berhalangan";
  readonly date: string;
}[] = [
  {
    label: "+ Doa Sahabat",
    name: "Dimas & Sarah",
    message: "Selamat ya kalian berdua! Semoga selalu dilimpahi kebahagiaan dan cinta sampai tua nanti. Congrats!",
    presence: "hadir",
    date: "Baru saja",
  },
  {
    label: "+ Doa Keluarga",
    name: "Keluarga Besar Bpk. H. Rahmat",
    message: "Barakallahu lakuma wa baraka 'alaikuma wa jama'a bainakuma fii khoir. Selamat menempuh hidup baru.",
    presence: "hadir",
    date: "1 jam lalu",
  },
  {
    label: "+ Ucapan Kolega",
    name: "Rekan Kantor (Team Marketing)",
    message: "Happy Wedding! Selamat berbahagia dan menikmati babak baru kehidupan bersama pasangan tercinta.",
    presence: "berhalangan",
    date: "2 jam lalu",
  },
];

function normalizeWishes(value: unknown): WishItem[] {
  if (!Array.isArray(value)) return [];
  const list: WishItem[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const message = typeof rec.message === "string" ? rec.message.trim() : "";
    if (!name && !message) continue;
    list.push({
      name: name || "Tamu",
      message: message || "Selamat berbahagia!",
      presence: typeof rec.presence === "string" ? rec.presence : "hadir",
      date: typeof rec.date === "string" ? rec.date : "Baru saja",
    });
    if (list.length === MAX_WISH_ITEMS) break;
  }
  return list;
}

export function WishesItemsControl({
  value,
  disabled,
  onChange,
}: {
  readonly elementId?: string;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (items: readonly WishItem[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form draft state
  const [draftName, setDraftName] = useState("");
  const [draftPresence, setDraftPresence] = useState<"hadir" | "berhalangan">("hadir");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftDate, setDraftDate] = useState("Baru saja");

  const wishes = normalizeWishes(value);
  const wishesRef = useRef(wishes);
  const atLimit = wishes.length >= MAX_WISH_ITEMS;

  useEffect(() => {
    wishesRef.current = normalizeWishes(value);
  }, [value]);

  const commit = (next: WishItem[]) => {
    wishesRef.current = next;
    onChange(next);
  };

  const handleStartAdd = () => {
    if (disabled || atLimit) return;
    setDraftName("");
    setDraftPresence("hadir");
    setDraftMessage("");
    setDraftDate("Baru saja");
    setEditingIndex(null);
    setIsAdding(true);
  };

  const handleApplyPreset = (preset: (typeof WISH_PRESETS)[number]) => {
    if (disabled || atLimit) return;
    const nextItem: WishItem = {
      name: preset.name,
      message: preset.message,
      presence: preset.presence,
      date: preset.date,
    };
    commit([...wishes, nextItem]);
  };

  const handleStartEdit = (index: number) => {
    if (disabled) return;
    const item = wishes[index];
    if (!item) return;
    setDraftName(item.name);
    setDraftPresence(item.presence === "berhalangan" ? "berhalangan" : "hadir");
    setDraftMessage(item.message);
    setDraftDate(item.date ?? "Baru saja");
    setIsAdding(false);
    setEditingIndex(index);
  };

  const handleSaveForm = () => {
    const trimmedName = draftName.trim() || "Tamu Undangan";
    const trimmedMsg = draftMessage.trim() || "Selamat berbahagia!";
    const updated: WishItem = {
      name: trimmedName,
      presence: draftPresence,
      message: trimmedMsg,
      date: draftDate.trim() || "Baru saja",
    };

    if (isAdding) {
      commit([...wishes, updated]);
    } else if (editingIndex !== null && editingIndex >= 0 && editingIndex < wishes.length) {
      const copy = [...wishes];
      copy[editingIndex] = updated;
      commit(copy);
    }
    handleCancel();
  };

  const handleDelete = (index: number) => {
    if (disabled) return;
    const filtered = wishes.filter((_, i) => i !== index);
    commit(filtered);
    if (editingIndex === index) {
      handleCancel();
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingIndex(null);
  };

  return (
    <div className={styles.timelineControlSection}>
      {/* Preset Chips */}
      <div className={styles.timelinePresetBar}>
        <span className={styles.timelinePresetLabel}>Preset Sampel Doa:</span>
        <div className={styles.timelinePresetChips}>
          {WISH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={styles.timelinePresetChip}
              disabled={disabled || atLimit}
              onClick={() => handleApplyPreset(preset)}
              title={preset.name}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Wishes List */}
      <div className={styles.timelineList}>
        {wishes.length === 0 ? (
          <div className={styles.timelineEmpty}>
            <IconWishes size={22} className={styles.timelineEmptyIcon} />
            <p className={styles.timelineEmptyText}>Belum ada ucapan doa sampel.</p>
            <p className={styles.timelineEmptyHint}>Klik tombol di bawah atau pilih preset doa di atas.</p>
          </div>
        ) : (
          wishes.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className={`${styles.timelineItemRow} ${editingIndex === idx ? styles.activeRow : ""}`}
            >
              <div className={styles.timelineItemBadge}>
                <span className={styles.timelineItemTime} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {item.presence === "hadir" ? (
                    <>
                      <IconCheck size={11} /> Hadir
                    </>
                  ) : (
                    <>
                      <IconClose size={11} /> Berhalangan
                    </>
                  )}
                </span>
              </div>
              <div className={styles.timelineItemInfo} onClick={() => handleStartEdit(idx)}>
                <span className={styles.timelineItemTitle}>{item.name}</span>
                <span className={styles.timelineItemLoc}>{item.message}</span>
              </div>
              <div className={styles.timelineItemActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => handleStartEdit(idx)}
                  disabled={disabled}
                  title="Ubah Ucapan"
                >
                  <IconPencil size={13} />
                </button>
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.dangerIconButton}`}
                  onClick={() => handleDelete(idx)}
                  disabled={disabled}
                  title="Hapus Ucapan"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      {!isAdding && editingIndex === null && (
        <button
          type="button"
          className={styles.timelineAddButton}
          onClick={handleStartAdd}
          disabled={disabled || atLimit}
        >
          <IconPlus size={14} />
          <span>Tambah Sampel Ucapan {atLimit ? `(Maks. ${MAX_WISH_ITEMS})` : ""}</span>
        </button>
      )}

      {/* Inline Form for Adding / Editing */}
      {(isAdding || editingIndex !== null) && (
        <div className={styles.timelineFormCard}>
          <div className={styles.timelineFormHeader}>
            <strong>{isAdding ? "Tambah Sampel Ucapan" : "Ubah Ucapan"}</strong>
            <button type="button" className={styles.closeDrawerBtn} onClick={handleCancel}>
              <IconClose size={13} />
            </button>
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Nama Pengirim</label>
            <input
              type="text"
              className={styles.input}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Contoh: Dimas & Sarah"
            />
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Status Kehadiran</label>
            <div className={styles.wishesPresenceSelector}>
              <button
                type="button"
                className={`${styles.presencePill} ${draftPresence === "hadir" ? styles.presenceActive : ""}`}
                onClick={() => setDraftPresence("hadir")}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <IconCheck size={12} />
                <span>Hadir</span>
              </button>
              <button
                type="button"
                className={`${styles.presencePill} ${draftPresence === "berhalangan" ? styles.presenceActive : ""}`}
                onClick={() => setDraftPresence("berhalangan")}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <IconClose size={12} />
                <span>Berhalangan</span>
              </button>
            </div>
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Pesan Ucapan & Doa</label>
            <textarea
              className={styles.input}
              rows={3}
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder="Contoh: Selamat berbahagia! Semoga sakinah mawaddah warahmah..."
            />
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Keterangan Waktu</label>
            <input
              type="text"
              className={styles.input}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              placeholder="Contoh: Baru saja / 2 jam lalu"
            />
          </div>

          <div className={styles.timelineFormActions}>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>
              Batal
            </button>
            <button
              type="button"
              className={styles.primaryActionButton}
              onClick={handleSaveForm}
              disabled={!draftName.trim() || !draftMessage.trim()}
            >
              Simpan Ucapan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
