"use client";

import React, { useMemo, useState, useTransition, useRef } from "react";
import type { MessageTemplateRow } from "@/lib/db/schema";
import {
  MESSAGE_TEMPLATE_CATEGORIES,
  interpolateMessageTemplate,
} from "@/lib/db/repositories/message-templates";

interface MessageTemplatesManagerProps {
  initialTemplates: MessageTemplateRow[];
}

const AVAILABLE_TAGS = [
  { tag: "{guestname}", label: "Nama Tamu", desc: "Nama tamu penerima" },
  { tag: "{link}", label: "Link Undangan", desc: "URL link undangan dengan parameter penerima" },
  { tag: "{event_title}", label: "Nama Acara", desc: "Judul acara atau nama kedua mempelai" },
  { tag: "{event_date}", label: "Tanggal Acara", desc: "Hari dan tanggal pelaksanaan" },
  { tag: "{event_location}", label: "Lokasi Acara", desc: "Nama gedung atau alamat acara" },
];

const SAMPLE_DATA = {
  guestName: "Bpk. Fajar Pratama & Keluarga",
  link: "https://undangan.id/i/sarah-fajar?to=Bpk.+Fajar+Pratama",
  eventTitle: "Sarah & Fajar",
  eventDate: "Sabtu, 28 November 2026",
  eventLocation: "Grand Ballroom Hotel Indonesia Kempinski",
};

