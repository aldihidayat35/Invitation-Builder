"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendar, IconPlus, IconTrash } from "./icons";
import styles from "./editor.module.css";

export interface TimelineEditorEvent {
  readonly time: string;
  readonly title: string;
  readonly description?: string;
  readonly location?: string;
  readonly icon?: "ring" | "heart" | "glass" | "calendar" | "church" | "sparkles";
}

const MAX_TIMELINE_EVENTS = 12;

const EVENT_PRESETS: readonly {
  readonly label: string;
  readonly time: string;
  readonly title: string;
  readonly location: string;
  readonly description: string;
  readonly icon: TimelineEditorEvent["icon"];
}[] = [
  {
    label: "+ Akad Nikah",
    time: "08:00 - 10:00 WIB",
    title: "Akad Nikah",
    location: "Masjid / Kediaman",
    description: "Prosesi ijab kabul dan doa bersama keluarga inti.",
    icon: "ring",
  },
  {
    label: "+ Resepsi",
    time: "11:00 - 13:00 WIB",
    title: "Resepsi Pernikahan",
    location: "Grand Ballroom",
    description: "Ramah tamah, santap siang, dan sesi foto bersama para tamu.",
    icon: "glass",
  },
  {
    label: "+ Pemberkatan",
    time: "09:00 - 11:00 WIB",
    title: "Pemberkatan Kudus",
    location: "Gereja Katedral",
    description: "Upacara sakramen pernikahan dan pemberkatan cinta suci.",
    icon: "church",
  },
  {
    label: "+ Temu Manten",
    time: "10:30 - 11:30 WIB",
    title: "Upacara Panggih / Temu",
    location: "Gedung Serbaguna",
    description: "Prosesi adat sakral pertemuan kedua mempelai.",
    icon: "heart",
  },
  {
    label: "+ After Party",
    time: "19:00 - 22:00 WIB",
    title: "After Party",
    location: "Rooftop Garden",
    description: "Perayaan santai dan makan malam bersama sahabat tercinta.",
    icon: "sparkles",
  },
];

const ICON_OPTIONS: readonly { readonly value: NonNullable<TimelineEditorEvent["icon"]>; readonly label: string }[] = [
  { value: "ring", label: "💍 Cincin (Akad/Janji)" },
  { value: "glass", label: "🥂 Gelas (Resepsi/Pesta)" },
  { value: "heart", label: "❤️ Hati (Cinta/Romantis)" },
  { value: "calendar", label: "📅 Kalender (Jadwal)" },
  { value: "church", label: "⛪ Tempat Ibadah" },
  { value: "sparkles", label: "✨ Kilau (After Party)" },
];

function normalizeEvents(value: unknown): TimelineEditorEvent[] {
  if (!Array.isArray(value)) return [];
  const events: TimelineEditorEvent[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const time = typeof rec.time === "string" ? rec.time.trim() : "";
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    if (!time && !title) continue;
    events.push({
      time: time || "00:00",
      title: title || "Agenda Acara",
      location: typeof rec.location === "string" ? rec.location.trim() : undefined,
      description: typeof rec.description === "string" ? rec.description.trim() : undefined,
      icon: (typeof rec.icon === "string" ? rec.icon : "ring") as TimelineEditorEvent["icon"],
    });
    if (events.length === MAX_TIMELINE_EVENTS) break;
  }
  return events;
}

