"use client";

import React, { useState, useTransition } from "react";
import type { BankVerificationMeta, MasterBankItem } from "@/lib/engine";
import { MASTER_BANKS_DEFAULT, resolveFallbackBankLogo } from "@/lib/engine";
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
  masterBanks?: readonly MasterBankItem[];
}

export function OrderBankVerificationCard({
  orderId,
  orderStatus,
  bankVerification,
  verifyAction,
  masterBanks = MASTER_BANKS_DEFAULT,
}: OrderBankVerificationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const status = bankVerification?.status || "unconfigured";
  const verifiedPrimary = bankVerification?.verifiedPrimary;
  const verifiedSecondary = bankVerification?.verifiedSecondary;
  const proposedPrimary = bankVerification?.proposedPrimary;
  const proposedSecondary = bankVerification?.proposedSecondary;

  const initialBank = verifiedPrimary?.bank || proposedPrimary?.bank || "BCA";
  const initialLogo =
    verifiedPrimary?.bankLogo ||
    proposedPrimary?.bankLogo ||
    resolveFallbackBankLogo(initialBank);

  const [bank, setBank] = useState(initialBank);
  const [bankLogo, setBankLogo] = useState(initialLogo);

  // Match initial preset
  const findPreset = (nameOrCode: string) => {
    const norm = nameOrCode.toLowerCase().trim();
    return masterBanks.find(
      (b) => b.name.toLowerCase() === norm || b.code.toLowerCase() === norm,
    );
  };

  const initialMatch1 = findPreset(initialBank);
  const [preset1, setPreset1] = useState<string>(initialMatch1 ? initialMatch1.code : "custom");

  const [accountNumber, setAccountNumber] = useState(
    verifiedPrimary?.accountNumber || proposedPrimary?.accountNumber || "",
  );
  const [accountName, setAccountName] = useState(
    verifiedPrimary?.accountName || proposedPrimary?.accountName || "",
  );

  const [hasSecondary, setHasSecondary] = useState(
    Boolean(verifiedSecondary?.bank || proposedSecondary?.bank),
  );

  const initialBank2 = verifiedSecondary?.bank || proposedSecondary?.bank || "";
  const initialLogo2 =
    verifiedSecondary?.bankLogo ||
    proposedSecondary?.bankLogo ||
    (initialBank2 ? resolveFallbackBankLogo(initialBank2) : "");

  const [bank2, setBank2] = useState(initialBank2);
  const [bankLogo2, setBankLogo2] = useState(initialLogo2);

  const initialMatch2 = initialBank2 ? findPreset(initialBank2) : null;
  const [preset2, setPreset2] = useState<string>(
    initialMatch2 ? initialMatch2.code : initialBank2 ? "custom" : "mandiri",
  );

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

  const handleBankSelect1 = (code: string) => {
    setPreset1(code);
    if (code === "custom") {
      setBankLogo("/images/banks/generic.svg");
    } else {
      const found = masterBanks.find((b) => b.code === code);
      if (found) {
        setBank(found.name);
        setBankLogo(found.logoUrl);
      }
    }
  };

  const handleBankSelect2 = (code: string) => {
    setPreset2(code);
    if (code === "custom") {
      setBankLogo2("/images/banks/generic.svg");
    } else {
      const found = masterBanks.find((b) => b.code === code);
      if (found) {
        setBank2(found.name);
        setBankLogo2(found.logoUrl);
      }
    }
  };

  const applyProposedToForm = () => {
    if (proposedPrimary) {
      if (proposedPrimary.bank) {
        setBank(proposedPrimary.bank);
        const logo =
          proposedPrimary.bankLogo || resolveFallbackBankLogo(proposedPrimary.bank);
        setBankLogo(logo);
        const match = findPreset(proposedPrimary.bank);
        setPreset1(match ? match.code : "custom");
      }
      if (proposedPrimary.accountNumber) setAccountNumber(proposedPrimary.accountNumber);
      if (proposedPrimary.accountName) setAccountName(proposedPrimary.accountName);
    }
    if (proposedSecondary) {
      setHasSecondary(true);
      if (proposedSecondary.bank) {
        setBank2(proposedSecondary.bank);
        const logo2 =
          proposedSecondary.bankLogo || resolveFallbackBankLogo(proposedSecondary.bank);
        setBankLogo2(logo2);
        const match = findPreset(proposedSecondary.bank);
        setPreset2(match ? match.code : "custom");
      }
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
    formData.set("bankLogo", bankLogo || resolveFallbackBankLogo(bank));
    formData.set("accountNumber", accountNumber);
    formData.set("accountName", accountName);
    if (hasSecondary && bank2 && accountNumber2) {
      formData.set("bank2", bank2);
      formData.set("bankLogo2", bankLogo2 || resolveFallbackBankLogo(bank2));
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
                  <div className="rounded bg-white/80 p-2 border border-amber-200/60 flex items-center gap-2.5">
                    <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-white p-1 border border-stone-200 shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proposedPrimary.bankLogo || resolveFallbackBankLogo(proposedPrimary.bank)}
                        alt={proposedPrimary.bank}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-sans">Rekening Utama:</span>
                      <strong>{proposedPrimary.bank}</strong> — {proposedPrimary.accountNumber}
                      <span className="block text-stone-600 font-sans">a/n {proposedPrimary.accountName}</span>
                    </div>
                  </div>
                  {proposedSecondary && proposedSecondary.bank && proposedSecondary.accountNumber && (
                    <div className="rounded bg-white/80 p-2 border border-amber-200/60 flex items-center gap-2.5">
                      <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-white p-1 border border-stone-200 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proposedSecondary.bankLogo || resolveFallbackBankLogo(proposedSecondary.bank)}
                          alt={proposedSecondary.bank}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[9px] uppercase font-sans">Rekening Kedua:</span>
                        <strong>{proposedSecondary.bank}</strong> — {proposedSecondary.accountNumber}
                        <span className="block text-stone-600 font-sans">a/n {proposedSecondary.accountName}</span>
                      </div>
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
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white p-1 shadow-2xs"
                  title={bank}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bankLogo || resolveFallbackBankLogo(bank)}
                    alt={bank}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <select
                  value={preset1}
                  onChange={(e) => handleBankSelect1(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                  data-testid="admin-bank-select"
                >
                  <optgroup label="Bank Populer">
                    {masterBanks
                      .filter((b) => b.category === "bank")
                      .map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="E-Wallet & QRIS">
                    {masterBanks
                      .filter((b) => b.category !== "bank")
                      .map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                  <option value="custom">Kustom / Bank Lain…</option>
                </select>
              </div>
              {preset1 === "custom" && (
                <div className="mt-2 space-y-1">
                  <input
                    type="text"
                    required
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="Nama Bank / E-Wallet Kustom"
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                    data-testid="admin-bank-input"
                  />
                  <input
                    type="text"
                    value={bankLogo}
                    onChange={(e) => setBankLogo(e.target.value)}
                    placeholder="URL / Path Logo (opsional, cth: /images/banks/bca.svg)"
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[10px] text-stone-500 outline-none focus:border-[#84633F]"
                  />
                </div>
              )}
              {preset1 !== "custom" && (
                <input
                  type="hidden"
                  value={bank}
                  data-testid="admin-bank-input"
                  readOnly
                />
              )}
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
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white p-1 shadow-2xs"
                    title={bank2}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bankLogo2 || (bank2 ? resolveFallbackBankLogo(bank2) : "/images/banks/generic.svg")}
                      alt={bank2 || "Bank 2"}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <select
                    value={preset2}
                    onChange={(e) => handleBankSelect2(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                  >
                    <optgroup label="Bank Populer">
                      {masterBanks
                        .filter((b) => b.category === "bank")
                        .map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="E-Wallet & QRIS">
                      {masterBanks
                        .filter((b) => b.category !== "bank")
                        .map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                    </optgroup>
                    <option value="custom">Kustom / Bank Lain…</option>
                  </select>
                </div>
                {preset2 === "custom" && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="text"
                      value={bank2}
                      onChange={(e) => setBank2(e.target.value)}
                      placeholder="Contoh: BRI, GoPay"
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-800 outline-none focus:border-[#84633F]"
                    />
                    <input
                      type="text"
                      value={bankLogo2}
                      onChange={(e) => setBankLogo2(e.target.value)}
                      placeholder="URL / Path Logo 2 (opsional)"
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[10px] text-stone-500 outline-none focus:border-[#84633F]"
                    />
                  </div>
                )}
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
