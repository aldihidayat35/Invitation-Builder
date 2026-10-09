"use client";

import React, { useState } from "react";
import type { AvailableResellerOption, CreateUserInputForm } from "../types";
import type { SystemRole, UserStatus } from "@/lib/schema/domain";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserInputForm) => Promise<boolean>;
  availableResellers: AvailableResellerOption[];
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  availableResellers,
}: CreateUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState<SystemRole>("reseller");
  const [status, setStatus] = useState<UserStatus>("active");
  const [resellerId, setResellerId] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencySlug, setAgencySlug] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Nama pengguna wajib diisi.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Format email tidak valid.");
      return;
    }

    if (password.length < 10) {
      setErrorMessage("Kata sandi awal wajib diisi dan minimal 10 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        systemRole,
        status,
        resellerId: systemRole === "client" && resellerId ? resellerId : undefined,
        agencyName: systemRole === "reseller" ? agencyName.trim() : undefined,
        slug: systemRole === "reseller" ? agencySlug.trim() : undefined,
        whatsappContact: systemRole === "reseller" ? whatsappContact.trim() : undefined,
      });

      if (ok) {
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setSystemRole("reseller");
        setStatus("active");
        setResellerId("");
        setAgencyName("");
        setAgencySlug("");
        setWhatsappContact("");
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menambahkan pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-7 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200/80">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div>
              <h3
                id="create-user-modal-title"
                className="text-lg font-bold tracking-tight text-[#2C221E]"
              >
                Tambah Pengguna Baru
              </h3>
              <p className="text-xs text-stone-500">
                Buat akun pengguna baru dengan peran dan kredensial akses spesifik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Tutup modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 flex items-start gap-2">
            <svg
              className="h-4 w-4 text-rose-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              className="block text-xs font-semibold text-stone-700 mb-1"
              htmlFor="new-user-name"
            >
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-user-name"
              type="text"
              required
              placeholder="misal: Rian Pratama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:bg-white focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-stone-700 mb-1"
              htmlFor="new-user-email"
            >
              Alamat Email (Login) <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              placeholder="misal: rian@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:bg-white focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-semibold text-stone-700 mb-1"
                htmlFor="new-user-role"
              >
                Peran Sistem <span className="text-rose-500">*</span>
              </label>
              <select
                id="new-user-role"
                value={systemRole}
                onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:border-[#84633F] focus:bg-white focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="reseller">🏪 Mitra Reseller (Agency)</option>
                <option value="owner">👑 Super Admin (Platform Owner)</option>
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-stone-700 mb-1"
                htmlFor="new-user-status"
              >
                Status Akun
              </label>
              <select
                id="new-user-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:border-[#84633F] focus:bg-white focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="active">🟢 Aktif (Dapat Login)</option>
                <option value="disabled">⚪ Dinonaktifkan (Diblokir)</option>
              </select>
            </div>
          </div>

          {/* Conditional Reseller Fields */}
          {systemRole === "reseller" && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                Profil Toko Mitra Seller
              </span>
              <div>
                <label
                  className="block text-xs font-medium text-stone-700 mb-1"
                  htmlFor="reseller-agency-name"
                >
                  Nama Agensi / Brand Toko
                </label>
                <input
                  id="reseller-agency-name"
                  type="text"
                  placeholder="misal: Kencana Wedding Atelier"
                  value={agencyName}
                  onChange={(e) => {
                    setAgencyName(e.target.value);
                    if (!agencySlug) {
                      setAgencySlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, ""),
                      );
                    }
                  }}
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label
                    className="block text-xs font-medium text-stone-700 mb-1"
                    htmlFor="reseller-slug"
                  >
                    Slug Toko (Subdomain)
                  </label>
                  <input
                    id="reseller-slug"
                    type="text"
                    placeholder="kencana-wedding"
                    value={agencySlug}
                    onChange={(e) => setAgencySlug(e.target.value.toLowerCase())}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-500 font-mono"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-stone-700 mb-1"
                    htmlFor="reseller-whatsapp"
                  >
                    WhatsApp Kontak
                  </label>
                  <input
                    id="reseller-whatsapp"
                    type="text"
                    placeholder="628123456789"
                    value={whatsappContact}
                    onChange={(e) => setWhatsappContact(e.target.value)}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-[11px] text-amber-900 leading-relaxed">
            <strong>ℹ️ Akses Calon Pengantin (Klien):</strong> Klien tidak dibuatkan akun login dashboard. Calon pengantin mengakses portal mandiri secara aman menggunakan link token unik langsung pada menu Pesanan / Undangan.
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                className="block text-xs font-semibold text-stone-700"
                htmlFor="new-user-password"
              >
                Kata Sandi Awal
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-semibold text-[#84633F] hover:text-[#5E442B] underline"
              >
                🎲 Acak Password
              </button>
            </div>
            <div className="relative">
              <input
                id="new-user-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={10}
                placeholder="Minimal 10 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 pr-10 text-xs font-mono text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:bg-white focus:outline-none"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <span
                className={`mt-1 text-[11px] font-medium block ${
                  password.length >= 10 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {password.length >= 10
                  ? "✓ Memenuhi kebijakan keamanan (minimal 10 karakter)."
                  : `Panjang saat ini: ${password.length} karakter (minimal 10).`}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2.5 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] hover:text-[#2C221E] shadow-2xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#84633F] hover:bg-[#5E442B] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Pengguna</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