export function TimelineEventsControl({
  value,
  disabled,
  onChange,
}: {
  readonly elementId?: string;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (events: readonly TimelineEditorEvent[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form draft state
  const [draftTime, setDraftTime] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftIcon, setDraftIcon] = useState<TimelineEditorEvent["icon"]>("ring");

  const events = normalizeEvents(value);
  const eventsRef = useRef(events);
  const atLimit = events.length >= MAX_TIMELINE_EVENTS;

  useEffect(() => {
    eventsRef.current = normalizeEvents(value);
  }, [value]);

  const commit = (next: TimelineEditorEvent[]) => {
    eventsRef.current = next;
    onChange(next);
  };

  const handleStartAdd = () => {
    if (disabled || atLimit) return;
    setDraftTime("08:00 WIB");
    setDraftTitle("");
    setDraftLocation("");
    setDraftDescription("");
    setDraftIcon("ring");
    setEditingIndex(null);
    setIsAdding(true);
  };

  const handleApplyPreset = (preset: (typeof EVENT_PRESETS)[number]) => {
    if (disabled || atLimit) return;
    const nextItem: TimelineEditorEvent = {
      time: preset.time,
      title: preset.title,
      location: preset.location,
      description: preset.description,
      icon: preset.icon,
    };
    commit([...events, nextItem]);
  };

  const handleStartEdit = (index: number) => {
    if (disabled) return;
    const item = events[index];
    if (!item) return;
    setDraftTime(item.time);
    setDraftTitle(item.title);
    setDraftLocation(item.location ?? "");
    setDraftDescription(item.description ?? "");
    setDraftIcon(item.icon ?? "ring");
    setIsAdding(false);
    setEditingIndex(index);
  };

  const handleSaveForm = () => {
    const trimmedTitle = draftTitle.trim() || "Agenda Baru";
    const trimmedTime = draftTime.trim() || "00:00";
    const updated: TimelineEditorEvent = {
      time: trimmedTime,
      title: trimmedTitle,
      location: draftLocation.trim() || undefined,
      description: draftDescription.trim() || undefined,
      icon: draftIcon || "ring",
    };

    if (isAdding) {
      commit([...events, updated]);
    } else if (editingIndex !== null && editingIndex >= 0 && editingIndex < events.length) {
      const copy = [...events];
      copy[editingIndex] = updated;
      commit(copy);
    }
    handleCancel();
  };

  const handleDelete = (index: number) => {
    if (disabled) return;
    const filtered = events.filter((_, i) => i !== index);
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
        <span className={styles.timelinePresetLabel}>Preset Cepat:</span>
        <div className={styles.timelinePresetChips}>
          {EVENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={styles.timelinePresetChip}
              disabled={disabled || atLimit}
              onClick={() => handleApplyPreset(preset)}
              title={preset.title}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className={styles.timelineList}>
        {events.length === 0 ? (
          <div className={styles.timelineEmpty}>
            <IconCalendar size={22} className={styles.timelineEmptyIcon} />
            <p className={styles.timelineEmptyText}>Belum ada agenda acara.</p>
            <p className={styles.timelineEmptyHint}>Klik tombol di bawah atau pilih preset cepat di atas.</p>
          </div>
        ) : (
          events.map((ev, idx) => (
            <div
              key={`${ev.time}-${idx}`}
              className={`${styles.timelineItemRow} ${editingIndex === idx ? styles.activeRow : ""}`}
            >
              <div className={styles.timelineItemBadge}>
                <span className={styles.timelineItemTime}>{ev.time}</span>
              </div>
              <div className={styles.timelineItemInfo} onClick={() => handleStartEdit(idx)}>
                <span className={styles.timelineItemTitle}>{ev.title}</span>
                {ev.location && <span className={styles.timelineItemLoc}>{ev.location}</span>}
              </div>
              <div className={styles.timelineItemActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => handleStartEdit(idx)}
                  disabled={disabled}
                  title="Ubah Agenda"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.dangerIconButton}`}
                  onClick={() => handleDelete(idx)}
                  disabled={disabled}
                  title="Hapus Agenda"
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
          <span>Tambah Agenda Acara {atLimit ? `(Maks. ${MAX_TIMELINE_EVENTS})` : ""}</span>
        </button>
      )}

      {/* Inline Form for Adding / Editing */}
      {(isAdding || editingIndex !== null) && (
        <div className={styles.timelineFormCard}>
          <div className={styles.timelineFormHeader}>
            <strong>{isAdding ? "Tambah Agenda Baru" : "Ubah Agenda"}</strong>
            <button type="button" className={styles.closeDrawerBtn} onClick={handleCancel}>
              ✕
            </button>
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Waktu / Jam</label>
            <input
              type="text"
              className={styles.input}
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              placeholder="Contoh: 08:00 - 10:00 WIB"
            />
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Nama Acara / Judul</label>
            <input
              type="text"
              className={styles.input}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Contoh: Akad Nikah"
            />
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Lokasi (Opsional)</label>
            <input
              type="text"
              className={styles.input}
              value={draftLocation}
              onChange={(e) => setDraftLocation(e.target.value)}
              placeholder="Contoh: Masjid Raya / Grand Ballroom"
            />
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Pilihan Ikon</label>
            <select
              className={styles.input}
              value={draftIcon}
              onChange={(e) => setDraftIcon(e.target.value as TimelineEditorEvent["icon"])}
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.timelineFormField}>
            <label className={styles.fieldLabel}>Deskripsi / Catatan (Opsional)</label>
            <textarea
              className={styles.input}
              rows={2}
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="Contoh: Prosesi ijab kabul & doa bersama"
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
              disabled={!draftTitle.trim()}
            >
              Simpan Agenda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
