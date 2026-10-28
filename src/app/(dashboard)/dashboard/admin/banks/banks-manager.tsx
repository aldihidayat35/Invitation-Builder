"use client";

import React, { useState, useTransition } from "react";
import type { MasterBankItem as MasterBankRow } from "@/features/banks";
import {
  createMasterBankAction,
  updateMasterBankAction,
  toggleMasterBankAction,
  deleteMasterBankAction,
  resetMasterBanksAction,
} from "./actions";

interface BanksManagerProps {
  initialBanks: MasterBankRow[];
}

const PRESET_LOGOS = [
  { name: "BCA", url: "/images/banks/bca.svg" },
  { name: "Mandiri", url: "/images/banks/mandiri.svg" },
  { name: "BRI", url: "/images/banks/bri.svg" },
  { name: "BNI", url: "/images/banks/bni.svg" },
  { name: "BSI", url: "/images/banks/bsi.svg" },
  { name: "CIMB Niaga", url: "/images/banks/cimb.svg" },
  { name: "Permata", url: "/images/banks/permata.svg" },
  { name: "Jago", url: "/images/banks/jago.svg" },
  { name: "SeaBank", url: "/images/banks/seabank.svg" },
  { name: "Blu", url: "/images/banks/blu.svg" },
  { name: "DANA", url: "/images/banks/dana.svg" },
  { name: "GoPay", url: "/images/banks/gopay.svg" },
  { name: "OVO", url: "/images/banks/ovo.svg" },
  { name: "ShopeePay", url: "/images/banks/shopeepay.svg" },
  { name: "LinkAja", url: "/images/banks/linkaja.svg" },
  { name: "QRIS", url: "/images/banks/qris.svg" },
  { name: "Generic / Custom", url: "/images/banks/generic.svg" },
];

