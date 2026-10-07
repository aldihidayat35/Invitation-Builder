"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActionState, InvitationAction } from "./action-state";

export interface PublishedTemplateOption {
  readonly id: string;
  readonly name: string;
  readonly versionNo: number;
}

export function CreateInvitationForm({
  workspaceId,
  templates,
  action,
}: {
  workspaceId: string;
  templates: readonly PublishedTemplateOption[];
  action: InvitationAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [isOpen, setIsOpen] = useState(true);

  if (templates.length === 0) {
    return (
      <div
        data-testid="no-published-template"
        className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-6 text-amber-950 shadow-xs"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-lg">
            ⚠️
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900">
              Belum Ada Template yang Dipublish
            </h3>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              Undangan digital dibuat dari template master yang sudah berstatus dipublish. Silakan
              publish minimal satu template master terlebih dahulu di halaman Template Library.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/templates"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84633F] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#715332]"
              >
                <span>Buka Template Library</span>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="create-invitation-heading"
      className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs transition-all"
    >
      {/* Decorative Warm Luxury Gradient Accent */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#84633F] via-[#D4AF37] to-[#84633F]" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-[#84633F]">
              ✨
            </span>
            <h2 id="create-invitation-heading" className="text-base font-bold text-[#2C221E]">
              Buat Undangan Digital Baru
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Pilih template master yang telah dipublish dan tentukan judul undangan mempelai.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#84633F] hover:text-[#715332]"
        >
          <span>{isOpen ? "Tutup Form" : "Buka Form"}</span>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <form action={formAction} className="mt-5 space-y-4" aria-label="Buat undangan baru">
          <input type="hidden" name="workspaceId" value={workspaceId} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Field: Template Selection */}
            <div>
              <label
                htmlFor="new-invitation-template"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Pilih Master Template <span className="text-rose-500">*</span>
              </label>
              <select
                id="new-invitation-template"
                name="templateId"
                required
                defaultValue=""
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-xs font-medium text-[#2C221E] transition focus:border-[#84633F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]/30"
              >
                <option value="" disabled>
                  Pilih master template…
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} (Versi {template.versionNo})
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Title */}
            <div>
              <label
                htmlFor="new-invitation-title"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Judul Undangan Mempelai <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-invitation-title"
                name="title"
                type="text"
                required
                maxLength={120}
                placeholder="mis. Pernikahan Anin &amp; Raka"
                autoComplete="off"
                aria-invalid={state.error ? true : undefined}
                aria-describedby={state.error ? "create-invitation-error" : undefined}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-xs text-[#2C221E] transition focus:border-[#84633F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </div>
          </div>

          {/* Action Row & Error Banner */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-stone-400">
              💡 Setelah dibuat, Anda dapat langsung melengkapi data mempelai, jadwal acara, dan daftar tamu.
            </p>

            <button
              id="create-invitation-submit"
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#84633F] to-[#715332] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {pending ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Membuat Undangan…</span>
                </>
              ) : (
                <>
                  <span>Buat Undangan Sekarang</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {state.error && (
            <div
              id="create-invitation-error"
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-medium text-rose-800 shadow-2xs"
            >
              ⚠️ {state.error}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
