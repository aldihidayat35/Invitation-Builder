"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CustomerOrderStatus, ProductionStatus } from "@/lib/schema/domain";
import { OrderActionModal } from "./OrderActionModal";
import {
  IconCheckCircle,
  IconClock,
  IconAlertTriangle,
  IconXCircle,
  IconExternalLink,
  IconEdit,
  IconSparkles,
  IconPalette,
  IconArrowRight,
  IconMail,
  IconEye,
  IconLayers,
  IconInfo,
} from "./OrderIcons";

interface OrderActionCalloutProps {
  orderId: string;
  orderStatus: CustomerOrderStatus;
  productionStatus: ProductionStatus;
  invitationId?: string | null;
  invitationSlug?: string | null;
  clientAccessToken?: string | null;
  transitionOrderAction: (formData: FormData) => Promise<void>;
  createOrderProjectAction: (formData: FormData) => Promise<void>;
  transitionProductionAction: (formData: FormData) => Promise<void>;
}

export function OrderActionCallout({
  orderId,
  orderStatus,
  productionStatus,
  invitationId,
  invitationSlug,
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
                <IconClock size={13} />
                <span>Langkah Tindakan Berikutnya</span>
              </span>
              <h3 className="text-base font-bold text-[#2C221E]">
                Verifikasi Pesanan Baru Customer
              </h3>
              <p className="text-xs text-stone-600">
                Pesanan baru masuk dari formulir website. Periksa data mempelai dan nomor WhatsApp pemesan, lalu tandai terkualifikasi atau langsung terima pesanan.
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 px-4 py-2.5 text-xs font-bold text-[#8C5D2A] transition"
              >
                <span>Tandai Terkualifikasi</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Setujui & Terima Pesanan",
                    description:
                      "Pesanan customer disetujui dan siap untuk mulai pengerjaan desain di Studio.",
                    confirmLabel: "Terima & Setujui Sekarang",
                    nextStatus: "accepted",
                    actionType: "order",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84633F] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#664624] transition"
              >
                <IconCheckCircle size={14} />
                <span>Terima Pesanan Langsung</span>
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

  // 2. Order Terkualifikasi (Qualified)
  if (orderStatus === "qualified") {
    return (
      <>
        <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50/50 p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                <IconCheckCircle size={13} />
                <span>Langkah Tindakan Berikutnya</span>
              </span>
              <h3 className="text-base font-bold text-[#1E293B]">
                Persetujuan Komersial Pesanan
              </h3>
              <p className="text-xs text-stone-600">
                Pesanan telah terkualifikasi. Setujui pesanan untuk langsung memulai perakitan desain di Studio Editor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Terima Pesanan Customer",
                    description:
                      "Pesanan akan resmi disetujui dan dialihkan ke pengerjaan desain di Studio.",
                    confirmLabel: "Terima Pesanan Ini",
                    nextStatus: "accepted",
                    actionType: "order",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
              >
                <IconCheckCircle size={14} />
                <span>Terima Order Sekarang</span>
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

  // 3. Order Diterima & Proyek Undangan Belum Diinisialisasi (accepted && !invitationId)
  if (orderStatus === "accepted" && !invitationId) {
    return (
      <div className="rounded-2xl border border-[#D9CFC4] bg-[#FAF8F5] p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <IconSparkles size={13} />
              <span>Pesanan Disetujui</span>
            </span>
            <h3 className="text-base font-bold text-[#2C221E]">
              Mulai Pengerjaan Desain di Studio
            </h3>
            <p className="text-xs text-stone-600">
              Pesanan telah disetujui. Anda dapat mengganti Master Template di bawah atau langsung klik tombol untuk membuka Studio Editor.
            </p>
          </div>

          <form action={createOrderProjectAction} className="shrink-0">
            <input type="hidden" name="orderId" value={orderId} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#664624] hover:bg-[#2C221E] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition"
            >
              <IconSparkles size={14} />
              <span>Mulai Desain di Studio (1-Klik)</span>
              <IconArrowRight size={13} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. Sedang Dikerjakan di Produksi (in_production / awaiting_client)
  if (orderStatus === "accepted" && invitationId && (productionStatus === "in_production" || productionStatus === "awaiting_client")) {
    return (
      <>
        <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-[#FAF8F5] p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                <IconEdit size={13} />
                <span>Dalam Pengerjaan Desain</span>
              </span>
              <h3 className="text-base font-bold text-[#1E293B]">
                Desain Sedang Dikerjakan di Studio
              </h3>
              <p className="text-xs text-stone-600">
                Buka proyek di Editor Studio untuk memeriksa dan menyesuaikan data. Setelah desain siap, kirimkan tautan ke review klien.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/dashboard/invitations/${invitationId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#42352E] shadow-xs transition"
              >
                <IconEdit size={13} />
                <span>Buka Editor Studio</span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  openModal({
                    title: "Kirim Undangan ke Review Klien",
                    description:
                      "Status produksi akan diubah ke 'Review Klien'. Calon pengantin dapat membuka portal mereka untuk meninjau dan menyetujui hasil desain.",
                    confirmLabel: "Kirim ke Review Klien",
                    nextStatus: "client_review",
                    actionType: "production",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 shadow-xs transition"
              >
                <IconMail size={13} />
                <span>Kirim ke Review Klien</span>
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

  // 5. Menunggu Review Klien (client_review)
  if (productionStatus === "client_review") {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-[#8C5D2A]">
              <IconClock size={13} />
              <span>Menunggu Calon Pengantin</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] transition shadow-2xs"
              >
                <IconEye size={13} />
                <span>Buka Portal Klien</span>
                <IconExternalLink size={12} />
              </Link>
            ) : null}
            {invitationId ? (
              <Link
                href={`/dashboard/invitations/${invitationId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84633F] px-4 py-2 text-xs font-bold text-white hover:bg-[#664624] transition shadow-2xs"
              >
                <IconEdit size={13} />
                <span>Buka Editor Studio</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // 6. Pengantin Meminta Revisi (revision_requested)
  if (productionStatus === "revision_requested") {
    return (
      <>
        <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                <IconAlertTriangle size={13} />
                <span>Ada Permintaan Revisi</span>
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
                  href={`/dashboard/invitations/${invitationId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#42352E] shadow-xs transition"
                >
                  <IconEdit size={13} />
                  <span>Buka Editor Studio</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-800 shadow-xs transition"
              >
                <span>Mulai Kerjakan Revisi</span>
                <IconArrowRight size={13} />
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

  // 7. Desain Disetujui Klien (approved)
  if (productionStatus === "approved") {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-linear-to-r from-emerald-50 to-teal-50 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <IconCheckCircle size={13} />
              <span>Desain Disetujui Pengantin</span>
            </span>
            <h3 className="text-base font-bold text-emerald-950">
              Siap Menerbitkan Undangan Resmi (Publish)
            </h3>
            <p className="text-xs text-emerald-800">
              Pengantin telah menyetujui seluruh desain. Buka halaman undangan di Studio untuk mem-publish secara resmi agar bisa diakses oleh seluruh tamu.
            </p>
          </div>

          {invitationId ? (
            <Link
              href={`/dashboard/invitations/${invitationId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
            >
              <IconSparkles size={14} />
              <span>Buka & Terbitkan Undangan</span>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  // 8. Undangan Sudah Terbit (published / completed)
  if (productionStatus === "published" || orderStatus === "completed") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <IconCheckCircle size={13} />
              <span>Undangan Resmi Live</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-2xs"
              >
                <IconEye size={13} />
                <span>Lihat Undangan Tamu</span>
                <IconExternalLink size={12} />
              </Link>
            ) : null}
            {invitationId ? (
              <Link
                href={`/dashboard/invitations/${invitationId}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] transition shadow-2xs"
              >
                <IconEdit size={13} />
                <span>Buka Manajemen Undangan</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // 9. Status Dibatalkan atau Ditolak (Terminal Cancelled)
  if (orderStatus === "cancelled" || orderStatus === "rejected") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            <IconXCircle size={13} />
            <span>Pesanan Dihentikan</span>
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
