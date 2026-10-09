"use client";

import { useMemo, useState, useEffect } from "react";
import type { CanonicalDocument, VariableDefinition, VariableType } from "@/lib/schema";
import { variableKeySchema } from "@/lib/schema";
import {
  GUEST_PREVIEW_CHANGED_EVENT,
  getGuestPreviewName,
  setGuestPreviewName,
} from "../core/display";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSparkle,
  IconTrash,
  IconVariable,
} from "./icons";
import styles from "./VariablesCatalog.module.css";

export interface VariablePreset {
  key: string;
  label: string;
  category: "mempelai" | "acara" | "hadiah" | "tamu" | "kustom";
  type: VariableType;
  default: string;
  description: string;
}

export const WEDDING_PRESETS: readonly VariablePreset[] = [
  // Mempelai Pria
  {
    key: "couple.groom.fullName",
    label: "Nama Lengkap Mempelai Pria",
    category: "mempelai",
    type: "text",
    default: "Danang Aji Pratama, S.Kom.",
    description: "Nama lengkap beserta gelar mempelai pria",
  },
  {
    key: "couple.groom.nickname",
    label: "Nama Panggilan Pria",
    category: "mempelai",
    type: "text",
    default: "Danang",
    description: "Nama panggilan untuk teks singkat atau cover",
  },
  {
    key: "couple.groom.parents",
    label: "Nama Orang Tua Mempelai Pria",
    category: "mempelai",
    type: "text",
    default: "Putra pertama dari Bpk. Bambang & Ibu Siti Aminah",
    description: "Informasi keluarga dan orang tua mempelai pria",
  },
  {
    key: "couple.groom.photo",
    label: "Foto Mempelai Pria",
    category: "mempelai",
    type: "image",
    default: "",
    description: "Foto profil mempelai pria",
  },
  // Mempelai Wanita
  {
    key: "couple.bride.fullName",
    label: "Nama Lengkap Mempelai Wanita",
    category: "mempelai",
    type: "text",
    default: "Sekar Ayu Kirana, S.Pd.",
    description: "Nama lengkap beserta gelar mempelai wanita",
  },
  {
    key: "couple.bride.nickname",
    label: "Nama Panggilan Wanita",
    category: "mempelai",
    type: "text",
    default: "Sekar",
    description: "Nama panggilan untuk teks singkat atau cover",
  },
  {
    key: "couple.bride.parents",
    label: "Nama Orang Tua Mempelai Wanita",
    category: "mempelai",
    type: "text",
    default: "Putri kedua dari Bpk. Haryono & Ibu Endang Wahyuni",
    description: "Informasi keluarga dan orang tua mempelai wanita",
  },
  {
    key: "couple.bride.photo",
    label: "Foto Mempelai Wanita",
    category: "mempelai",
    type: "image",
    default: "",
    description: "Foto profil mempelai wanita",
  },
  // Rangkaian Acara
  {
    key: "event.ceremony.startAt",
    label: "Jadwal Akad Nikah / Pemberkatan",
    category: "acara",
    type: "text",
    default: "Minggu, 14 Maret 2027 • 08:00 - 10:00 WIB",
    description: "Hari, tanggal, dan jam pelaksanaan akad",
  },
  {
    key: "event.ceremony.location",
    label: "Lokasi & Gedung Akad Nikah",
    category: "acara",
    type: "text",
    default: "Masjid Agung Al-Ikhlas, Jakarta Selatan",
    description: "Tempat atau gedung pelaksanaan akad nikah",
  },
  {
    key: "event.reception.startAt",
    label: "Jadwal Resepsi Pernikahan",
    category: "acara",
    type: "text",
    default: "Minggu, 14 Maret 2027 • 11:00 - 14:00 WIB",
    description: "Hari, tanggal, dan jam acara resepsi",
  },
  {
    key: "event.reception.location",
    label: "Lokasi & Gedung Resepsi",
    category: "acara",
    type: "text",
    default: "Ballroom Royal Santika Hotel, Jakarta",
    description: "Tempat atau gedung pelaksanaan resepsi",
  },
  {
    key: "event.map.url",
    label: "Tautan Google Maps Lokasi",
    category: "acara",
    type: "url",
    default: "https://maps.google.com",
    description: "Link peta Google Maps untuk tombol penunjuk arah",
  },
  // Amplop & Hadiah
  {
    key: "gift.bank_name",
    label: "Nama Bank / E-Wallet Amplop",
    category: "hadiah",
    type: "text",
    default: "Bank BCA",
    description: "Bank atau penyedia dompet digital amplop",
  },
  {
    key: "gift.account_number",
    label: "Nomor Rekening Amplop",
    category: "hadiah",
    type: "text",
    default: "1234567890",
    description: "Nomor rekening tujuan transfer hadiah",
  },
  {
    key: "gift.account_holder",
    label: "Nama Pemilik Rekening",
    category: "hadiah",
    type: "text",
    default: "Danang Aji Pratama",
    description: "Nama pemilik rekening bank",
  },
  // Informasi Tamu & Doa
  {
    key: "greeting.opening",
    label: "Kalimat Pembuka / Salam",
    category: "kustom",
    type: "text",
    default: "Assalamu'alaikum Warahmatullahi Wabarakatuh",
    description: "Salam pembuka undangan pernikahan",
  },
  {
    key: "quote.wedding",
    label: "Kutipan / Ayat Pernikahan",
    category: "kustom",
    type: "text",
    default:
      "Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri...",
    description: "Ayat suci atau kutipan mutiara pernikahan",
  },
];

