"use client";

import React, { useMemo, useState, useTransition } from "react";
import type { AdminTestimonial } from "@/features/admin/types";

interface TestimonialsManagerProps {
  initialTestimonials: AdminTestimonial[];
}

const PRESET_SHADES = [
  { name: "Peach Soft", value: "#e7c9b3" },
  { name: "Warm Taupe", value: "#d5c5b2" },
  { name: "Dusty Rose", value: "#e7cbc3" },
  { name: "Golden Sand", value: "#d9c9ac" },
  { name: "Sage Mist", value: "#c9d6c3" },
  { name: "Lavender Silk", value: "#d6c9d9" },
];

export function TestimonialsManager({ initialTestimonials }: TestimonialsManagerProps) {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>(initialTestimonials);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminTestimonial | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    role: "Pelanggan Premium",
    quote: "",
    rating: 5,
    initials: "",
    shade: "#e7c9b3",
    sortOrder: 0,
    isActive: true,
  });

  const filtered = useMemo(() => {
    return testimonials.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        t.quote.toLowerCase().includes(q);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && t.isActive) ||
        (filterStatus === "inactive" && !t.isActive);

      return matchSearch && matchStatus;
    });
  }, [testimonials, search, filterStatus]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      role: "Pelanggan Premium",
      quote: "",
      rating: 5,
      initials: "",
      shade: "#e7c9b3",
      sortOrder: (testimonials.length + 1) * 10,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: AdminTestimonial) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      role: item.role,
      quote: item.quote,
      rating: item.rating,
      initials: item.initials || "",
      shade: item.shade,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.quote.trim()) return;

    startTransition(async () => {
      try {
        if (editingItem) {
          // Update
          const res = await fetch("/api/admin/testimonials", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingItem.id, ...formData }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Gagal memperbarui ulasan");

          setTestimonials((prev) =>
            prev.map((t) => (t.id === editingItem.id ? json.data : t)),
          );
          setNotification({ type: "success", message: "Ulasan berhasil diperbarui!" });
        } else {
          // Create
          const res = await fetch("/api/admin/testimonials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Gagal menambahkan ulasan");

          setTestimonials((prev) => [json.data, ...prev]);
          setNotification({ type: "success", message: "Testimoni baru berhasil ditambahkan!" });
        }
        setIsModalOpen(false);
      } catch (err) {
        setNotification({
          type: "error",
          message: err instanceof Error ? err.message : "Terjadi kesalahan",
        });
      }
    });
  };

  const handleToggleStatus = async (item: AdminTestimonial) => {
    const nextStatus = !item.isActive;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/testimonials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, isActive: nextStatus }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Gagal mengubah status");

        setTestimonials((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, isActive: nextStatus } : t)),
        );
        setNotification({
          type: "success",
          message: `Ulasan ${item.name} berhasil di-${nextStatus ? "aktifkan" : "nonaktifkan"}!`,
        });
      } catch (err) {
        setNotification({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal mengubah status",
        });
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/testimonials?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Gagal menghapus ulasan");

        setTestimonials((prev) => prev.filter((t) => t.id !== id));
        setNotification({ type: "success", message: "Testimoni berhasil dihapus!" });
        setDeleteTargetId(null);
      } catch (err) {
        setNotification({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal menghapus ulasan",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
        {/* Toolbar Header */}
        <div className="flex flex-col gap-4 border-b border-stone-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#2C221E]">
                Daftar Ulasan & Testimoni Pelanggan
              </h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-[#84633F] border border-amber-200/70">
                {testimonials.length} testimoni ({testimonials.filter((t) => t.isActive).length} aktif)
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Ulasan yang berstatus aktif akan otomatis ditampilkan pada section “Apa Kata Mereka” di Landing Page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="search"
              placeholder="Cari nama atau ulasan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none sm:w-56"
              aria-label="Cari review"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
              className="rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none"
              aria-label="Filter status review"
            >
              <option value="all">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Nonaktif (Disembunyikan)</option>
            </select>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#2C221E] shadow-sm hover:bg-[#BD9B2F] transition-colors"
            >
              <span>+ Tambah Testimoni</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Tidak ada testimoni yang sesuai dengan pencarian atau filter.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <th className="pb-3 pl-2">Pelanggan</th>
                  <th className="pb-3">Isi Ulasan & Rating</th>
                  <th className="pb-3 text-center">Urutan</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 pr-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* User info */}
                    <td className="py-3.5 pl-2 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-stone-800 shadow-2xs"
                          style={{ background: `linear-gradient(135deg, ${item.shade}, #f6ece3)` }}
                        >
                          {item.initials || item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-stone-900 block">{item.name}</span>
                          <span className="text-[11px] text-stone-400">{item.role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Quote & Stars */}
                    <td className="py-3.5 pr-4 align-middle max-w-md">
                      <div className="flex items-center gap-1 text-amber-500 text-[13px] mb-1">
                        {"★".repeat(item.rating)}
                        {"☆".repeat(Math.max(0, 5 - item.rating))}
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        “{item.quote}”
                      </p>
                    </td>

                    {/* Sort Order */}
                    <td className="py-3.5 text-center align-middle font-medium text-stone-500">
                      {item.sortOrder}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100"
                            : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200"
                        }`}
                        title="Klik untuk mengubah status aktif/nonaktif"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.isActive ? "bg-emerald-500" : "bg-stone-400"
                          }`}
                        />
                        {item.isActive ? "Tampil di Landing" : "Disembunyikan"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-2 text-right align-middle">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:border-[#84633F] hover:text-[#84633F] shadow-2xs transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(item.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-[#2C221E]">
                {editingItem ? "Edit Testimoni Pelanggan" : "Tambah Testimoni Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Nama Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      initials: prev.initials ? prev.initials : name.slice(0, 2).toUpperCase(),
                    }));
                  }}
                  placeholder="Contoh: Nabila Putri"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-[#84633F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Peran / Status
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Pelanggan Premium / Mempelai"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-[#84633F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Rating Bintang (1 - 5)
                  </label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-[#84633F] focus:outline-none"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Bintang)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Bintang)</option>
                    <option value={3}>⭐⭐⭐ (3 Bintang)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Isi Ulasan / Testimoni <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="Tulis ulasan pelanggan tentang pengalaman menggunakan template undangan…"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-[#84633F] focus:outline-none"
                />
              </div>

              {/* Avatar Shade Picker */}
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Warna Aksen Avatar & Inisial
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_SHADES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, shade: s.value })}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                        formData.shade === s.value ? "border-[#2C221E] scale-110 shadow-xs" : "border-white"
                      }`}
                      style={{ background: s.value }}
                      title={s.name}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[11px] text-stone-400">Inisial:</span>
                    <input
                      type="text"
                      maxLength={3}
                      value={formData.initials}
                      onChange={(e) => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                      className="w-12 rounded-lg border border-stone-300 px-2 py-1 text-center font-bold uppercase focus:border-[#84633F] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-stone-300 text-[#84633F] focus:ring-[#84633F]"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-stone-700">
                    Tampilkan langsung di Landing Page
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#2C221E] hover:bg-[#BD9B2F] shadow-sm disabled:opacity-50"
                  >
                    {isPending ? "Menyimpan…" : "Simpan Testimoni"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl font-bold">
              ⚠️
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Hapus Testimoni Ini?</h4>
              <p className="mt-1 text-xs text-stone-500">
                Testimoni yang dihapus tidak akan ditampilkan lagi di Landing Page. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTargetId)}
                disabled={isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
              >
                {isPending ? "Menghapus…" : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
