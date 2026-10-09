import React from "react";
import type { CustomerOrderStatus, ProductionStatus } from "@/lib/schema/domain";

interface OrderWorkflowTimelineProps {
  orderStatus: CustomerOrderStatus;
  productionStatus: ProductionStatus;
  isConfigured: boolean;
  hasInvitationProject: boolean;
}

export function OrderWorkflowTimeline({
  orderStatus,
  productionStatus,
  isConfigured,
  hasInvitationProject,
}: OrderWorkflowTimelineProps) {
  const isTerminalCancelled = orderStatus === "cancelled" || orderStatus === "rejected";

  // Determine current active step (1 to 5)
  let activeStep = 1;
  if (orderStatus === "new" || orderStatus === "qualified") {
    activeStep = 1;
  } else if (orderStatus === "accepted" && !isConfigured) {
    activeStep = 2;
  } else if (orderStatus === "accepted" && isConfigured && !hasInvitationProject) {
    activeStep = 3;
  } else if (
    orderStatus === "accepted" &&
    hasInvitationProject &&
    (productionStatus === "awaiting_client" ||
      productionStatus === "in_production" ||
      productionStatus === "revision_requested")
  ) {
    activeStep = 4;
  } else if (
    productionStatus === "client_review" ||
    productionStatus === "approved" ||
    productionStatus === "published" ||
    orderStatus === "completed"
  ) {
    activeStep = 5;
  }

  const steps = [
    {
      num: 1,
      title: "Pesanan Masuk",
      desc:
        orderStatus === "qualified"
          ? "Data Terkualifikasi"
          : orderStatus === "new"
            ? "Menunggu Verifikasi"
            : "Pesanan Tercatat",
    },
    {
      num: 2,
      title: "Persetujuan Order",
      desc:
        orderStatus === "accepted" || orderStatus === "completed"
          ? "Pesanan Diterima"
          : isTerminalCancelled
            ? orderStatus === "rejected"
              ? "Order Ditolak"
              : "Order Dibatalkan"
            : "Verifikasi Admin",
    },
    {
      num: 3,
      title: "Konfigurasi Studio",
      desc: isConfigured ? "Workspace & Template Terkunci" : "Atur Penanggung Jawab",
    },
    {
      num: 4,
      title: "Desain & Produksi",
      desc:
        productionStatus === "revision_requested"
          ? "Perbaikan Revisi Klien"
          : hasInvitationProject
            ? "Desain di Editor Studio"
            : "Generate Dokumen Undangan",
    },
    {
      num: 5,
      title: "Review & Terbit",
      desc:
        productionStatus === "published" || orderStatus === "completed"
          ? "Undangan Sudah Live"
          : productionStatus === "approved"
            ? "Disetujui, Siap Terbit"
            : productionStatus === "client_review"
              ? "Menunggu Konfirmasi Klien"
              : "Review di Portal Klien",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#EBE5DF] bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-[#2C221E] flex items-center gap-2">
            <span>🚀</span> Tahapan Pengerjaan Pesanan (Workflow Pipeline)
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Alur langkah dari customer memesan hingga undangan resmi terbit dan dibagikan.
          </p>
        </div>
        {isTerminalCancelled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            ⚠️ Order Berhenti ({orderStatus === "rejected" ? "Ditolak" : "Dibatalkan"})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-[#8C5D2A] border border-amber-200/70">
            <span className="h-2 w-2 rounded-full bg-[#8C5D2A] animate-pulse" />
            Langkah {activeStep} dari 5
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-5">
        {steps.map((s) => {
          const isDone = !isTerminalCancelled && activeStep > s.num;
          const isCurrent = !isTerminalCancelled && activeStep === s.num;
          const isPending = !isTerminalCancelled && activeStep < s.num;

          return (
            <div
              key={s.num}
              className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                isDone
                  ? "border-[#D9CFC4] bg-[#FAF8F5]/80 text-[#2C221E]"
                  : isCurrent
                    ? "border-[#84633F] bg-white shadow-xs ring-2 ring-[#84633F]/20 text-[#2C221E]"
                    : isTerminalCancelled && activeStep === s.num
                      ? "border-rose-300 bg-rose-50/50 text-rose-950"
                      : "border-stone-100 bg-stone-50/60 text-stone-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-[#84633F] text-white shadow-xs"
                        : isTerminalCancelled && activeStep === s.num
                          ? "bg-rose-600 text-white"
                          : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {isDone ? "✓" : isTerminalCancelled && activeStep === s.num ? "✕" : s.num}
                </span>

                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {isDone
                    ? "Selesai"
                    : isCurrent
                      ? "Aktif Sekarang"
                      : isTerminalCancelled && activeStep === s.num
                        ? "Berhenti"
                        : "Berikutnya"}
                </span>
              </div>

              <div className="mt-3">
                <strong
                  className={`block text-xs font-bold leading-tight ${
                    isCurrent
                      ? "text-[#664624]"
                      : isDone
                        ? "text-[#2C221E]"
                        : isTerminalCancelled && activeStep === s.num
                          ? "text-rose-900"
                          : "text-stone-500"
                  }`}
                >
                  {s.title}
                </strong>
                <p className="mt-1 text-[11px] leading-snug text-stone-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