export function getVariableCategory(
  key: string,
  label: string,
): "mempelai" | "acara" | "hadiah" | "tamu" | "kustom" {
  const lowerKey = key.toLowerCase();
  const lowerLabel = label.toLowerCase();
  if (
    lowerKey.startsWith("couple.") ||
    lowerKey.includes("groom") ||
    lowerKey.includes("bride") ||
    lowerLabel.includes("mempelai") ||
    lowerLabel.includes("pria") ||
    lowerLabel.includes("wanita") ||
    lowerLabel.includes("pengantin")
  ) {
    return "mempelai";
  }
  if (
    lowerKey.startsWith("event.") ||
    lowerKey.includes("akad") ||
    lowerKey.includes("resepsi") ||
    lowerKey.includes("ceremony") ||
    lowerKey.includes("reception") ||
    lowerLabel.includes("acara") ||
    lowerLabel.includes("akad") ||
    lowerLabel.includes("resepsi") ||
    lowerLabel.includes("tanggal") ||
    lowerLabel.includes("lokasi") ||
    lowerLabel.includes("alamat") ||
    lowerLabel.includes("waktu") ||
    lowerLabel.includes("maps")
  ) {
    return "acara";
  }
  if (
    lowerKey.startsWith("gift.") ||
    lowerKey.includes("bank") ||
    lowerKey.includes("rekening") ||
    lowerKey.includes("wallet") ||
    lowerLabel.includes("hadiah") ||
    lowerLabel.includes("amplop") ||
    lowerLabel.includes("rekening") ||
    lowerLabel.includes("bank")
  ) {
    return "hadiah";
  }
  if (
    lowerKey.startsWith("guest.") ||
    lowerKey.includes("tamu") ||
    lowerLabel.includes("tamu") ||
    lowerLabel.includes("undangan untuk")
  ) {
    return "tamu";
  }
  return "kustom";
}

