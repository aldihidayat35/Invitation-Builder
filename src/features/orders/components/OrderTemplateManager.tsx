"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  IconPalette,
  IconCheckCircle,
  IconInfo,
  IconArrowRight,
  IconExternalLink,
  IconLayers,
  IconLock,
} from "./OrderIcons";

export interface TemplateOption {
  id: string;
  name: string;
  versionNo: number | null;
  category?: string | null;
  layoutFormat?: string | null;
}

interface OrderTemplateManagerProps {
  orderId: string;
  currentTemplateId: string | null;
  currentTemplateName?: string;
  templates: TemplateOption[];
  invitationId?: string | null;
  changeOrderTemplateAction: (formData: FormData) => Promise<void>;
}

export function OrderTemplateManager({
  orderId,
  currentTemplateId,
  currentTemplateName,
  templates,
  invitationId,
  changeOrderTemplateAction,
}: OrderTemplateManagerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    currentTemplateId ?? templates[0]?.id ?? "",
  );
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const isChanged = selectedTemplateId !== (currentTemplateId ?? "");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("templateId", selectedTemplateId);
      try {
        await changeOrderTemplateAction(formData);
        setStatusMessage("Master template berhasil diperbarui!");
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err) {
        setStatusMessage(
          err instanceof Error ? err.message : "Gagal mengubah master template.",
        );
      }
    });
  };

  return (
    <article className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#84633F]/10 text-[#664624]">
            <IconPalette size={20} />
          </div>
          <div>
            <h3 className="font-bold text-[#2C221E] text-base">
              Master Template Desain
            </h3>
            <p className="text-xs text-stone-500">
              Desain acuan utama undangan. Admin dapat mengganti master template kapan saja.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
          <IconLock size={12} />
          <span>Akses Admin</span>
        </span>
      </div>

      {/* Tampilan Template Saat Ini */}
      <div className="mt-5 rounded-xl border border-[#EBDCCB]/70 bg-[#FAF8F5] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              Template Terpasang
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-bold text-[#2C221E] text-sm md:text-base">
                {currentTemplateName || "Belum dipilih (Menggunakan default sistem)"}
              </span>
              {currentTemplateId ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#84633F]/10 px-2 py-0.5 text-[11px] font-bold text-[#664624]">
                  <IconCheckCircle size={12} />
                  <span>Aktif</span>
                </span>
              ) : null}
            </div>
          </div>

          {currentTemplateId ? (
            <Link
              href={`/dashboard/templates/${currentTemplateId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#664624] hover:bg-stone-50 shadow-2xs transition"
            >
              <span>Detail Template</span>
              <IconExternalLink size={13} />
            </Link>
          ) : null}
        </div>

        {invitationId ? (
          <p className="mt-3 text-xs text-stone-600 flex items-start gap-1.5 border-t border-[#EBDCCB]/50 pt-2.5">
            <IconInfo size={14} className="text-[#84633F] shrink-0 mt-0.5" />
            <span>
              Proyek undangan sudah terhubung di Studio. Jika Anda mengganti template, sistem akan langsung memperbarui tema desain sambil tetap mempertahankan data nama mempelai dan rincian acara.
            </span>
          </p>
        ) : null}
      </div>

      {/* Form Ubah Template */}
      <form onSubmit={handleApply} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#2C221E] mb-1.5 flex items-center gap-1.5">
            <IconLayers size={14} className="text-[#84633F]" />
            <span>Pilih Master Template Pengganti</span>
          </label>
          <div className="relative">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={isPending}
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-medium text-[#2C221E] outline-none shadow-2xs transition focus:border-[#84633F] focus:ring-1 focus:ring-[#84633F] disabled:opacity-50"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.versionNo ? `(v${tpl.versionNo})` : ""}
                  {tpl.category ? ` • ${tpl.category}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <IconCheckCircle size={15} />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-stone-500">
            {isChanged
              ? `Akan mengganti template menjadi: ${selectedTemplate?.name}`
              : "Pilih template lain di atas jika ingin mengganti desain."}
          </p>

          <button
            type="submit"
            disabled={!isChanged || isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#664624] hover:bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span>Menyimpan Perubahan...</span>
            ) : (
              <>
                <span>Terapkan Master Template</span>
                <IconArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </article>
  );
}
