"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CustomerOrderStatus, ProductionStatus } from "@/lib/schema/domain";
import { OrderActionModal } from "./OrderActionModal";

interface OrderActionCalloutProps {
  orderId: string;
  orderStatus: CustomerOrderStatus;
  productionStatus: ProductionStatus;
  isConfigured: boolean;
  invitationId?: string | null;
  invitationSlug?: string | null;
  assigneeName?: string | null;
  isAssignee: boolean;
  clientAccessToken?: string | null;
  transitionOrderAction: (formData: FormData) => Promise<void>;
  createOrderProjectAction: (formData: FormData) => Promise<void>;
  transitionProductionAction: (formData: FormData) => Promise<void>;
}

export function OrderActionCallout({
  orderId,
  orderStatus,
  productionStatus,
  isConfigured,
  invitationId,
  invitationSlug,
  assigneeName,
  isAssignee,
  clientAccessToken,
  transitionOrderAction,
  createOrderProjectAction,
  transitionProductionAction,
}: OrderActionCalloutProps) {
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    nextStatus: string;
    isDestructive?: boolean;
    requireNote?: boolean;
    actionType: "order" | "production";
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "",
    nextStatus: "",
    actionType: "order",
  });

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const openModal = (config: Omit<typeof modalConfig, "isOpen">) => {
    setModalConfig({ ...config, isOpen: true });
  };

  // 1. Order Baru (New)
  if (orderStatus === "new") {
    return (
      <>
        <div className="rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 to-[#FAF6EE] p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-[#8C5D2A]">
                <span>🔔</span> Langkah Tindakan Berikutnya
              </span>
              <h3 className="text-base font-bold text-[#2C221E]">
                Verifikasi Pesanan Baru Customer
              </h3>
              <p className="text-xs text-stone-600">
                Pesanan baru masuk dari formulir website. Periksa data mempelai dan nomor WhatsApp pemesan, lalu tandai terkualifikasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Tandai Pesanan Terkualifikasi",
                    description:
                      "Data pesanan customer sudah lengkap dan siap diajukan untuk disetujui tim produksi.",
                    confirmLabel: "Tandai Terkualifikasi",
                    nextStatus: "qualified",
                    actionType: "order",
                  })
                }
                className="rounded-xl bg-[#84633F] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#664624] transition"
              >
                Tandai Terkualifikasi →
              </button>
            </div>
          </div>
        </div>

        <OrderActionModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          description={modalConfig.description}
          confirmLabel={modalConfig.confirmLabel}
          isDestructive={modalConfig.isDestructive}
          requireNote={modalConfig.requireNote}
          orderId={orderId}
          nextStatus={modalConfig.nextStatus}
          action={
            modalConfig.actionType === "order"
              ? transitionOrderAction
              : transitionProductionAction
          }
        />
      </>
    );
  }

  // 2. Order Terkualifikasi (Qualified)
  if (orderStatus === "qualified") {
    return (
      <>
        <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50/50 p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                <span>📋</span> Langkah Tindakan Berikutnya
              </span>
              <h3 className="text-base font-bold text-[#1E293B]">
                Persetujuan Komersial Pesanan
              </h3>
              <p className="text-xs text-stone-600">
                Pesanan telah terkualifikasi. Setujui pesanan untuk membuka menu konfigurasi workspace & produksi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Terima Pesanan Customer",
                    description:
                      "Pesanan akan resmi diterima dan dialihkan ke tahap konfigurasi produksi desain.",
                    confirmLabel: "Terima Pesanan Ini",
                    nextStatus: "accepted",
                    actionType: "order",
                  })
                }
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition"
              >
                Terima Order Sekarang ✓
              </button>
            </div>
          </div>
        </div>

        <OrderActionModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          description={modalConfig.description}
          confirmLabel={modalConfig.confirmLabel}
          isDestructive={modalConfig.isDestructive}
          requireNote={modalConfig.requireNote}
          orderId={orderId}
          nextStatus={modalConfig.nextStatus}
          action={transitionOrderAction}
        />
      </>
    );
  }

  // 3. Order Diterima & Belum Dikonfigurasi
  if (orderStatus === "accepted" && !isConfigured) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-[#8C5D2A]">
              <span>⚙️</span> Siap Dikonfigurasi
            </span>
            <h3 className="text-base font-bold text-[#2C221E]">
              Atur Konfigurasi Produksi Studio
            </h3>
            <p className="text-xs text-stone-600">
              Pesanan telah diterima. Silakan isi form <strong>Konfigurasi Produksi</strong> di bawah (pilih workspace, template terkunci, dan desainer penanggung jawab).
            </p>
          </div>

          <a
            href="#konfigurasi-produksi"
            className="inline-flex items-center justify-center rounded-xl bg-[#84633F] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#664624] transition"
          >
            Isi Konfigurasi Produksi ↓
          </a>
        </div>
      </div>
    );
  }

  // 4. Order Diterima & Dikonfigurasi, tapi belum ada proyek undangan
  if (orderStatus === "accepted" && isConfigured && !invitationId) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <span>🎉</span> Konfigurasi Siap
            </span>
            <h3 className="text-base font-bold text-emerald-950">
              Buat Dokumen Proyek Undangan
            </h3>
            <p className="text-xs text-emerald-800">
              Workspace & versi template telah dikunci. Klik tombol di samping untuk meng-generate proyek undangan agar dapat diedit di Studio Editor.
            </p>
          </div>

          {isAssignee ? (
            <form action={createOrderProjectAction}>
              <input type="hidden" name="orderId" value={orderId} />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
              >
                Buat Proyek Undangan Sekarang ➔
              </button>
            </form>
          ) : (
            <p className="text-xs font-semibold text-amber-800 bg-amber-100/80 px-3 py-2 rounded-xl">
              ⚠️ Proyek hanya dapat dibuat oleh assignee: {assigneeName}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 5. Sedang Dikerjakan di Produksi (in_production)
  if (orderStatus === "accepted" && invitationId && productionStatus === "in_production") {
    return (
      <>
        <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-[#FAF8F5] p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                <span>🎨</span> Dalam Pengerjaan Desain
              </span>
              <h3 className="text-base font-bold text-[#1E293B]">
                Desain Sedang Dikerjakan Desainer
              </h3>
              <p className="text-xs text-stone-600">
                Buka proyek di Editor Studio untuk memasukkan data dan foto mempelai. Setelah desain siap, kirimkan ke review klien.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/editor/${invitationId}`}
                className="rounded-xl bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#42352E] shadow-sm transition flex items-center gap-1.5"
              >
                <span>✏️ Buka Editor Studio</span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Kirim Undangan ke Review Klien",
                    description:
                      "Status produksi akan diubah ke 'Review Klien'. Calon pengantin dapat membuka portal mereka untuk menyetujui atau meminta revisi.",
                    confirmLabel: "Kirim ke Review Klien",
                    nextStatus: "client_review",
                    actionType: "production",
                  })
                }
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 shadow-sm transition"
              >
                Kirim ke Review Klien ✉️
              </button>
            </div>
          </div>
        </div>

        <OrderActionModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          description={modalConfig.description}
          confirmLabel={modalConfig.confirmLabel}
          isDestructive={modalConfig.isDestructive}
          requireNote={modalConfig.requireNote}
          orderId={orderId}
          nextStatus={modalConfig.nextStatus}
          action={transitionProductionAction}
        />
      </>
    );
  }

  // 6. Menunggu Review Klien (client_review)
  if (productionStatus === "client_review") {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-[#8C5D2A]">
              <span>⏳</span> Menunggu Calon Pengantin
            </span>
            <h3 className="text-base font-bold text-[#2C221E]">
              Undangan Sedang Ditinjau di Portal Klien
            </h3>
            <p className="text-xs text-stone-600">
              Calon pengantin telah menerima link portal. Menunggu mereka mengklik <strong>Setujui Desain</strong> atau <strong>Minta Revisi</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {clientAccessToken ? (
              <Link
                href={`/c/${clientAccessToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] transition flex items-center gap-1"
              >
                <span>Lihat Tampilan Portal Klien ↗</span>
              </Link>
            ) : null}
            {invitationId ? (
              <Link
                href={`/editor/${invitationId}`}
                className="rounded-xl bg-[#84633F] px-4 py-2 text-xs font-bold text-white hover:bg-[#664624] transition"
              >
                Buka Editor Studio
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // 7. Pengantin Meminta Revisi (revision_requested)
  if (productionStatus === "revision_requested") {
    return (
      <>
        <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                <span>🔄</span> Ada Permintaan Revisi
              </span>
              <h3 className="text-base font-bold text-rose-950">
                Calon Pengantin Mengajukan Catatan Revisi
              </h3>
              <p className="text-xs text-rose-800">
                Periksa catatan revisi di bawah, lakukan perbaikan di Editor Studio, lalu kirim ulang ke review klien.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {invitationId ? (
                <Link
                  href={`/editor/${invitationId}`}
                  className="rounded-xl bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#42352E] shadow-sm transition"
                >
                  Buka Editor Studio ✏️
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Mulai Kerjakan Revisi",
                    description:
                      "Ubah status kembali ke 'Dalam Produksi' untuk menandakan desainer sedang merevisi undangan.",
                    confirmLabel: "Mulai Kerjakan Revisi",
                    nextStatus: "in_production",
                    actionType: "production",
                  })
                }
                className="rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-800 shadow-sm transition"
              >
                Mulai Kerjakan Revisi ➔
              </button>
            </div>
          </div>
        </div>

        <OrderActionModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          description={modalConfig.description}
          confirmLabel={modalConfig.confirmLabel}
          isDestructive={modalConfig.isDestructive}
          requireNote={modalConfig.requireNote}
          orderId={orderId}
          nextStatus={modalConfig.nextStatus}
          action={transitionProductionAction}
        />
      </>
    );
  }

  // 8. Desain Disetujui Klien (approved)
  if (productionStatus === "approved") {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-linear-to-r from-emerald-50 to-teal-50 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <span>🌟</span> Desain Disetujui Pengantin
            </span>
            <h3 className="text-base font-bold text-emerald-950">
              Siap Menerbitkan Undangan Resmi (Publish)
            </h3>
            <p className="text-xs text-emerald-800">
              Pengantin telah menyetujui seluruh desain. Buka halaman undangan untuk mem-publish secara resmi agar bisa diakses oleh seluruh tamu.
            </p>
          </div>

          {invitationId ? (
            <Link
              href={`/dashboard/invitations/${invitationId}`}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              Buka & Publish Undangan Sekarang 🚀
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  // 9. Undangan Sudah Terbit (published / completed)
  if (productionStatus === "published" || orderStatus === "completed") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <span>✨</span> Undangan Resmi Live
            </span>
            <h3 className="text-base font-bold text-emerald-950">
              Undangan Aktif & Siap Disebarkan
            </h3>
            <p className="text-xs text-stone-600">
              Undangan pernikahan telah terbit. Calon pengantin dapat membagikan link personal ke tamu melalui portal mereka.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {invitationSlug ? (
              <Link
                href={`/i/${invitationSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
              >
                Lihat Undangan Tamu ↗
              </Link>
            ) : null}
            {invitationId ? (
              <Link
                href={`/dashboard/invitations/${invitationId}`}
                className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] transition"
              >
                Buka Manajemen Undangan
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // 10. Status Dibatalkan atau Ditolak (Terminal Cancelled)
  if (orderStatus === "cancelled" || orderStatus === "rejected") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            <span>🛑</span> Pesanan Dihentikan
          </span>
          <h3 className="text-base font-bold text-rose-950">
            Pesanan Berstatus {orderStatus === "rejected" ? "Ditolak" : "Dibatalkan"}
          </h3>
          <p className="text-xs text-rose-800">
            Pesanan ini berada pada status akhir dan tidak dapat dilanjutkan ke tahap produksi.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
