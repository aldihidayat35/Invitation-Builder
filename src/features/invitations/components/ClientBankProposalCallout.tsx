"use client";

import React, { useState, useTransition } from "react";
import type { BankVerificationMeta } from "@/lib/engine";
import { resolveFallbackBankLogo } from "@/lib/engine";
import {
  IconCreditCard,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconXCircle,
  IconInfo,
} from "@/features/orders/components/OrderIcons";

export interface ClientBankProposalCalloutProps {
  readonly invitationId: string;
  readonly bankVerification?: BankVerificationMeta | null;
  readonly canApprove?: boolean;
  readonly approveAction: (
    invitationId: string,
    adminNote?: string,
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  readonly rejectAction: (
    invitationId: string,
    adminNote?: string,
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export function ClientBankProposalCallout({
  invitationId,
  bankVerification,
  canApprove = true,
  approveAction,
  rejectAction,
}: ClientBankProposalCalloutProps) {
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const proposedPrimary = bankVerification?.proposedPrimary;
  const proposedSecondary = bankVerification?.proposedSecondary;
  const verifiedPrimary = bankVerification?.verifiedPrimary;
  const verifiedSecondary = bankVerification?.verifiedSecondary;

  // Don't render anything if there is no pending proposal
  if (!proposedPrimary && bankVerification?.status !== "pending_review") {
    return null;
  }

  const handleApprove = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await approveAction(invitationId, "Disetujui langsung oleh Admin di halaman detail undangan.");
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: res.message || "Rekening klien berhasil disetujui dan diterapkan!",
        });
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Gagal menyetujui rekening klien.",
        });
      }
    });
  };

  const handleReject = () => {
    if (!window.confirm("Apakah Anda yakin ingin menolak usulan rekening dari klien ini? Rekening lama akan tetap aktif.")) {
      return;
    }
    setActionMessage(null);
    startTransition(async () => {
      const res = await rejectAction(invitationId, "Ditolak oleh Admin.");
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: res.message || "Usulan rekening klien berhasil ditolak.",
        });
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Gagal menolak usulan rekening.",
        });
      }
    });
  };

  const copyToFormInputs = () => {
    if (!proposedPrimary) return;
    const form = document.querySelector<HTMLFormElement>("form[aria-label='Data undangan']");
    if (!form) return;

    const setInputVal = (name: string, val: string) => {
      const el = form.querySelector<HTMLInputElement>(`input[name='${name}']`);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    setInputVal("v.gift.bank", proposedPrimary.bank);
    setInputVal("v.gift.bank_name", proposedPrimary.bank);
    setInputVal("v.gift.accountNumber", proposedPrimary.accountNumber);
    setInputVal("v.gift.account_number", proposedPrimary.accountNumber);
    setInputVal("v.gift.accountName", proposedPrimary.accountName);
    setInputVal("v.gift.account_holder", proposedPrimary.accountName);
    if (proposedPrimary.bankLogo) {
      setInputVal("v.gift.bankLogo", proposedPrimary.bankLogo);
    }

    if (proposedSecondary && proposedSecondary.bank) {
      setInputVal("v.gift.bank2", proposedSecondary.bank);
      setInputVal("v.gift.bank_name2", proposedSecondary.bank);
      setInputVal("v.gift.accountNumber2", proposedSecondary.accountNumber);
      setInputVal("v.gift.account_number2", proposedSecondary.accountNumber);
      setInputVal("v.gift.accountName2", proposedSecondary.accountName || "");
      if (proposedSecondary.bankLogo) {
        setInputVal("v.gift.bankLogo2", proposedSecondary.bankLogo);
      }
    }

    // Scroll to gift section
    const giftElement = document.getElementById("var-gift.bank") || document.getElementById("var-gift.bank_name");
    if (giftElement) {
      giftElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section
      className="mb-8 rounded-2xl border-2 border-amber-300 bg-linear-to-b from-amber-50/90 to-amber-100/50 p-5 shadow-md transition-all sm:p-6"
      data-testid="client-bank-proposal-callout"
      aria-labelledby="bank-proposal-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-amber-200/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800 shadow-2xs">
            <IconAlertTriangle size={22} className="text-amber-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase shadow-2xs">
                <IconClock size={11} />
                <span>Usulan Perubahan Rekening</span>
              </span>
              {bankVerification?.proposedAt && (
                <span className="text-[11px] text-amber-900/80 font-medium">
                  Diajukan: {new Date(bankVerification.proposedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <h2 id="bank-proposal-heading" className="mt-1 text-base font-bold text-amber-950 sm:text-lg">
              Klien Mengajukan Perubahan Nomor Rekening (Client Portal)
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80">
              Klien mengirimkan pengajuan data rekening amplop digital baru melalui tautan portal mandiri. Silakan periksa perbandingan data di bawah ini dan klik tombol <strong>Setujui Rekening (Approve)</strong> untuk langsung menerapkan ke undangan live.
            </p>
          </div>
        </div>

        {canApprove && (
          <div className="flex shrink-0 items-center gap-2 sm:self-start">
            <button
              type="button"
              disabled={isPending}
              onClick={handleApprove}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition cursor-pointer"
              title="Setujui dan langsung aktifkan nomor rekening baru di undangan live"
            >
              <IconCheckCircle size={15} />
              <span>{isPending ? "Menyetujui…" : "Setujui Rekening (Approve)"}</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleReject}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white/90 px-3.5 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 hover:border-red-400 disabled:opacity-50 transition cursor-pointer"
              title="Tolak usulan perubahan rekening dari klien"
            >
              <IconXCircle size={14} />
              <span>Tolak Usulan</span>
            </button>
          </div>
        )}
      </div>

      {actionMessage && (
        <div
          className={`mt-4 rounded-xl p-3 text-xs font-medium border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : "bg-red-50 text-red-900 border-red-300"
          }`}
        >
          {actionMessage.type === "success" ? "✓ " : "✕ "}
          {actionMessage.text}
        </div>
      )}

      {/* Comparison Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Verified Bank */}
        <div className="rounded-xl border border-amber-200/90 bg-white/70 p-3.5 text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="font-semibold text-stone-600 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <IconCreditCard size={13} className="text-stone-400" />
              <span>Rekening Aktif Saat Ini</span>
            </span>
            <span className="text-[10px] text-stone-500 font-mono">Tercatat</span>
          </div>

          {verifiedPrimary ? (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white p-1 border border-stone-200 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={verifiedPrimary.bankLogo || resolveFallbackBankLogo(verifiedPrimary.bank)}
                  alt={verifiedPrimary.bank}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <strong className="text-stone-800 text-sm">{verifiedPrimary.bank}</strong>
                <p className="font-mono text-stone-900 text-xs font-semibold">{verifiedPrimary.accountNumber}</p>
                <p className="text-stone-600 text-[11px]">a/n {verifiedPrimary.accountName}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-stone-500 italic">Belum ada nomor rekening resmi yang terverifikasi.</p>
          )}

          {verifiedSecondary && verifiedSecondary.bank && (
            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-3">
              <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-1 border border-stone-200 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={verifiedSecondary.bankLogo || resolveFallbackBankLogo(verifiedSecondary.bank)}
                  alt={verifiedSecondary.bank}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Rekening Kedua:</span>
                <strong className="text-stone-800">{verifiedSecondary.bank}</strong> —{" "}
                <span className="font-mono">{verifiedSecondary.accountNumber}</span>
                <span className="block text-stone-600 text-[11px]">a/n {verifiedSecondary.accountName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Proposed New Bank from Client */}
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/60 p-3.5 text-xs shadow-2xs relative">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <IconCheckCircle size={13} className="text-emerald-600" />
              <span>Rekening Baru Diajukan Klien</span>
            </span>
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
              Usulan Baru
            </span>
          </div>

          {proposedPrimary ? (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white p-1 border border-emerald-200 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proposedPrimary.bankLogo || resolveFallbackBankLogo(proposedPrimary.bank)}
                  alt={proposedPrimary.bank}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <strong className="text-emerald-950 text-sm font-black">{proposedPrimary.bank}</strong>
                <p className="font-mono text-emerald-900 text-xs font-bold">{proposedPrimary.accountNumber}</p>
                <p className="text-emerald-800 text-[11px] font-medium">a/n {proposedPrimary.accountName}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-stone-500 italic">Data usulan kosong.</p>
          )}

          {proposedSecondary && proposedSecondary.bank && (
            <div className="mt-2.5 pt-2 border-t border-emerald-200/70 flex items-center gap-3">
              <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-1 border border-emerald-200 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proposedSecondary.bankLogo || resolveFallbackBankLogo(proposedSecondary.bank)}
                  alt={proposedSecondary.bank}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 block font-semibold">Rekening Kedua:</span>
                <strong className="text-emerald-950">{proposedSecondary.bank}</strong> —{" "}
                <span className="font-mono">{proposedSecondary.accountNumber}</span>
                <span className="block text-emerald-800 text-[11px]">a/n {proposedSecondary.accountName}</span>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-[11px]">
            <button
              type="button"
              onClick={copyToFormInputs}
              className="text-emerald-800 hover:text-emerald-950 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
              title="Salin nilai ke form pengeditan di bawah"
            >
              <span>Salin ke Form di Bawah ↓</span>
            </button>
          </div>
        </div>
      </div>

      {bankVerification?.clientNote && (
        <div className="mt-3 rounded-lg bg-amber-100/70 p-2.5 text-xs text-amber-950 flex items-start gap-2 border border-amber-200/70">
          <IconInfo size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900">Catatan dari Klien: </span>
            <span className="italic">&ldquo;{bankVerification.clientNote}&rdquo;</span>
          </div>
        </div>
      )}
    </section>
  );
}