export function BanksManager({ initialBanks }: BanksManagerProps) {
  const [banks, setBanks] = useState<MasterBankRow[]>(initialBanks);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "bank" | "ewallet" | "qris">("all");

  // Modal form state
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingBank, setEditingBank] = useState<MasterBankRow | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState<"bank" | "ewallet" | "qris">("bank");
  const [formLogoUrl, setFormLogoUrl] = useState("/images/banks/bca.svg");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const openAddModal = () => {
    setEditingBank(null);
    setFormName("");
    setFormCode("");
    setFormCategory("bank");
    setFormLogoUrl("/images/banks/generic.svg");
    setFormSortOrder(banks.length + 1);
    setFormIsActive(true);
    setIsOpenModal(true);
  };

  const openEditModal = (bank: MasterBankRow) => {
    setEditingBank(bank);
    setFormName(bank.name);
    setFormCode(bank.code);
    setFormCategory((bank.category as "bank" | "ewallet" | "qris") || "bank");
    setFormLogoUrl(bank.logoUrl);
    setFormSortOrder(bank.sortOrder);
    setFormIsActive(bank.isActive);
    setIsOpenModal(true);
  };

  const closeModal = () => {
    setIsOpenModal(false);
    setEditingBank(null);
  };

  const handleToggle = (bank: MasterBankRow) => {
    setFeedback(null);
    const formData = new FormData();
    formData.set("id", bank.id);

    startTransition(async () => {
      const res = await toggleMasterBankAction(formData);
      if (res.ok) {
        setBanks((prev) =>
          prev.map((b) => (b.id === bank.id ? { ...b, isActive: !b.isActive } : b)),
        );
        setFeedback({ type: "success", text: res.message || "Status bank berhasil diubah." });
      } else {
        setFeedback({ type: "error", text: res.error || "Gagal mengubah status." });
      }
    });
  };

  const handleDelete = (bank: MasterBankRow) => {
    if (!confirm(`Hapus bank "${bank.name}" dari master rekening?`)) return;
    setFeedback(null);

    const formData = new FormData();
    formData.set("id", bank.id);

    startTransition(async () => {
      const res = await deleteMasterBankAction(formData);
      if (res.ok) {
        setBanks((prev) => prev.filter((b) => b.id !== bank.id));
        setFeedback({ type: "success", text: res.message || "Bank berhasil dihapus." });
      } else {
        setFeedback({ type: "error", text: res.error || "Gagal menghapus bank." });
      }
    });
  };

  const handleReset = () => {
    if (
      !confirm(
        "Reset seluruh data bank ke 16 bank & e-wallet default (BCA, Mandiri, BRI, BNI, BSI, CIMB, Permata, Jago, SeaBank, Blu, DANA, GoPay, OVO, ShopeePay, LinkAja, QRIS)?",
      )
    )
      return;
    setFeedback(null);

    startTransition(async () => {
      const res = await resetMasterBanksAction();
      if (res.ok) {
        setFeedback({ type: "success", text: res.message || "Berhasil mereset bank." });
        window.location.reload();
      } else {
        setFeedback({ type: "error", text: res.error || "Gagal mereset bank." });
      }
    });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.set("name", formName.trim());
    formData.set("code", formCode.trim().toLowerCase());
    formData.set("category", formCategory);
    formData.set("logoUrl", formLogoUrl.trim());
    formData.set("sortOrder", String(formSortOrder));
    formData.set("isActive", formIsActive ? "true" : "false");

    if (editingBank) {
      formData.set("id", editingBank.id);
      startTransition(async () => {
        const res = await updateMasterBankAction(formData);
        if (res.ok) {
          setBanks((prev) =>
            prev.map((b) =>
              b.id === editingBank.id
                ? {
                    ...b,
                    name: formName.trim(),
                    code: formCode.trim().toLowerCase(),
                    category: formCategory,
                    logoUrl: formLogoUrl.trim(),
                    sortOrder: formSortOrder,
                    isActive: formIsActive,
                  }
                : b,
            ),
          );
          setFeedback({ type: "success", text: res.message || "Data bank berhasil disimpan." });
          closeModal();
        } else {
          setFeedback({ type: "error", text: res.error || "Gagal menyimpan bank." });
        }
      });
    } else {
      startTransition(async () => {
        const res = await createMasterBankAction(formData);
        if (res.ok) {
          setFeedback({ type: "success", text: res.message || "Bank baru berhasil ditambahkan." });
          closeModal();
          window.location.reload();
        } else {
          setFeedback({ type: "error", text: res.error || "Gagal menambahkan bank." });
        }
      });
    }
  };

  // Filtered banks
  const filtered = banks.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" ? true : b.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const totalActive = banks.filter((b) => b.isActive).length;
  const totalEwallet = banks.filter((b) => b.category === "ewallet" || b.category === "qris").length;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-stone-500">Total Bank & E-Wallet</p>
          <p className="mt-1 text-2xl font-black text-[#2C221E]">{banks.length}</p>
          <p className="mt-0.5 text-[11px] text-stone-400">Pilihan rekening yang dapat dipilih admin & klien</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Bank Aktif</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">{totalActive}</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">Tampil di menu dropdown formulir rekening</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <p className="text-xs font-semibold text-blue-800">Dompet Digital & QRIS</p>
          <p className="mt-1 text-2xl font-black text-blue-900">{totalEwallet}</p>
          <p className="mt-0.5 text-[11px] text-blue-700">DANA, GoPay, OVO, ShopeePay, LinkAja & QRIS</p>
        </div>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toolbar: Search, Category Tabs, Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold text-stone-600">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "all" ? "bg-white text-[#2C221E] shadow-2xs font-bold" : "hover:text-[#2C221E]"
              }`}
            >
              Semua ({banks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bank")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "bank" ? "bg-white text-[#2C221E] shadow-2xs font-bold" : "hover:text-[#2C221E]"
              }`}
            >
              Bank Transfer ({banks.filter((b) => b.category === "bank").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ewallet")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "ewallet" ? "bg-white text-[#2C221E] shadow-2xs font-bold" : "hover:text-[#2C221E]"
              }`}
            >
              E-Wallet ({banks.filter((b) => b.category === "ewallet").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("qris")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "qris" ? "bg-white text-[#2C221E] shadow-2xs font-bold" : "hover:text-[#2C221E]"
              }`}
            >
              QRIS ({banks.filter((b) => b.category === "qris").length})
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bank atau e-wallet…"
            className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 disabled:opacity-50 transition"
            title="Kembalikan susunan 16 bank & logo ke standar sistem"
          >
            Reset ke Default
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-[#2C221E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#42352E] transition"
          >
            + Tambah Bank / Logo Baru
          </button>
        </div>
      </div>

      {/* Grid of Bank Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((bank) => (
          <div
            key={bank.id}
            className={`flex flex-col justify-between rounded-2xl border p-4 transition shadow-xs ${
              bank.isActive ? "border-stone-200 bg-white" : "border-stone-200/60 bg-stone-50/70 opacity-60"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                {/* SVG Logo Thumbnail */}
                <div className="flex h-12 w-24 shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-white p-1.5 shadow-2xs overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bank.logoUrl}
                    alt={bank.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/images/banks/generic.svg";
                    }}
                  />
                </div>

                {/* Status Pill */}
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    bank.isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {bank.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <div className="mt-3">
                <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <span>{bank.name}</span>
                </h4>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                  <span>code: {bank.code}</span>
                  <span>•</span>
                  <span className="capitalize font-sans text-stone-600">
                    {bank.category === "bank" ? "Bank Transfer" : bank.category.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 truncate text-[10px] text-stone-400 font-mono" title={bank.logoUrl}>
                  {bank.logoUrl}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
              <button
                type="button"
                onClick={() => handleToggle(bank)}
                disabled={isPending}
                className={`text-[11px] font-bold transition ${
                  bank.isActive ? "text-amber-700 hover:text-amber-800" : "text-emerald-700 hover:text-emerald-800"
                }`}
              >
                {bank.isActive ? "Nonaktifkan" : "Aktifkan"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(bank)}
                  className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-200 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(bank)}
                  disabled={isPending}
                  className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500">
          Tidak ada bank yang sesuai dengan pencarian atau filter yang dipilih.
        </div>
      )}

      {/* Add / Edit Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-[#2C221E] text-base">
                {editingBank ? `Edit Bank / E-Wallet: ${editingBank.name}` : "Tambah Bank / E-Wallet Baru"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Bank / Dompet Digital *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingBank && !formCode) {
                      setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                    }
                  }}
                  placeholder="Contoh: BCA, Bank Mandiri, DANA, GoPay"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kode Unik (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    placeholder="Contoh: bca, mandiri, dana"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-800 outline-none focus:border-[#84633F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as "bank" | "ewallet" | "qris")}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="ewallet">E-Wallet / Dompet Digital</option>
                    <option value="qris">QRIS Standar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Logo Bank (Pilih Preset atau Masukkan URL) *
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-12 w-24 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xs overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formLogoUrl}
                      alt="Preview logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/banks/generic.svg";
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={formLogoUrl}
                    onChange={(e) => setFormLogoUrl(e.target.value)}
                    placeholder="/images/banks/bca.svg atau URL eksternal"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-800 outline-none focus:border-[#84633F]"
                  />
                </div>

                {/* Quick Logo Presets */}
                <div className="mt-2">
                  <span className="text-[10px] text-stone-500 font-semibold block mb-1">
                    Pilihan Logo Cepat dari Koleksi Sistem:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 border border-stone-200 rounded-xl bg-stone-50">
                    {PRESET_LOGOS.map((p) => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => setFormLogoUrl(p.url)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition ${
                          formLogoUrl === p.url
                            ? "bg-[#2C221E] text-white border-[#2C221E]"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-stone-300 text-[#84633F]"
                    />
                    <span>Aktif di Pilihan Rekening</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#2C221E] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#42352E] disabled:opacity-50 transition"
                >
                  {isPending ? "Menyimpan…" : editingBank ? "Simpan Perubahan" : "Tambahkan Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