export function generateKeyFromLabel(label: string, takenKeys: ReadonlySet<string>): string {
  const words = label
    .trim()
    .replace(/[^\w\s]/g, "")
    .split(/[\s_-]+/)
    .filter(Boolean);

  let camel = "";
  if (words.length === 0) {
    camel = "teks";
  } else {
    camel = words
      .map((w, i) => {
        const lower = w.toLowerCase();
        if (i === 0) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join("");
  }

  // Ensure first char is lowercase letter
  if (!/^[a-z]/.test(camel)) {
    camel = `item${camel}`;
  }

  const baseKey = `custom.${camel}`;
  if (!takenKeys.has(baseKey)) return baseKey;
  for (let i = 2; ; i++) {
    const candidate = `${baseKey}${i}`;
    if (!takenKeys.has(candidate)) return candidate;
  }
}

export function getVariableUsages(
  doc: CanonicalDocument,
  key: string,
): {
  count: number;
  elements: Array<{ id: string; name: string; sectionName: string }>;
} {
  const elements: Array<{ id: string; name: string; sectionName: string }> = [];
  for (const section of doc.sections) {
    const sectionName =
      section.name || (section.isOpening ? "Cover Opening" : `Section ${section.id.slice(0, 4)}`);
    for (const el of section.elements) {
      let isUsed = false;
      if (el.type === "text" && el.content && Array.isArray(el.content.segments)) {
        if (el.content.segments.some((seg) => "bind" in seg && seg.bind === key)) {
          isUsed = true;
        }
      } else if (
        el.type === "image" &&
        el.source &&
        typeof el.source === "object" &&
        "bind" in el.source &&
        el.source.bind === key
      ) {
        isUsed = true;
      } else if (el.type === "widget" && el.props) {
        const propsStr = JSON.stringify(el.props);
        if (propsStr.includes(`"bind":"${key}"`) || propsStr.includes(`"bind": "${key}"`)) {
          isUsed = true;
        }
      }
      if (isUsed) {
        elements.push({
          id: el.id,
          name: el.name || (el.type === "text" ? "Teks" : el.type),
          sectionName,
        });
      }
    }
  }
  return { count: elements.length, elements };
}

interface VariablesCatalogPanelProps {
  onSwitchToProperties?: () => void;
}

export function VariablesCatalogPanel({ onSwitchToProperties }: VariablesCatalogPanelProps) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const selectedIds = useEditor((s) => s.selectedIds);
  const readOnly = useEditor((s) => s.readOnly);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<VariableDefinition | null>(null);

  // New Custom Variable Form State
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<VariableType>("text");
  const [customDefault, setCustomDefault] = useState("");
  const [customRequired, setCustomRequired] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Edit Variable Form State
  const [editLabel, setEditLabel] = useState("");
  const [editDefault, setEditDefault] = useState("");
  const [editRequired, setEditRequired] = useState(false);

  // Guest Name Canvas Preview Simulation State
  const [guestPreviewInput, setGuestPreviewInput] = useState(() => getGuestPreviewName());

  useEffect(() => {
    const onGuestPreviewChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setGuestPreviewInput(typeof detail === "string" ? detail : getGuestPreviewName());
    };
    window.addEventListener(GUEST_PREVIEW_CHANGED_EVENT, onGuestPreviewChange);
    return () => {
      window.removeEventListener(GUEST_PREVIEW_CHANGED_EVENT, onGuestPreviewChange);
    };
  }, []);

  const handleSetGuestPreview = (val: string) => {
    setGuestPreviewInput(val);
    setGuestPreviewName(val);
  };

  const act = () => store.getState();
  const declaredKeys = useMemo(() => new Set(doc.variables.map((v) => v.key)), [doc.variables]);

  // Usages map for all variables in document
  const usagesMap = useMemo(() => {
    const map = new Map<
      string,
      { count: number; elements: Array<{ id: string; name: string; sectionName: string }> }
    >();
    for (const v of doc.variables) {
      map.set(v.key, getVariableUsages(doc, v.key));
    }
    // runtime guest.name
    map.set("guest.name", getVariableUsages(doc, "guest.name"));
    return map;
  }, [doc]);

  // Selected element (if text, can be bound quickly)
  const singleSelectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    for (const sec of doc.sections) {
      const found = sec.elements.find((e) => e.id === selectedIds[0]);
      if (found) return found;
    }
    return null;
  }, [selectedIds, doc.sections]);

  // Filtered variables
  const filteredVariables = useMemo(() => {
    return doc.variables.filter((v) => {
      const matchesSearch =
        search === "" ||
        v.label.toLowerCase().includes(search.toLowerCase()) ||
        v.key.toLowerCase().includes(search.toLowerCase()) ||
        ("default" in v &&
          typeof v.default === "string" &&
          v.default.toLowerCase().includes(search.toLowerCase()));

      const category = getVariableCategory(v.key, v.label);
      const matchesCategory = activeCategory === "all" || category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [doc.variables, search, activeCategory]);

  // Group variables by category
  const categories = [
    { id: "all", label: "Semua", icon: "✨" },
    { id: "mempelai", label: "Mempelai", icon: "🤵👰" },
    { id: "acara", label: "Acara & Lokasi", icon: "📅📍" },
    { id: "hadiah", label: "Amplop & Hadiah", icon: "💳🎁" },
    { id: "tamu", label: "Informasi Tamu", icon: "✉️👤" },
    { id: "kustom", label: "Teks Tambahan", icon: "📝" },
  ];

  // Grouped items
  const groupedVariables = useMemo(() => {
    const groups: {
      mempelai: VariableDefinition[];
      acara: VariableDefinition[];
      hadiah: VariableDefinition[];
      tamu: VariableDefinition[];
      kustom: VariableDefinition[];
    } = {
      mempelai: [],
      acara: [],
      hadiah: [],
      tamu: [],
      kustom: [],
    };
    for (const v of filteredVariables) {
      const cat = getVariableCategory(v.key, v.label);
      groups[cat].push(v);
    }
    return groups;
  }, [filteredVariables]);

  // Handle adding preset
  const handleAddPreset = (preset: VariablePreset) => {
    if (declaredKeys.has(preset.key)) return;
    if (preset.type === "image") {
      act().addVariable({
        key: preset.key,
        label: preset.label,
        type: "image",
        required: false,
      });
    } else {
      act().addVariable({
        key: preset.key,
        label: preset.label,
        type: "text",
        default: preset.default || undefined,
        required: false,
      });
    }
  };

  // Handle creating custom variable
  const handleCreateCustom = () => {
    const label = customLabel.trim();
    if (!label) {
      setCustomError("Nama label wajib diisi.");
      return;
    }
    const key = generateKeyFromLabel(label, declaredKeys);
    if (!variableKeySchema.safeParse(key).success) {
      setCustomError("Format kunci tidak valid.");
      return;
    }
    if (customType === "image") {
      act().addVariable({
        key,
        label,
        type: "image",
        required: customRequired,
      });
    } else {
      act().addVariable({
        key,
        label,
        type: "text",
        default: customDefault,
        required: customRequired,
      });
    }
    setCustomLabel("");
    setCustomDefault("");
    setCustomRequired(false);
    setCustomError(null);
    setShowCustomModal(false);
  };

  // Open edit modal
  const handleOpenEdit = (v: VariableDefinition) => {
    setEditingVariable(v);
    setEditLabel(v.label);
    setEditDefault(
      "default" in v && typeof v.default === "string" ? v.default : "",
    );
    setEditRequired(Boolean(v.required));
  };

  // Save edit variable
  const handleSaveEdit = () => {
    if (!editingVariable) return;
    if (editingVariable.type === "image") {
      act().updateVariable(editingVariable.key, {
        label: editLabel.trim() || editingVariable.label,
        required: editRequired,
      });
    } else {
      act().updateVariable(editingVariable.key, {
        label: editLabel.trim() || editingVariable.label,
        default: editDefault,
        required: editRequired,
      });
    }
    setEditingVariable(null);
  };

  // Delete variable
  const handleDeleteVariable = (key: string, label: string) => {
    const usages = usagesMap.get(key);
    if (usages && usages.count > 0) {
      const confirmed = window.confirm(
        `Variabel "${label}" sedang dipakai pada ${usages.count} elemen di kanvas. Jika dihapus, teks/elemen tersebut akan kembali menjadi data statis biasa. Yakin ingin menghapus?`,
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(`Hapus variabel "${label}" dari template?`);
      if (!confirmed) return;
    }
    act().removeVariable(key);
  };

  // Connect variable to currently selected text element
  const handleConnectToSelected = (v: VariableDefinition) => {
    if (!singleSelectedElement || singleSelectedElement.type !== "text") return;
    const fallback =
      "default" in v && typeof v.default === "string" ? v.default : v.label;
    // Replace whole text or append segment
    act().patchElement(singleSelectedElement.id, (el) => {
      if (el.type !== "text") return el;
      return {
        ...el,
        content: {
          ...el.content,
          segments: [{ bind: v.key, fallback }],
        },
      };
    });
    if (onSwitchToProperties) {
      onSwitchToProperties();
    }
  };

  // Connect guest.name to currently selected text element
  const handleConnectGuestToSelected = () => {
    if (!singleSelectedElement || singleSelectedElement.type !== "text") return;
    act().patchElement(singleSelectedElement.id, (el) => {
      if (el.type !== "text") return el;
      return {
        ...el,
        content: {
          ...el.content,
          segments: [{ bind: "guest.name", fallback: "Bapak/Ibu/Saudara(i)" }],
        },
      };
    });
    if (onSwitchToProperties) {
      onSwitchToProperties();
    }
  };

  // Insert a new guest text element to canvas if not yet added
  const handleInsertGuestElement = () => {
    const targetSectionId =
      doc.sections.find((s) => s.isOpening)?.id ??
      store.getState().activeSectionId ??
      doc.sections[0]?.id;
    if (!targetSectionId) return;

    store.getState().setActiveSection(targetSectionId);
    store.getState().addElement("text");
    const newId = store.getState().selectedIds[0];
    if (newId) {
      store.getState().patchElement(newId, (el) => {
        if (el.type !== "text") return el;
        return {
          ...el,
          name: "Nama Tamu Undangan",
          frame: {
            ...el.frame,
            w: 320,
            h: 46,
            x: 20,
          },
          style: {
            ...el.style,
            fontSize: 16,
            textAlign: "center",
            fontWeight: 600,
          },
          content: {
            ...el.content,
            segments: [
              {
                bind: "guest.name",
                fallback: "Bapak/Ibu/Saudara(i)",
              },
            ],
          },
        };
      });
    }
  };

  const showGuestCard = useMemo(() => {
    const isCategoryMatch = activeCategory === "all" || activeCategory === "tamu";
    if (!isCategoryMatch) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      "guest.name".includes(s) ||
      "tamu".includes(s) ||
      "nama".includes(s) ||
      "penerima".includes(s) ||
      "undangan".includes(s)
    );
  }, [activeCategory, search]);

  const guestUsages = useMemo(
    () => usagesMap.get("guest.name") ?? { count: 0, elements: [] },
    [usagesMap],
  );
  const isGuestUsed = guestUsages.count > 0;

  const totalUsedCount = useMemo(() => {
    let count = 0;
    for (const v of doc.variables) {
      if ((usagesMap.get(v.key)?.count ?? 0) > 0) count++;
    }
    return count;
  }, [doc.variables, usagesMap]);

  return (
    <div className={styles.container}>
      {/* Header Info */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Katalog Variabel Undangan</h3>
          <span className={styles.countBadge}>
            <IconVariable size={11} />
            {doc.variables.length} Terdaftar
          </span>
        </div>
        <p className={styles.subtitle}>
          Variabel adalah data dinamis (nama mempelai, waktu, tempat, dll) yang nantinya dapat diisi
          langsung oleh pengantin di formulir pesanan mereka.
        </p>
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.btnPrimary}
            data-testid="open-preset-modal-btn"
            onClick={() => setShowPresetModal(true)}
          >
            <IconSparkle size={13} />
            <span>Preset Siap Pakai</span>
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            data-testid="open-custom-modal-btn"
            onClick={() => {
              setCustomLabel("");
              setCustomDefault("");
              setCustomError(null);
              setShowCustomModal(true);
            }}
          >
            <IconPlus size={13} />
            <span>+ Buat Kustom</span>
          </button>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>
          <IconSearch size={14} />
        </span>
        <input
          type="text"
          className={styles.searchInput}
          data-testid="search-variables-input"
          placeholder="Cari variabel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filterChips}>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.filterChip}
            data-active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
          >
            <span>{c.icon}</span> <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Status Overview */}
      <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
        <span>
          Menampilkan {filteredVariables.length + (showGuestCard ? 1 : 0)} dari {doc.variables.length + 1} variabel
        </span>
        <span>
          🟢 {totalUsedCount + (isGuestUsed ? 1 : 0)} terpasang di kanvas
        </span>
      </div>

      {/* Grouped Variables List */}
      {filteredVariables.length === 0 && !showGuestCard ? (
        <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center space-y-2 bg-stone-50/50">
          <span className="text-2xl">📋</span>
          <p className="text-xs font-bold text-stone-700">Tidak ada variabel ditemukan</p>
          <p className="text-[11px] text-stone-500">
            {search
              ? "Coba gunakan kata kunci pencarian lain."
              : "Belum ada variabel dalam kategori ini. Tambahkan dari preset siap pakai atau buat kustom."}
          </p>
          {!readOnly && (
            <button
              type="button"
              className={`${styles.btnPrimary} mt-2`}
              onClick={() => setShowPresetModal(true)}
            >
              <IconSparkle size={13} /> Tambah dari Preset
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedVariables).map(([catKey, list]) => {
            const isGuestCategory = catKey === "tamu";
            if (list.length === 0 && (!isGuestCategory || !showGuestCard)) return null;
            const catMeta = categories.find((c) => c.id === catKey);

            return (
              <div key={catKey} className={styles.categorySection}>
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryTitleGroup}>
                    <span>{catMeta?.icon}</span>
                    <span>{catMeta?.label}</span>
                  </span>
                  <span className={styles.categoryCount}>
                    {list.length + (isGuestCategory && showGuestCard ? 1 : 0)} Variabel
                  </span>
                </div>

                <div className={styles.variableList}>
                  {/* Kartu Khusus guest.name jika ini kategori tamu */}
                  {isGuestCategory && showGuestCard && (
                    <div className={styles.guestCard} data-testid="guest-name-variable-card">
                      <div className={styles.cardTop}>
                        <div className={styles.cardInfo}>
                          <span className={styles.label}>Nama Penerima Tamu Undangan</span>
                          <div className={styles.typeBadgeGroup}>
                            <span className={styles.guestRuntimeBadge}>
                              ✉️ Runtime Portal (Otomatis dari URL & Portal)
                            </span>
                            <span className={styles.keyChip}>guest.name</span>
                          </div>
                        </div>

                        <span
                          className={styles.usageBadge}
                          data-used={isGuestUsed ? "true" : "false"}
                          title={
                            isGuestUsed
                              ? guestUsages.elements
                                  .map((el) => `${el.name} (${el.sectionName})`)
                                  .join(", ")
                              : "Belum dihubungkan ke teks di kanvas"
                          }
                        >
                          <span>{isGuestUsed ? "●" : "○"}</span>
                          <span>{isGuestUsed ? `Dipakai (${guestUsages.count})` : "Belum dipakai"}</span>
                        </span>
                      </div>

                      {/* Edukasi URL & Portal Klien */}
                      <div className={styles.guestEducation}>
                        <div className={styles.guestEduTitle}>
                          <span>💡</span>
                          <span>Integrasi Otomatis dengan Portal Klien</span>
                        </div>
                        <div className={styles.guestEduDesc}>
                          Diisi otomatis oleh sistem saat calon pengantin membagikan tautan personal dari Portal Klien (parameter <code>?to=Nama+Tamu</code>). Jika dibuka tanpa tautan khusus, teks akan menampilkan sapaan umum cadangan.
                        </div>
                      </div>

                      {/* Fitur Simulasi Pratinjau Kanvas */}
                      <div className={styles.guestSimSection}>
                        <div className={styles.guestSimHeader}>
                          <label htmlFor="guest-sim-input" className={styles.guestSimLabel}>
                            <span>👁️</span>
                            <span>Simulasi Nama Tamu untuk Pratinjau Kanvas</span>
                          </label>
                          {guestPreviewInput && (
                            <button
                              type="button"
                              className={styles.btnResetSim}
                              data-testid="reset-guest-sim-btn"
                              onClick={() => handleSetGuestPreview("")}
                              title="Kembalikan ke fallback default"
                            >
                              Reset ke Default
                            </button>
                          )}
                        </div>

                        <div className={styles.guestSimInputWrap}>
                          <input
                            id="guest-sim-input"
                            type="text"
                            className={styles.guestSimInput}
                            data-testid="guest-preview-sim-input"
                            placeholder="Contoh: Budi Santoso (ketik untuk tes tampilan langsung)"
                            value={guestPreviewInput}
                            onChange={(e) => handleSetGuestPreview(e.target.value)}
                          />
                        </div>

                        <div className={styles.guestQuickChipsWrap}>
                          <span className={styles.guestQuickChipsTitle}>Contoh Cepat untuk Tes:</span>
                          <div className={styles.guestQuickChipsList}>
                            {[
                              "Budi Santoso",
                              "Dr. H. Ahmad Dahlan, S.T.",
                              "Keluarga Besar Bpk. Hendra",
                              "Mr. John Doe & Partner",
                            ].map((name) => (
                              <button
                                key={name}
                                type="button"
                                className={styles.guestQuickChip}
                                data-testid={`quick-chip-${name}`}
                                onClick={() => handleSetGuestPreview(name)}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className={styles.guestActions}>
                        {singleSelectedElement &&
                        singleSelectedElement.type === "text" &&
                        !readOnly ? (
                          <button
                            type="button"
                            className={styles.btnConnect}
                            data-testid="connect-guest-selected-btn"
                            onClick={handleConnectGuestToSelected}
                            title="Terapkan variabel guest.name pada teks yang sedang Anda pilih"
                          >
                            <IconSparkle size={12} />
                            <span>⚡ Sambungkan ke Teks Terpilih</span>
                          </button>
                        ) : !isGuestUsed && !readOnly ? (
                          <button
                            type="button"
                            className={styles.btnInsertGuest}
                            data-testid="insert-guest-element-btn"
                            onClick={handleInsertGuestElement}
                            title="Sisipkan teks penerima tamu baru ke cover atau section aktif"
                          >
                            <IconPlus size={12} />
                            <span>+ Sisipkan Teks Tamu Baru</span>
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </div>
                  )}
                  {list.map((v) => {
                    const usages = usagesMap.get(v.key) ?? { count: 0, elements: [] };
                    const isUsed = usages.count > 0;
                    const defaultValue =
                      "default" in v && typeof v.default === "string"
                        ? v.default
                        : "";

                    return (
                      <div key={v.key} className={styles.variableCard}>
                        <div className={styles.cardTop}>
                          <div className={styles.cardInfo}>
                            <span className={styles.label}>{v.label}</span>
                            <div className={styles.typeBadgeGroup}>
                              <span className={styles.typeBadge}>
                                {v.type === "image" ? "🖼️ Foto" : v.type === "datetime" ? "📅 Tanggal" : v.type === "url" ? "🔗 Tautan" : "📝 Teks"}
                              </span>
                              <span className={styles.keyChip}>{v.key}</span>
                            </div>
                          </div>

                          <span
                            className={styles.usageBadge}
                            data-used={isUsed ? "true" : "false"}
                            title={
                              isUsed
                                ? usages.elements
                                    .map((el) => `${el.name} (${el.sectionName})`)
                                    .join(", ")
                                : "Belum dihubungkan ke elemen"
                            }
                          >
                            <span>{isUsed ? "●" : "○"}</span>
                            <span>{isUsed ? `Dipakai (${usages.count})` : "Belum dipakai"}</span>
                          </span>
                        </div>

                        {/* Default / Sample Value */}
                        <div className={styles.defaultBox}>
                          <span className={styles.defaultLabel}>Contoh Teks / Nilai:</span>
                          {defaultValue ? (
                            <span className={styles.defaultValue}>{defaultValue}</span>
                          ) : (
                            <span className={styles.defaultEmpty}>
                              {v.type === "image" ? "(Belum ada foto contoh)" : "(Belum diisi)"}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className={styles.cardActions}>
                          {/* Connect to selected element shortcut */}
                          {singleSelectedElement && singleSelectedElement.type === "text" && v.type === "text" && !readOnly ? (
                            <button
                              type="button"
                              className={styles.btnConnect}
                              onClick={() => handleConnectToSelected(v)}
                              title="Terapkan variabel ini pada teks yang sedang Anda pilih"
                            >
                              <IconSparkle size={12} />
                              <span>Pakai di Teks Aktif</span>
                            </button>
                          ) : <div />}

                          <div className="flex items-center gap-1.5">
                            {!readOnly && (
                              <>
                                <button
                                  type="button"
                                  className={styles.btnIcon}
                                  onClick={() => handleOpenEdit(v)}
                                  title="Edit label & nilai contoh"
                                >
                                  <IconPencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btnIcon} ${styles.btnDanger}`}
                                  onClick={() => handleDeleteVariable(v.key, v.label)}
                                  title="Hapus variabel ini"
                                >
                                  <IconTrash size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preset Modal */}
      {showPresetModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <IconSparkle size={15} />
                </span>
                <h4 className={styles.modalTitle}>Preset Variabel Siap Pakai</h4>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowPresetModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.formHint}>
                Klik tombol <strong>+ Tambah</strong> pada preset yang Anda butuhkan. Variabel akan otomatis terdaftar dan siap dihubungkan ke kanvas:
              </p>

              <div className={styles.presetGrid}>
                {WEDDING_PRESETS.map((p) => {
                  const alreadyAdded = declaredKeys.has(p.key);
                  return (
                    <div key={p.key} className={styles.presetCard}>
                      <div className={styles.presetInfo}>
                        <span className={styles.presetLabel}>{p.label}</span>
                        <span className={styles.presetDesc}>{p.description}</span>
                        <span className="text-[10px] text-stone-400 font-mono mt-0.5">{p.key}</span>
                      </div>

                      {alreadyAdded ? (
                        <span className={styles.presetAddedBadge}>
                          <IconCheck size={12} />
                          <span>Sudah Ada</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.presetAddBtn}
                          data-testid={`add-preset-${p.key}`}
                          onClick={() => handleAddPreset(p)}
                        >
                          <IconPlus size={12} />
                          <span>+ Tambah</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setShowPresetModal(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Variable Modal */}
      {showCustomModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#84633f]/10 text-[#84633f]">
                  <IconPlus size={15} />
                </span>
                <h4 className={styles.modalTitle}>Buat Variabel Kustom Baru</h4>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowCustomModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.formHint}>
                Buat variabel baru dengan nama yang mudah dipahami. Kunci teknis dot-path akan otomatis dibuatkan oleh sistem.
              </p>

              {customError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 font-semibold">
                  {customError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nama Kolom / Label Variabel</label>
                <input
                  type="text"
                  className={styles.formInput}
                  data-testid="custom-var-label-input"
                  placeholder="Contoh: Nomor Meja Tamu, Dresscode, Catatan Khusus"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  autoFocus
                />
                {customLabel && (
                  <span className="text-[11px] text-stone-500 font-mono mt-1">
                    Kunci Teknis Otomatis:{" "}
                    <strong>{generateKeyFromLabel(customLabel, declaredKeys)}</strong>
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tipe Data</label>
                <select
                  className={styles.formInput}
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as VariableType)}
                >
                  <option value="text">📝 Teks Biasa</option>
                  <option value="datetime">📅 Tanggal &amp; Waktu</option>
                  <option value="image">🖼️ Foto / Gambar</option>
                  <option value="url">🔗 Tautan URL / Maps</option>
                  <option value="number">🔢 Angka</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Contoh Teks / Nilai Bawaan</label>
                <textarea
                  className={styles.formTextarea}
                  data-testid="custom-var-default-input"
                  rows={2}
                  placeholder="Ketik contoh isi teks yang akan tampil di undangan..."
                  value={customDefault}
                  onChange={(e) => setCustomDefault(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="custom-req"
                  checked={customRequired}
                  onChange={(e) => setCustomRequired(e.target.checked)}
                  className="rounded text-[#84633f]"
                />
                <label htmlFor="custom-req" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Wajib diisi oleh pengantin di formulir order
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowCustomModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                data-testid="submit-custom-var-btn"
                onClick={handleCreateCustom}
              >
                Simpan &amp; Daftarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variable Modal */}
      {editingVariable && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <IconPencil size={15} />
                </span>
                <h4 className={styles.modalTitle}>Edit Variabel</h4>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditingVariable(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600">
                <span className="text-stone-400">Kunci Teknis:</span>{" "}
                <code className="font-bold text-stone-800">{editingVariable.key}</code>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nama Label</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Contoh Teks / Nilai Bawaan</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={editDefault}
                  onChange={(e) => setEditDefault(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-req"
                  checked={editRequired}
                  onChange={(e) => setEditRequired(e.target.checked)}
                  className="rounded text-[#84633f]"
                />
                <label htmlFor="edit-req" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Wajib diisi oleh pengantin
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setEditingVariable(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSaveEdit}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