export function MessageTemplatesManager({ initialTemplates }: MessageTemplatesManagerProps) {
  const [templates, setTemplates] = useState<MessageTemplateRow[]>(initialTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MessageTemplateRow | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: "",
    category: "wedding",
    content: "",
    isDefault: false,
    sortOrder: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [templates, selectedCategory, search]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      category: selectedCategory !== "all" ? selectedCategory : "wedding",
      content: `Halo {guestname},

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk hadir di acara kami:
*{event_title}*

📅 Waktu: {event_date}
📍 Lokasi: {event_location}

Informasi lengkap dan tautan undangan digital dapat dilihat di:
{link}

Terima kasih atas doa dan kehadirannya! 🙏`,
      isDefault: false,
      sortOrder: (templates.length + 1) * 10,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MessageTemplateRow) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      content: item.content,
      isDefault: item.isDefault,
      sortOrder: item.sortOrder,
    });
    setIsModalOpen(true);
  };

  const insertTagAtCursor = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({ ...prev, content: prev.content + tag }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = formData.content;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setFormData((prev) => ({ ...prev, content: updated }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification("error", "Judul template dan isi format pesan wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingItem) {
          const res = await fetch("/api/admin/message-templates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingItem.id, ...formData }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Gagal memperbarui template");

          setTemplates((prev) =>
            prev.map((t) => {
              if (t.id === editingItem.id) return json.data;
              // If set to default, unset other items with same category
              if (formData.isDefault && t.category === formData.category) {
                return { ...t, isDefault: false };
              }
              return t;
            }),
          );
          showNotification("success", "Template pesan berhasil diperbarui!");
        } else {
          const res = await fetch("/api/admin/message-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Gagal membuat template");

          setTemplates((prev) => {
            const list = formData.isDefault
              ? prev.map((t) => (t.category === formData.category ? { ...t, isDefault: false } : t))
              : [...prev];
            return [json.data, ...list];
          });
          showNotification("success", "Template pesan baru berhasil dibuat!");
        }
        setIsModalOpen(false);
      } catch (err) {
        showNotification("error", err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  const handleSetDefault = (item: MessageTemplateRow) => {
    if (item.isDefault) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/message-templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, action: "setDefault" }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Gagal menetapkan template default");

        setTemplates((prev) =>
          prev.map((t) => {
            if (t.id === item.id) return { ...t, isDefault: true };
            if (t.category === item.category) return { ...t, isDefault: false };
            return t;
          }),
        );
        showNotification("success", `"${item.title}" sekarang menjadi template default untuk kategori ini.`);
      } catch (err) {
        showNotification("error", err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/message-templates?id=${id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Gagal menghapus template");

        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setDeleteTargetId(null);
        showNotification("success", "Template pesan berhasil dihapus.");
      } catch (err) {
        showNotification("error", err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    showNotification("success", `Format pesan "${title}" berhasil disalin ke clipboard!`);
  };

  const getCategoryMeta = (catKey: string) => {
    return (
      MESSAGE_TEMPLATE_CATEGORIES.find((c) => c.key === catKey) || {
        key: catKey,
        label: catKey,
        icon: "📄",
        description: "",
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3.5 shadow-xl transition-all ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-[#16271c] text-emerald-300 shadow-emerald-950/20"
              : "border-red-500/30 bg-[#2b1717] text-red-300 shadow-red-950/20"
          }`}
        >
          <span className="text-base">{notification.type === "success" ? "✓" : "⚠️"}</span>
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Filter Tabs & Add Button Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-[#D4AF37] text-[#2C221E] shadow-sm font-bold"
                : "bg-[#25201D] text-stone-300 hover:bg-[#2C2622] hover:text-white border border-stone-800"
            }`}
          >
            <span>Semua Jenis</span>
            <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
              {templates.length}
            </span>
          </button>
          {MESSAGE_TEMPLATE_CATEGORIES.map((cat) => {
            const count = templates.filter((t) => t.category === cat.key).length;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#D4AF37] text-[#2C221E] shadow-sm font-bold"
                    : "bg-[#25201D] text-stone-300 hover:bg-[#2C2622] hover:text-white border border-stone-800"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Button & Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kata atau judul..."
              className="w-full rounded-xl border border-stone-800 bg-[#25201D] px-3.5 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-[#D4AF37] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-300"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#2C221E] shadow-md hover:bg-[#BD9B2F] transition-colors shrink-0"
          >
            <span>+</span>
            <span>Tambah Template</span>
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
              <span>💡</span>
              <span>Informasi Penggunaan Variabel Dinamis</span>
            </h4>
            <p className="text-[12px] text-stone-400 leading-relaxed">
              Klien dapat langsung memilih template ini dengan 1-klik di portal mandiri mereka. Tag seperti{" "}
              <code className="text-amber-300 bg-amber-950/40 px-1 rounded">{"{guestname}"}</code> dan{" "}
              <code className="text-amber-300 bg-amber-950/40 px-1 rounded">{"{link}"}</code> akan otomatis diisi dengan nama tamu dan tautan undangan masing-masing saat dikirim via WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
            {AVAILABLE_TAGS.map((t) => (
              <span
                key={t.tag}
                className="rounded-lg bg-[#25201D] border border-stone-700/60 px-2 py-0.5 text-[11px] font-mono text-stone-300"
                title={t.desc}
              >
                {t.tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Template Cards Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-800 bg-[#1D1917]/50 py-16 text-center">
          <div className="rounded-full bg-stone-800/50 p-4 text-2xl mb-3">💬</div>
          <h3 className="text-sm font-bold text-stone-200">Tidak ada template pesan ditemukan</h3>
          <p className="mt-1 text-xs text-stone-500 max-w-sm">
            {search
              ? "Coba ubah kata kunci pencarian Anda."
              : "Belum ada template untuk kategori ini. Klik tombol 'Tambah Template' untuk membuatnya."}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#2C221E] hover:bg-[#BD9B2F] transition-colors"
          >
            + Buat Template Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => {
            const cat = getCategoryMeta(template.category);
            const simulatedText = interpolateMessageTemplate(template.content, SAMPLE_DATA);

            return (
              <div
                key={template.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-800/80 bg-[#1E1917] p-5 shadow-lg transition-all hover:border-[#D4AF37]/40 hover:shadow-amber-950/10 group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#2B2420] border border-stone-700/60 px-2.5 py-0.5 text-[11px] font-medium text-stone-300">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      {template.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 tracking-wide">
                          <span>⭐</span>
                          <span>DEFAULT</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-[#2C2622] hover:text-white transition-colors text-xs"
                        title="Edit Template"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(template.id)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-950/40 hover:text-red-300 transition-colors text-xs"
                        title="Hapus Template"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                    {template.title}
                  </h3>

                  {/* WhatsApp Bubble Preview Box */}
                  <div className="mt-2 rounded-xl border border-emerald-900/40 bg-[#0d1c13] p-3 text-stone-200 text-[11.5px] font-sans leading-relaxed relative">
                    <div className="flex items-center justify-between text-[10px] text-emerald-400/80 mb-2 border-b border-emerald-800/30 pb-1.5">
                      <span className="flex items-center gap-1 font-semibold">
                        <span>📱 Preview WhatsApp</span>
                      </span>
                      <span className="font-mono text-[9px] text-stone-400">09:41</span>
                    </div>
                    <div className="whitespace-pre-wrap font-sans text-stone-200 line-clamp-6 select-text">
                      {simulatedText}
                    </div>
                  </div>
                </div>

                {/* Card Footer / Quick Actions */}
                <div className="mt-4 pt-3.5 border-t border-stone-800/60 flex items-center justify-between gap-2">
                  <div>
                    {!template.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(template)}
                        disabled={isPending}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                      >
                        Set Jadi Default
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(template.content, template.title)}
                      className="rounded-lg bg-[#2A2420] border border-stone-700/60 px-2.5 py-1 text-[11px] font-medium text-stone-300 hover:bg-[#352D28] hover:text-white transition-colors"
                    >
                      Salin Format
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(template)}
                      className="rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2.5 py-1 text-[11px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-colors"
                    >
                      Ubah
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-800 bg-[#1E1917] p-6 shadow-2xl overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{editingItem ? "✏️ Edit Template Pesan" : "✨ Tambah Template Pesan Baru"}</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Format teks ini akan tersedia bagi klien saat mengirimkan link undangan ke tamu undangan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-[#2C2622] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Judul Template</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="misal: Pernikahan — Nuansa Islami"
                    className="w-full rounded-xl border border-stone-800 bg-[#25201D] px-3.5 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Jenis / Kategori Acara</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl border border-stone-800 bg-[#25201D] px-3.5 py-2 text-xs text-stone-200 focus:border-[#D4AF37] focus:outline-none"
                  >
                    {MESSAGE_TEMPLATE_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tag Insertion Quick Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300">
                    Sisipkan Tag Variabel (Klik untuk Menambahkan):
                  </label>
                  <span className="text-[10px] text-stone-500">Klik tag untuk menyisipkan ke teks</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertTagAtCursor(t.tag)}
                      className="group flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all"
                    >
                      <span className="font-mono font-bold">{t.tag}</span>
                      <span className="text-[10px] text-stone-400 group-hover:text-stone-300">
                        ({t.label})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Content Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300">Isi Format Pesan WhatsApp</label>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {formData.content.length} karakter
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  required
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Tuliskan format pesan undangan di sini..."
                  className="w-full font-mono text-xs leading-relaxed rounded-xl border border-stone-800 bg-[#161312] p-3.5 text-stone-200 placeholder-stone-600 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              {/* Live Interpolation Preview */}
              <div className="rounded-xl border border-emerald-900/40 bg-[#0d1c13] p-3 text-stone-200 text-[11px] leading-relaxed">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1.5">
                  Simulasi Tampilan WhatsApp Tamu:
                </p>
                <div className="whitespace-pre-wrap font-sans text-stone-200 max-h-36 overflow-y-auto">
                  {interpolateMessageTemplate(formData.content, SAMPLE_DATA)}
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-stone-700 bg-stone-900 text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <span className="text-xs text-stone-300">
                    Jadikan template default untuk kategori{" "}
                    <strong>{getCategoryMeta(formData.category).label}</strong>
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-stone-400">Urutan:</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))}
                    className="w-16 rounded-lg border border-stone-800 bg-[#25201D] px-2 py-1 text-xs text-center text-stone-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-stone-700/60 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-[#2C2622] hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#D4AF37] px-5 py-2 text-xs font-bold text-[#2C221E] hover:bg-[#BD9B2F] transition-colors disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Buat Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1E1917] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>Hapus Template Pesan</span>
            </h3>
            <p className="mt-2 text-xs text-stone-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus template pesan ini? Template yang sudah dihapus tidak dapat dipulihkan kembali.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-xl border border-stone-700/60 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-[#2C2622] hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(deleteTargetId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
