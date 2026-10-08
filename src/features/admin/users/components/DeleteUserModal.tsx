"use client";

import React, { useState } from "react";
import type { UserListItem } from "../types";

interface DeleteUserModalProps {
  user: UserListItem | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<boolean>;
}

export function DeleteUserModal({
  user,
  currentUserId,
  isOpen,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUserId;

  const handleConfirm = async () => {
    if (isSelf) return;

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const ok = await onConfirm(user.id);
      if (ok) {
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menghapus akun pengguna.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-7">
        {/* Header Icon */}
        <div className="flex items-center gap-3.5 border-b border-stone-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 id="delete-user-modal-title" className="text-lg font-bold tracking-tight text-[#2C221E]">
              Hapus Akun Pengguna
            </h3>
            <p className="text-xs text-stone-500">Konfirmasi penghapusan akses dan data pengguna.</p>
          </div>
        </div>

        {/* Self Deletion Warning Alert */}
        {isSelf ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-start gap-3">
            <svg className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold">Proteksi Keamanan Aktif</p>
              <p className="mt-1 font-normal text-rose-800 leading-relaxed">
                Anda tidak dapat menghapus akun <strong>Super Admin Anda sendiri</strong> saat sedang aktif login. Tindakan ini dicegah untuk menjaga kontinuitas akses sistem.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun berikut secara permanen?
            </p>

            {/* User Details Card */}
            <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Nama:</span>
                <span className="font-bold text-stone-800">{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Email:</span>
                <span className="font-mono text-stone-800">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Peran:</span>
                <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-800">
                  {user.systemRole}
                </span>
              </div>
              {user.agencyName && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">Agensi Toko:</span>
                  <span className="font-semibold text-emerald-700">{user.agencyName}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-[11px] text-amber-900 leading-relaxed">
              <strong>Catatan:</strong> Seluruh sesi aktif dan keanggotaan workspace pengguna ini akan dicabut seketika. Riwayat log audit tetap dipertahankan sesuai standar kepatuhan data.
            </div>
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

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            {isSelf ? "Tutup" : "Batal"}
          </button>
          {!isSelf && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Ya, Hapus Pengguna</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
