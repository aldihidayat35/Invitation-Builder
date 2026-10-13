"use client";

import React, { useState, useTransition } from "react";
import type { BankVerificationMeta, BankAccountDetails } from "@/lib/engine";
import type { CustomerOrderStatus } from "@/lib/schema/domain";
import {
  IconCreditCard,
  IconCheckCircle,
  IconClock,
  IconLock,
  IconAlertTriangle,
  IconSparkles,
} from "./OrderIcons";

interface OrderBankVerificationCardProps {
  orderId: string;
  orderStatus: CustomerOrderStatus;
  bankVerification?: BankVerificationMeta | null;
  verifyAction: (formData: FormData) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export function OrderBankVerificationCard({
  orderId,
  orderStatus,
  bankVerification,
  verifyAction,
}: OrderBankVerificationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const status = bankVerification?.status || "unconfigured";
  const verifiedPrimary = bankVerification?.verifiedPrimary;
  const verifiedSecondary = bankVerification?.verifiedSecondary;
  const proposedPrimary = bankVerification?.proposedPrimary;
  const proposedSecondary = bankVerification?.proposedSecondary;

  // Initial field states pre-filled with verified or proposed
  const [bank, setBank] = useState(verifiedPrimary?.bank || proposedPrimary?.bank || "BCA");
  const [accountNumber, setAccountNumber] = useState(
    verifiedPrimary?.accountNumber || proposedPrimary?.accountNumber || "",
  );
  const [accountName, setAccountName] = useState(
    verifiedPrimary?.accountName || proposedPrimary?.accountName || "",
  );

  const [hasSecondary, setHasSecondary] = useState(
    Boolean(verifiedSecondary?.bank || proposedSecondary?.bank),
  );
  const [bank2, setBank2] = useState(verifiedSecondary?.bank || proposedSecondary?.bank || "");
  const [accountNumber2, setAccountNumber2] = useState(
    verifiedSecondary?.accountNumber || proposedSecondary?.accountNumber || "",
  );
  const [accountName2, setAccountName2] = useState(
    verifiedSecondary?.accountName || proposedSecondary?.accountName || "",
  );

  const [adminNote, setAdminNote] = useState(bankVerification?.adminNote || "");
  const [confirmOrder, setConfirmOrder] = useState(
    orderStatus === "new" || orderStatus === "qualified",
  );

  const applyProposedToForm = () => {
    if (proposedPrimary) {
      if (proposedPrimary.bank) setBank(proposedPrimary.bank);
      if (proposedPrimary.accountNumber) setAccountNumber(proposedPrimary.accountNumber);
      if (proposedPrimary.accountName) setAccountName(proposedPrimary.accountName);
    }
    if (proposedSecondary) {
      setHasSecondary(true);
      if (proposedSecondary.bank) setBank2(proposedSecondary.bank);
      if (proposedSecondary.accountNumber) setAccountNumber2(proposedSecondary.accountNumber);
      if (proposedSecondary.accountName) setAccountName2(proposedSecondary.accountName);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("bank", bank);
    formData.set("accountNumber", accountNumber);
    formData.set("accountName", accountName);
    if (hasSecondary && bank2 && accountNumber2) {
      formData.set("bank2", bank2);
      formData.set("accountNumber2", accountNumber2);
      formData.set("accountName2", accountName2);
    }
    if (adminNote) formData.set("adminNote", adminNote);
    if (confirmOrder) formData.set("confirmOrderAccepted", "true");

    startTransition(async () => {
      const res = await verifyAction(formData);
      if (res.ok) {
        setMessage({ type: "success", text: res.message || "Rekening berhasil diverifikasi!" });
      } else {
        setMessage({ type: "error", text: res.error || "Gagal memverifikasi rekening." });
      }
    });
  };

  const canAcceptOrder = orderStatus === "new" || orderStatus === "qualified";

  return (
    <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs" data-testid="order-bank-verification-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
              Konfirmasi & Keamanan
            </span>
            {status === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <IconCheckCircle size={11} className="text-emerald-600" />
                <span>Terverifikasi & Aktif di Undangan</span>
              </span>
            ) : status === "pending_review" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-[#8C5D2A] animate-pulse">
                <IconClock size={11} className="text-amber-500" />
                <span>Menunggu Verifikasi Admin</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                <span>Belum Dikonfigurasi</span>
              </span>
            )}
          </div>
          <h3 className="mt-1 font-bold text-[#2C221E] flex items-center gap-2 text-base">
            <IconCreditCard size={18} className="text-[#84633F]" />
            <span>Verifikasi Rekening Amplop Digital</span>
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            Hanya Admin yang dapat memverifikasi dan menyuntikkan nomor rekening ke undangan tamu. Klien dan seller terkunci untuk mencegah manipulasi.
          </p>
        </div>
      </div>

      {/* Callout jika ada usulan baru dari Klien */}
      {proposedPrimary && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <IconAlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">
                  Usulan Rekening Baru dari Klien (Portal Mandiri):
                </h4>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-amber-950 font-mono text-[11px]">
                  <div className="rounded bg-white/80 p-2 border border-amber-200/60">
                    <span className="text-stone-500 block text-[9px] uppercase font-sans">Rekening Utama:</span>
                    <strong>{proposedPrimary.bank}</strong> — {proposedPrimary.accountNumber}
                    <span className="block text-stone-600 font-sans">a/n {proposedPrimary.accountName}</span>
                  </div>
                  {proposedSecondary && proposedSecondary.bank && proposedSecondary.accountNumber && (
                    <div className="rounded bg-white/80 p-2 border border-amber-200/60">
                      <span className="text-stone-500 block text-[9px] uppercase font-sans">Rekening Kedua:</span>
                      <strong>{proposedSecondary.bank}</strong> — {proposedSecondary.accountNumber}
                      <span className="block text-stone-600 font-sans">a/n {proposedSecondary.accountName}</span>
                    </div>
                  )}
                </div>
                {bankVerification?.clientNote && (
                  <p className="mt-2 text-amber-900 italic">
                    Catatan Klien: &ldquo;{bankVerification.clientNote}&rdquo;
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={applyProposedToForm}
              className="shrink-0 rounded-lg bg-amber-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-800 transition"
              title="Salin nilai usulan klien ke formulir di bawah"
            >
              Gunakan Usulan Ini ↓
            </button>
          </div>
        </div>
      )}

      {/* Pesan Feedback */}
      {message && (
        <div
          className={`mt-4 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.type === "success" ? <IconCheckCircle size={15} /> : <IconAlertTriangle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulir Admin Verifikasi */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5]/50 p-4 space-y-3">
          <h4 className="text-xs font-bold text-[#2C221E] flex items-center gap-2">
            <IconLock size={13} className="text-[#84633F]" />
            <span>Rekening Utama (Wajib)</span>
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Bank / Dompet Digital
              </label>
              <input
                type="text"
                required
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Contoh: BCA, Mandiri, DANA"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                data-testid="admin-bank-input"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Nomor Rekening
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Contoh: 1234567890"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                data-testid="admin-account-number-input"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Atas Nama Rekening
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Nama pemilik sah"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                data-testid="admin-account-name-input"
              />
            </div>
          </div>
        </div>

        {/* Toggle Rekening Kedua */}
        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5]/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#2C221E] flex items-center gap-2">
              <span>Rekening Kedua (Opsional)</span>
            </h4>
            <label className="inline-flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSecondary}
                onChange={(e) => setHasSecondary(e.target.checked)}
                className="rounded border-stone-300 text-[#84633F]"
              />
              <span>Aktifkan Rekening Kedua</span>
            </label>
          </div>

          {hasSecondary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-stone-200/60">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Bank / E-Wallet 2
                </label>
                <input
                  type="text"
                  value={bank2}
                  onChange={(e) => setBank2(e.target.value)}
                  placeholder="Contoh: BRI, GoPay"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Nomor Rekening 2
                </label>
                <input
                  type="text"
                  value={accountNumber2}
                  onChange={(e) => setAccountNumber2(e.target.value)}
                  placeholder="Contoh: 0987654321"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Atas Nama 2
                </label>
                <input
                  type="text"
                  value={accountName2}
                  onChange={(e) => setAccountName2(e.target.value)}
                  placeholder="Nama pemilik"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Catatan Admin & Opsi Konfirmasi Order */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Catatan verifikasi admin (opsional)..."
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canAcceptOrder && (
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C5D2A] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOrder}
                  onChange={(e) => setConfirmOrder(e.target.checked)}
                  className="rounded border-amber-300 text-[#84633F]"
                />
                <span>Sekaligus Terima Pesanan (accepted)</span>
              </label>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C221E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#42352E] disabled:opacity-50 transition"
              data-testid="admin-verify-bank-btn"
            >
              <IconSparkles size={14} />
              <span>{isPending ? "Memverifikasi…" : "Verifikasi & Pasang ke Undangan"}</span>
            </button>
          </div>
        </div>
      </form>
    </article>
  );
}
