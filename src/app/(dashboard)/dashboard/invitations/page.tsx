import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listAll, permissionsFor } from "@/features/invitations/api";
import { CreateInvitationForm } from "@/features/invitations/components/CreateInvitationForm";
import { InvitationsView } from "@/features/invitations/components/InvitationsView";
import { KpiStatCard } from "@/features/analytics";
import { listLibrary } from "@/features/templates/api";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getWorkspaceContext } from "@/lib/auth/server";
import { createInvitationAction, deleteInvitationAction, restoreInvitationAction } from "./actions";

export const metadata: Metadata = {
  title: "Kelola Undangan Digital | Dashboard",
  description: "Kelola dan publikasikan undangan digital pernikahan dan acara Anda dengan mudah.",
};

export default async function InvitationsPage({
  searchParams,
}: PageProps<"/dashboard/invitations">) {
  const params = await searchParams;
  const archivedView = params.view === "archived";
  const { user, active } = await getWorkspaceContext();
  if (user.systemRole === "reseller") redirect("/dashboard/reseller");
  const isProductionOwner = user.systemRole === "owner";

  if (!active) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#2C221E]">Undangan</h1>
        <div
          className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-xs"
          data-testid="no-workspace"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-bold text-[#2C221E]">Workspace Belum Terhubung</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
            Akun Anda belum tergabung di workspace mana pun. Hubungi pemilik akun atau administrator
            untuk mendapatkan undangan akses.
          </p>
        </div>
      </main>
    );
  }

  const workspaceId = active.workspace.id;
  const [activeInvitations, archivedInvitations, permissions, templates] = await Promise.all([
    listAll(workspaceId, { archived: false }),
    listAll(workspaceId, { archived: true }),
    permissionsFor(workspaceId),
    isProductionOwner ? listLibrary(workspaceId) : Promise.resolve([]),
  ]);

  const allInvitations = isProductionOwner
    ? [...activeInvitations, ...archivedInvitations]
    : activeInvitations;

  const published = templates
    .filter((template) => template.publishedVersionNo !== null)
    .map((template) => ({
      id: template.id,
      name: template.name,
      versionNo: template.publishedVersionNo ?? 0,
    }));

  // Analytics Metrics
  const totalCount = allInvitations.length;
  const publishedCount = activeInvitations.filter((i) => i.status === "published").length;
  const draftCount = activeInvitations.filter((i) => i.status === "draft").length;
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Executive Hero Header Section */}
      <DashboardHeroHeader
        eyebrow={`WORKSPACE • ${active.workspace.name.toUpperCase()}`}
        title={isProductionOwner ? "Kelola Undangan Digital" : "Undangan Saya"}
        description={
          isProductionOwner
            ? "Undangan digital adalah salinan kustomisasi dari template master untuk satu acara klien. Atur data mempelai, jadwalkan acara, kelola daftar tamu VIP, dan pantau status RSVP real-time."
            : "Lengkapi informasi acara, periksa preview, kelola daftar tamu, dan pantau RSVP. Desain serta publikasi ditangani oleh tim produksi."
        }
        actions={
          isProductionOwner ? (
            <Link
              href="/dashboard/templates"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span>Template Library ({published.length} Siap)</span>
            </Link>
          ) : null
        }
      />

      {/* KPI Metric Cards */}
      <section
        aria-label="Ringkasan Statistik Undangan"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiStatCard
          title="TOTAL UNDANGAN"
          value={totalCount}
          tone="bronze"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <KpiStatCard
          title="DIPUBLISH (LIVE)"
          value={publishedCount}
          tone="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <KpiStatCard
          title="DRAFT AKTIF"
          value={draftCount}
          tone="gold"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          }
        />

        {isProductionOwner ? (
          <KpiStatCard
            title="TEMPLATE MASTER SIAP"
            value={published.length}
            tone="default"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            }
          />
        ) : null}
      </section>

      {/* Workflow Step Guide */}
      <section
        aria-label="Panduan Alur Kerja Undangan"
        className="rounded-2xl border border-stone-200/90 bg-gradient-to-br from-stone-50/70 via-white to-amber-50/30 p-5 shadow-xs"
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#84633F] text-[10px] font-bold text-white">
              i
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#84633F]">
              {isProductionOwner
                ? "Alur Pengelolaan Undangan Digital"
                : "Alur Penyelesaian Undangan Anda"}
            </h3>
          </div>
          <span className="text-[11px] font-medium text-stone-400">3 Langkah Mudah</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-stone-200/60 bg-white/80 p-3.5 transition hover:border-[#D4AF37]/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-[#84633F]">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#2C221E]">
                {isProductionOwner ? "Pilih Master Template" : "Lengkapi Data Acara"}
              </h4>
              <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                {isProductionOwner
                  ? "Pilih desain master yang sudah dipublish untuk di-clone ke acara klien."
                  : "Isi nama mempelai, jadwal, lokasi, cerita, dan foto yang akan ditampilkan."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-stone-200/60 bg-white/80 p-3.5 transition hover:border-[#D4AF37]/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-[#84633F]">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#2C221E]">
                {isProductionOwner ? "Isi Data Acara & Tamu" : "Periksa Preview"}
              </h4>
              <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                {isProductionOwner
                  ? "Lengkapi nama mempelai, jadwal acara, lokasi, dan daftar tamu yang diundang."
                  : "Periksa kembali isi dan tampilan undangan sebelum meminta tim menerbitkannya."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-stone-200/60 bg-white/80 p-3.5 transition hover:border-[#D4AF37]/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-[#84633F]">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#2C221E]">
                {isProductionOwner ? "Publish & Bagikan Link" : "Kelola Tamu & RSVP"}
              </h4>
              <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                {isProductionOwner
                  ? "Publish undangan ke publik, kirim link via WhatsApp, dan pantau respons RSVP live."
                  : "Tambahkan tamu, bagikan tautan yang sudah live, dan pantau konfirmasi kehadiran."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Create Invitation Form Section (if permitted) */}
      {isProductionOwner && permissions.write && (
        <CreateInvitationForm
          workspaceId={workspaceId}
          templates={published}
          action={createInvitationAction}
        />
      )}

      {/* Interactive Invitations View (Search, Filter Tabs, Sort, Grid & Table Toggle) */}
      <section aria-label="Daftar Undangan">
        <InvitationsView
          invitations={allInvitations}
          initialStatus={isProductionOwner && archivedView ? "archived" : "published"}
          emptyMessage={
            isProductionOwner
              ? "Belum ada undangan yang dibuat. Silakan pilih template master dan buat undangan baru di atas."
              : "Proyek undangan Anda belum tersedia. Hubungi tim yang menangani pesanan Anda."
          }
          canWrite={isProductionOwner && permissions.write}
          deleteAction={deleteInvitationAction}
          restoreAction={restoreInvitationAction}
        />
      </section>
    </main>
  );
}
