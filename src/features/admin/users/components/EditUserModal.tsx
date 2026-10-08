"use client";

import React, { useEffect, useState } from "react";
import type { AvailableResellerOption, UpdateUserInputForm, UserListItem } from "../types";
import type { SystemRole, UserStatus } from "@/lib/schema/domain";

interface EditUserModalProps {
  user: UserListItem | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateUserInputForm) => Promise<boolean>;
  availableResellers: AvailableResellerOption[];
}

export function EditUserModal({
  user,
  currentUserId,
  isOpen,
  onClose,
  onSubmit,
  availableResellers,
}: EditUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [systemRole, setSystemRole] = useState<SystemRole>("client");
  const [status, setStatus] = useState<UserStatus>("active");
  const [resellerId, setResellerId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSelf = user?.id === currentUserId;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setSystemRole(user.systemRole);
      setStatus(user.status);
      setResellerId(user.resellerId || "");
      setNewPassword("");
      setErrorMessage(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
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

    if (newPassword && newPassword.length < 10) {
      setErrorMessage("Kata sandi baru minimal 10 karakter sesuai kebijakan keamanan sistem.");
      return;
    }

    if (isSelf && status === "disabled") {
      setErrorMessage("Anda tidak dapat menonaktifkan akun Super Admin Anda sendiri yang sedang aktif.");
      return;
    }

    if (isSelf && systemRole !== "owner") {
      setErrorMessage("Anda tidak dapat menurunkan peran Super Admin untuk akun Anda sendiri.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        userId: user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        systemRole,
        status,
        resellerId: systemRole === "client" && resellerId ? resellerId : null,
        newPassword: newPassword.trim() ? newPassword.trim() : undefined,
      });

      if (ok) {
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memperbarui pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-7 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200/80">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 id="edit-user-modal-title" className="text-lg font-bold tracking-tight text-[#2C221E]">
                Edit Pengguna: {user.name}
              </h3>
              <p className="text-xs text-stone-500">
                Perbarui rincian akun, peranan sistem, atau reset kata sandi login.
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Self warning */}
        {isSelf && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs font-medium text-amber-900 flex items-center gap-2">
            <span className="text-base">👑</span>
            <span>
              Ini adalah akun <strong>Super Admin aktif Anda</strong> saat ini. Peran dan status dikunci untuk mencegah penguncian sistem (lockout).
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 flex items-start gap-2">
            <svg className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-user-name">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-user-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-stone-900 focus:border-[#84633F] focus:bg-white focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-user-email">
              Alamat Email (Login) <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-stone-900 focus:border-[#84633F] focus:bg-white focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-user-role">
                Peran Sistem
              </label>
              <select
                id="edit-user-role"
                value={systemRole}
                onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                disabled={isSubmitting || isSelf}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:border-[#84633F] focus:bg-white focus:outline-none disabled:opacity-60"
              >
                <option value="client">👤 Klien / Pengguna Biasa</option>
                <option value="reseller">🏪 Mitra Reseller (Agency)</option>
                <option value="owner">👑 Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-user-status">
                Status Akun
              </label>
              <select
                id="edit-user-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                disabled={isSubmitting || isSelf}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:border-[#84633F] focus:bg-white focus:outline-none disabled:opacity-60"
              >
                <option value="active">🟢 Aktif (Dapat Login)</option>
                <option value="disabled">⚪ Dinonaktifkan (Diblokir)</option>
              </select>
            </div>
          </div>

          {/* Conditional Reseller Parent Selector */}
          {systemRole === "client" && availableResellers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-client-reseller">
                Reseller Pembina
              </label>
              <select
                id="edit-client-reseller"
                value={resellerId}
                onChange={(e) => setResellerId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-stone-800 focus:border-[#84633F] focus:bg-white focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="">-- Klien Mandiri (Tanpa Reseller) --</option>
                {availableResellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.agencyName ? `(${r.agencyName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Password Reset Section */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-700" htmlFor="edit-new-password">
                Reset Kata Sandi (Opsional)
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
                id="edit-new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {newPassword && (
              <span
                className={`mt-1 text-[11px] font-medium block ${
                  newPassword.length >= 10 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {newPassword.length >= 10
                  ? "✓ Memenuhi kebijakan keamanan (minimal 10 karakter)."
                  : `Panjang saat ini: ${newPassword.length} karakter (minimal 10).`}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
