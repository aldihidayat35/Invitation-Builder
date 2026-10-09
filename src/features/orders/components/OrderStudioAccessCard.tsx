"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import {
  IconSparkles,
  IconLock,
  IconExternalLink,
  IconCheckCircle,
  IconClock,
  IconAlertTriangle,
  IconArrowRight,
  IconEye,
  IconShield,
} from "./OrderIcons";

interface OrderStudioAccessCardProps {
  orderId: string;
  orderStatus: string;
  productionStatus: string;
  invitationId?: string | null;
  clientAccessToken?: string | null;
  createOrderProjectAction: (formData: FormData) => Promise<void>;
  transitionProductionAction: (formData: FormData) => Promise<void>;
}

export function OrderStudioAccessCard({
  orderId,
  orderStatus,
  productionStatus,
  invitationId,
  clientAccessToken,
  createOrderProjectAction,
  transitionProductionAction,
}: OrderStudioAccessCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleStartProject = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      await createOrderProjectAction(formData);
    });
  };

  const handleAdvanceProduction = (nextStatus: string, note?: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("nextStatus", nextStatus);
      if (note) formData.set("note", note);
      await transitionProductionAction(formData);
    });
  };

  return (
    <article className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-[#8C5D2A]">
            <IconSparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-[#2C221E] text-base">
              Editor Studio Undangan
            </h3>
            <p className="text-xs text-stone-500">
              Workspace perakitan dan penyesuaian konten undangan digital.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-[11px] font-bold text-amber-900">
          <IconShield size={12} className="text-amber-700" />
          <span>Akses Terbatas: Hanya Admin</span>
        </div>
      </div>

      {/* Notice Edukasi Keamanan Akses */}
      <div className="mt-4 rounded-xl border border-stone-200/80 bg-stone-50/80 p-3.5 text-xs text-stone-600 flex items-start gap-2.5">
        <IconLock size={15} className="text-[#664624] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#2C221E] font-semibold">Keamanan Akses Studio: </strong>
          Hanya tim admin yang dapat mengakses Editor Studio untuk mengubah variabel dan tata letak undangan. Klien atau pemesan hanya dapat meninjau hasil jadi dan mengajukan revisi melalui Portal Klien tanpa izin mengedit langsung.
        </div>
      </div>

      {invitationId ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <IconCheckCircle size={14} className="text-emerald-600" />
                  Proyek Undangan Terhubung
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-mono text-stone-500 border border-stone-200">
                  ID: {invitationId.slice(0, 8)}...
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                Tahap produksi studio saat ini:{" "}
                <strong className="text-[#2C221E] uppercase font-bold">
                  {productionStatus.replaceAll("_", " ")}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/invitations/${invitationId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2C221E] hover:bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
              >
                <span>Buka Editor Studio</span>
                <IconExternalLink size={14} />
              </Link>

              {clientAccessToken ? (
                <Link
                  href={`/c/${clientAccessToken}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3.5 py-2.5 text-xs font-semibold text-[#664624] shadow-2xs transition"
                >
                  <IconEye size={14} />
                  <span>Portal Klien</span>
                </Link>
              ) : null}
            </div>
          </div>

          {/* Quick Production Controls */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500 block mb-2">
              Aksi Cepat Tahap Produksi
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {productionStatus === "in_production" || productionStatus === "drafting" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAdvanceProduction("client_review", "Desain dikirim untuk review klien")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-900 transition disabled:opacity-50"
                >
                  <IconEye size={13} />
                  <span>Kirim ke Klien (Review)</span>
                </button>
              ) : null}

              {productionStatus === "client_review" ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-800">
                  <IconClock size={13} />
                  <span>Menunggu Persetujuan Klien di Portal</span>
                </span>
              ) : null}

              {productionStatus === "revision_requested" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAdvanceProduction("drafting", "Memulai revisi desain di studio")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 text-xs font-bold text-orange-900 transition disabled:opacity-50"
                >
                  <IconSparkles size={13} />
                  <span>Tandai Sedang Dikerjakan</span>
                </button>
              ) : null}

              {productionStatus === "approved" ? (
                <Link
                  href={`/dashboard/invitations/${invitationId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition"
                >
                  <IconCheckCircle size={13} />
                  <span>Terbitkan Undangan di Studio</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[#EBDCCB]/80 bg-[#FAF8F5] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-[#2C221E] text-sm">
                Proyek Undangan Belum Diinisialisasi
              </h4>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed max-w-lg">
                Klik tombol di samping untuk langsung membuat proyek undangan di Studio. Sistem akan otomatis menyalin Master Template yang dipilih dan mengisi data customer ke proyek.
              </p>
            </div>

            <form onSubmit={handleStartProject} className="shrink-0">
              <button
                type="submit"
                disabled={isPending || orderStatus === "cancelled" || orderStatus === "rejected"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#664624] hover:bg-[#2C221E] px-5 py-3 text-xs font-bold text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span>Menginisialisasi Studio...</span>
                ) : (
                  <>
                    <IconSparkles size={15} />
                    <span>Mulai Desain di Studio (1-Klik)</span>
                    <IconArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
