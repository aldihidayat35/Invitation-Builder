"use client";

import React, { useState, useMemo } from "react";
import type { VariableType } from "@/lib/schema";
import { MAX_VARIABLES } from "@/lib/schema";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { WEDDING_PRESETS } from "./VariablesCatalogPanel";
import {
  useGlobalCustomPresets,
  sanitizePresetToVariableInput,
  type GlobalCustomPreset,
} from "../core/global-presets";
import { showEditorToast } from "../utils/external-image-handler";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSparkle,
  IconTrash,
} from "./icons";
import styles from "./PresetManagementModal.module.css";

export interface PresetManagementModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

type CategoryFilter = "all" | "system" | "custom" | "mempelai" | "acara" | "hadiah" | "tamu" | "kustom";

function generateKeyFromLabel(label: string, existingKeys: Set<string>): string {
  const sanitized = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const baseKey = `kustom.${sanitized || "variabel"}`;

  if (!existingKeys.has(baseKey)) return baseKey;

  let counter = 2;
  while (existingKeys.has(`${baseKey}_${counter}`)) {
    counter++;
  }
  return `${baseKey}_${counter}`;
}

export function PresetManagementModal({ isOpen, onClose }: PresetManagementModalProps) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const readOnly = useEditor((s) => s.readOnly);

  const { presets: customPresets, savePreset, deletePreset } = useGlobalCustomPresets();

  const declaredKeys = useMemo(
    () => new Set(doc.variables.map((v) => v.key)),
    [doc.variables],
  );

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formCategory, setFormCategory] = useState<string>("kustom");
  const [formType, setFormType] = useState<VariableType>("text");
  const [formDefault, setFormDefault] = useState("");
  const [formMaxLength, setFormMaxLength] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Combine system presets and custom presets into unified list
  interface UnifiedPreset {
    id?: string;
    key: string;
    label: string;
    category: string;
    type: VariableType;
    default: string;
    description: string;
    maxLength?: number;
    isSystem: boolean;
  }

  const allPresets: UnifiedPreset[] = [
    ...WEDDING_PRESETS.map((p) => ({
      key: p.key,
      label: p.label,
      category: p.category,
      type: p.type,
      default: p.default,
      description: p.description,
      maxLength: p.maxLength,
      isSystem: true,
    })),
    ...customPresets.map((p) => ({
      id: p.id,
      key: p.key,
      label: p.label,
      category: p.category,
      type: p.type,
      default: p.default,
      description: p.description,
      maxLength: p.maxLength,
      isSystem: false,
    })),
  ];

  const filteredPresets = allPresets.filter((p) => {
    // Category filter
    if (selectedCategory === "system" && !p.isSystem) return false;
    if (selectedCategory === "custom" && p.isSystem) return false;
    if (
      selectedCategory !== "all" &&
      selectedCategory !== "system" &&
      selectedCategory !== "custom" &&
      p.category !== selectedCategory
    ) {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchLabel = p.label.toLowerCase().includes(q);
      const matchKey = p.key.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      return matchLabel || matchKey || matchDesc;
    }

    return true;
  });

  const handleOpenCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setFormLabel("");
    setFormKey("");
    setFormCategory("kustom");
    setFormType("text");
    setFormDefault("");
    setFormMaxLength("");
    setFormDescription("");
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (preset: UnifiedPreset) => {
    if (preset.isSystem) return;
    setFormMode("edit");
    setEditingId(preset.id || null);
    setFormLabel(preset.label);
    setFormKey(preset.key);
    setFormCategory(preset.category);
    setFormType(preset.type);
    setFormDefault(preset.default);
    setFormMaxLength(preset.maxLength ? String(preset.maxLength) : "");
    setFormDescription(preset.description);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formLabel.trim()) {
      setFormError("Nama label preset wajib diisi");
      return;
    }

    const keyToUse = formMode === "create"
      ? (formKey.trim() || generateKeyFromLabel(formLabel, new Set(allPresets.map(p => p.key))))
      : formKey;

    const parsedMaxLength = formType === "text" && formMaxLength.trim()
      ? parseInt(formMaxLength, 10)
      : undefined;

    if (parsedMaxLength !== undefined && (isNaN(parsedMaxLength) || parsedMaxLength <= 0)) {
      setFormError("Limit karakter harus berupa angka positif");
      return;
    }

    try {
      await savePreset({
        id: editingId || undefined,
        key: keyToUse,
        label: formLabel.trim(),
        category: formCategory,
        type: formType,
        default: formDefault,
        maxLength: parsedMaxLength,
        description: formDescription.trim() || `Variabel ${formLabel.trim()}`,
      });

      setIsFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan preset");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deletePreset(id);
      setDeletingId(null);
    } catch (err) {
      alert("Gagal menghapus preset: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleApplyToTemplate = (preset: UnifiedPreset) => {
    if (readOnly) return;
    if (declaredKeys.has(preset.key)) {
      showEditorToast(`Variabel "${preset.label}" sudah ada di template ini.`, "info");
      return;
    }
    if (doc.variables.length >= MAX_VARIABLES) {
      showEditorToast(`Maksimal ${MAX_VARIABLES} variabel telah tercapai.`, "error");
      return;
    }

    const sanitized = sanitizePresetToVariableInput(preset);
    if (!sanitized) {
      showEditorToast(`Format preset "${preset.label}" tidak valid.`, "error");
      return;
    }

    const prevCount = doc.variables.length;
    store.getState().addVariable(sanitized);
    const nextDoc = selectDoc(store.getState());

    if (nextDoc.variables.length > prevCount) {
      showEditorToast(`Variabel "${preset.label}" berhasil diterapkan ke template!`, "success");
    } else {
      showEditorToast(`Gagal menerapkan variabel "${preset.label}".`, "error");
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      data-testid="preset-management-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalContent} role="dialog" aria-modal="true" data-testid="preset-management-modal">
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <span className={styles.headerIcon}>
              <IconSparkle size={20} />
            </span>
            <div>
              <h3 className={styles.modalTitle}>Manajemen Preset Variabel</h3>
              <p className={styles.modalSubtitle}>
                Kelola preset variabel global sistem. Preset yang dibuat permanen dan dapat digunakan di semua template.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Tutup modal"
            data-testid="preset-modal-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Search & Add Button */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <IconSearch size={14} />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Cari preset nama, kunci, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="preset-search-input"
            />
          </div>

          {!isFormOpen && (
            <button
              type="button"
              className={styles.btnNewPreset}
              onClick={handleOpenCreate}
              data-testid="btn-create-global-preset"
            >
              <IconPlus size={14} />
              <span>+ Buat Preset Baru</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className={styles.categoryPills}>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
          >
            Semua ({allPresets.length})
          </button>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "custom"}
            onClick={() => setSelectedCategory("custom")}
          >
            🌐 Kustom Global ({customPresets.length})
          </button>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "system"}
            onClick={() => setSelectedCategory("system")}
          >
            🛡️ Bawaan Sistem ({WEDDING_PRESETS.length})
          </button>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "mempelai"}
            onClick={() => setSelectedCategory("mempelai")}
          >
            Mempelai
          </button>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "acara"}
            onClick={() => setSelectedCategory("acara")}
          >
            Acara
          </button>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "hadiah"}
            onClick={() => setSelectedCategory("hadiah")}
          >
            Hadiah
          </button>
          <button
            type="button"
            className={styles.categoryPill}
            data-active={selectedCategory === "tamu"}
            onClick={() => setSelectedCategory("tamu")}
          >
            Tamu
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Create / Edit Form Panel */}
          {isFormOpen && (
            <form onSubmit={handleSaveForm} className={styles.formPanel} data-testid="preset-form-panel">
              <div className={styles.formHeader}>
                <h4 className={styles.formTitle}>
                  {formMode === "create" ? "✨ Buat Preset Global Baru" : `✏️ Edit Preset: ${formLabel}`}
                </h4>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setIsFormOpen(false)}
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 font-semibold">
                  {formError}
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nama Label Preset</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    data-testid="preset-form-label"
                    placeholder="Contoh: Nomor Rekening BCA, Catatan Khusus"
                    value={formLabel}
                    onChange={(e) => {
                      setFormLabel(e.target.value);
                      if (formMode === "create" && !formKey) {
                        // dynamically suggest key if untouched
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kategori</label>
                  <select
                    className={styles.formSelect}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="kustom">Kustom</option>
                    <option value="hadiah">Hadiah &amp; Rekening</option>
                    <option value="acara">Acara &amp; Lokasi</option>
                    <option value="mempelai">Mempelai</option>
                    <option value="tamu">Tamu Undangan</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipe Data</label>
                  <select
                    className={styles.formSelect}
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as VariableType)}
                  >
                    <option value="text">📝 Teks Biasa</option>
                    <option value="datetime">📅 Tanggal &amp; Waktu</option>
                    <option value="image">🖼️ Foto / Gambar</option>
                    <option value="url">🔗 Tautan URL / Maps</option>
                    <option value="number">🔢 Angka</option>
                  </select>
                </div>

                {formType === "text" && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Batas Karakter (Limit)
                      <span className="text-[10px] text-stone-400 font-normal"> (Maksimal huruf/angka)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      className={styles.formInput}
                      data-testid="preset-form-maxlength"
                      placeholder="Contoh: 100 (kosong = tanpa batas)"
                      value={formMaxLength}
                      onChange={(e) => setFormMaxLength(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Contoh Teks / Nilai Bawaan</label>
                <input
                  type="text"
                  className={styles.formInput}
                  data-testid="preset-form-default"
                  placeholder="Ketik nilai contoh default yang akan tampil..."
                  value={formDefault}
                  onChange={(e) => setFormDefault(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Deskripsi / Penjelasan Singkat</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Keterangan singkat fungsi variabel ini..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className={styles.formFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setIsFormOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className={styles.btnSubmit}
                  data-testid="preset-form-submit"
                  onClick={handleSaveForm}
                >
                  {formMode === "create" ? "Simpan Preset Global" : "Perbarui Preset"}
                </button>
              </div>
            </form>
          )}

          {/* Preset Cards List */}
          {filteredPresets.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="text-2xl">🔍</span>
              <p className="text-sm font-semibold text-stone-600">Tidak ada preset yang cocok</p>
              <p className="text-xs text-stone-400">Coba kata kunci pencarian lain atau buat preset baru.</p>
            </div>
          ) : (
            <div className={styles.presetList}>
              {filteredPresets.map((preset) => {
                const isAlreadyInTemplate = declaredKeys.has(preset.key);
                const isBeingDeleted = deletingId === preset.id;

                return (
                  <div
                    key={preset.id || preset.key}
                    className={styles.presetCard}
                    data-testid={`preset-item-${preset.key}`}
                  >
                    <div className={styles.presetCardMain}>
                      <div className={styles.presetLabelRow}>
                        <span className={styles.presetLabel}>{preset.label}</span>
                        {preset.isSystem ? (
                          <span className={styles.badgeSystem} title="Preset bawaan sistem dilindungi">
                            🛡️ Bawaan Sistem
                          </span>
                        ) : (
                          <span className={styles.badgeCustom} title="Preset kustom global (bisa diedit/dihapus)">
                            🌐 Global Kustom
                          </span>
                        )}
                        <span className={styles.badgeType}>{preset.type}</span>
                        {preset.maxLength !== undefined && (
                          <span className={styles.badgeLimit}>
                            Maks. {preset.maxLength} kar.
                          </span>
                        )}
                      </div>

                      <span className={styles.presetDesc}>{preset.description}</span>

                      <div className={styles.presetMetaRow}>
                        <span>key: {preset.key}</span>
                        {preset.default && <span>default: &quot;{preset.default}&quot;</span>}
                      </div>
                    </div>

                    <div className={styles.presetActions}>
                      {/* Action buttons for custom presets */}
                      {!preset.isSystem && preset.id && (
                        <>
                          <button
                            type="button"
                            className={styles.btnActionIcon}
                            onClick={() => handleOpenEdit(preset)}
                            title="Edit preset kustom ini"
                            data-testid={`edit-preset-${preset.key}`}
                          >
                            <IconPencil size={13} />
                          </button>

                          {isBeingDeleted ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white"
                                onClick={() => handleDelete(preset.id)}
                                data-testid={`confirm-delete-${preset.key}`}
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-stone-200 text-stone-700"
                                onClick={() => setDeletingId(null)}
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.btnActionIcon} ${styles.btnActionDelete}`}
                              onClick={() => setDeletingId(preset.id || null)}
                              title="Hapus preset dari koleksi global"
                              data-testid={`delete-preset-${preset.key}`}
                            >
                              <IconTrash size={13} />
                            </button>
                          )}
                        </>
                      )}

                      {/* Status / Apply to current template */}
                      {isAlreadyInTemplate ? (
                        <span className={styles.badgeAlreadyInTemplate} title="Variabel sudah terdaftar di template ini">
                          <IconCheck size={12} />
                          <span>Ada di Template</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.btnApplyToTemplate}
                          onClick={() => handleApplyToTemplate(preset)}
                          title="Tambahkan variabel ini ke template aktif"
                          data-testid={`apply-preset-${preset.key}`}
                          disabled={readOnly}
                        >
                          <IconPlus size={12} />
                          <span>Pakai di Template</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
