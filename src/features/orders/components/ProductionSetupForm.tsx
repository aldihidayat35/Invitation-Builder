"use client";

import { useMemo, useState } from "react";

interface ClientOption {
  id: string;
  name: string;
  email: string;
  workspaces: Array<{ id: string; name: string }>;
}

export function ProductionSetupForm({
  orderId,
  workspaces: customWorkspaces,
  clients,
  assignees,
  templates,
  currentTemplateId,
  action,
}: {
  orderId: string;
  workspaces?: Array<{ id: string; name: string }>;
  clients?: ClientOption[];
  assignees: Array<{ id: string; name: string; email: string }>;
  templates: Array<{ id: string; name: string; versionNo: number | null }>;
  currentTemplateId?: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const availableWorkspaces = useMemo(() => {
    if (customWorkspaces && customWorkspaces.length > 0) return customWorkspaces;
    if (clients) {
      return clients.flatMap((c) => c.workspaces);
    }
    return [];
  }, [customWorkspaces, clients]);

  // Format default date: 7 days from now formatted for datetime-local
  const getDefaultDueDate = (daysAhead: number) => {
    const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [dueDate, setDueDate] = useState(() => getDefaultDueDate(7));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetClick = (days: number) => {
    setDueDate(getDefaultDueDate(days));
  };

  return (
    <div className="space-y-4">
      {/* Educational Guide Card */}
      <div className="rounded-xl border border-amber-200/80 bg-[#FAF8F5] p-4 text-xs text-stone-700">
        <h4 className="font-bold text-[#664624] flex items-center gap-1.5 text-sm">
          <span>💡</span> Panduan Konfigurasi Produksi
        </h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-2.5 border border-[#EBDCCB]">
            <strong className="block text-[#2C221E] font-semibold">1. Workspace Produksi</strong>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Folder ruang kerja digital tempat file proyek disimpan (disarankan pilih Workspace Utama).
            </p>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-[#EBDCCB]">
            <strong className="block text-[#2C221E] font-semibold">2. Master Template</strong>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Desain awal yang akan diduplikasi. Versi yang sedang terbit akan otomatis dikunci.
            </p>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-[#EBDCCB]">
            <strong className="block text-[#2C221E] font-semibold">3. Penanggung Jawab</strong>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Staf/desainer yang bertugas mendesain undangan dan memasukkan data mempelai di editor.
            </p>
          </div>
        </div>
      </div>

      <form
        action={async (formData) => {
          setIsSubmitting(true);
          try {
            await action(formData);
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <input type="hidden" name="orderId" value={orderId} />

        {/* Workspace Field */}
        <label className="grid gap-1.5 text-xs font-semibold text-[#2C221E]">
          <span className="flex items-center justify-between">
            <span>Workspace Produksi <span className="text-rose-600">*</span></span>
            <span className="text-[10px] text-stone-400 font-normal">Ruang kerja tempat proyek dibuat</span>
          </span>
          <select
            name="workspaceId"
            defaultValue={availableWorkspaces[0]?.id ?? ""}
            required
            className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-xs text-[#2C221E] shadow-2xs outline-none focus:border-[#84633F]"
          >
            <option value="">Pilih workspace produksi</option>
            {availableWorkspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        {/* Template Field */}
        <label className="grid gap-1.5 text-xs font-semibold text-[#2C221E]">
          <span className="flex items-center justify-between">
            <span>Master Template Desain <span className="text-rose-600">*</span></span>
            <span className="text-[10px] text-stone-400 font-normal">Versi terbit dikunci otomatis</span>
          </span>
          <select
            name="templateId"
            defaultValue={currentTemplateId ?? ""}
            required
            className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-xs text-[#2C221E] shadow-2xs outline-none focus:border-[#84633F]"
          >
            <option value="">Pilih template desain</option>
            {templates
              .filter((template) => template.versionNo !== null)
              .map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · versi {template.versionNo}
                </option>
              ))}
          </select>
        </label>

        {/* Assignee Field */}
        <label className="grid gap-1.5 text-xs font-semibold text-[#2C221E]">
          <span className="flex items-center justify-between">
            <span>Penanggung Jawab Desainer <span className="text-rose-600">*</span></span>
            <span className="text-[10px] text-stone-400 font-normal">Staf yang mengerjakan</span>
          </span>
          <select
            name="assigneeId"
            defaultValue={assignees[0]?.id ?? ""}
            required
            className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-xs text-[#2C221E] shadow-2xs outline-none focus:border-[#84633F]"
          >
            <option value="">Pilih penanggung jawab</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name} ({assignee.email})
              </option>
            ))}
          </select>
        </label>

        {/* Target Deadline Field with Quick Presets */}
        <div className="grid gap-1.5 text-xs font-semibold text-[#2C221E]">
          <div className="flex items-center justify-between">
            <span>Target Selesai (Deadline) <span className="text-rose-600">*</span></span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePresetClick(3)}
                className="rounded-md border border-[#D9CFC4] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#664624] hover:bg-[#FAF8F5]"
              >
                +3 Hari
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick(7)}
                className="rounded-md border border-[#D9CFC4] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#664624] hover:bg-[#FAF8F5]"
              >
                +7 Hari
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick(14)}
                className="rounded-md border border-[#D9CFC4] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#664624] hover:bg-[#FAF8F5]"
              >
                +14 Hari
              </button>
            </div>
          </div>
          <input
            type="datetime-local"
            name="dueAt"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-xs text-[#2C221E] shadow-2xs outline-none focus:border-[#84633F]"
          />
        </div>

        {/* Internal Notes */}
        <label className="grid gap-1.5 text-xs font-semibold text-[#2C221E] sm:col-span-2">
          <span>Catatan Internal Produksi <span className="text-stone-400 font-normal">(Opsional)</span></span>
          <textarea
            name="adminNotes"
            rows={2}
            className="rounded-xl border border-stone-200 bg-white p-3 text-xs text-[#2C221E] shadow-2xs outline-none focus:border-[#84633F]"
            placeholder="Brief desain, catatan khusus calon pengantin, atau prioritas pengerjaan..."
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-xl bg-[#84633F] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#664624] transition disabled:opacity-50 sm:col-span-2 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>Menyimpan Konfigurasi Produksi…</span>
          ) : (
            <span>Simpan Konfigurasi Produksi & Kunci Template ✓</span>
          )}
        </button>
      </form>
    </div>
  );
}
