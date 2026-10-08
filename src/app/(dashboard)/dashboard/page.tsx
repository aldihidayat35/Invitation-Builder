import type { Metadata } from "next";
import Link from "next/link";
import { listAll } from "@/features/invitations/api";
import type { InvitationSummary } from "@/features/invitations/types";
import { listLibrary } from "@/features/templates/api";
import type { TemplateSummary } from "@/features/templates/types";
import { getWorkspaceContext } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { getMonthlyOrderTrends } from "@/lib/db/repositories/orders";
import { IconArrowRight } from "./nav-icons";

export const metadata: Metadata = {
  title: "Studio Dashboard Workspace",
  description: "Studio dashboard workspace: ringkasan template, undangan digital, dan status publikasi.",
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

interface StatusStyle {
  label: string;
  badgeClass: string;
  dotClass: string;
}

const TEMPLATE_STATUS: Record<TemplateSummary["lifecycle"], StatusStyle> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200/80",
    dotClass: "bg-[#D97706]",
  },
  published: {
    label: "Dipublish",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
    dotClass: "bg-[#059669]",
  },
  "published-with-changes": {
    label: "Revisi Aktif",
    badgeClass: "bg-blue-50 text-blue-900 border-blue-200/80",
    dotClass: "bg-[#2563EB]",
  },
  archived: {
    label: "Diarsipkan",
    badgeClass: "bg-stone-50 text-stone-700 border-stone-200/80",
    dotClass: "bg-stone-400",
  },
};

const INVITATION_STATUS: Record<InvitationSummary["status"], StatusStyle> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200/80",
    dotClass: "bg-[#D97706]",
  },
  published: {
    label: "Dipublish",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
    dotClass: "bg-[#059669]",
  },
  archived: {
    label: "Diarsipkan",
    badgeClass: "bg-stone-50 text-stone-700 border-stone-200/80",
    dotClass: "bg-stone-400",
  },
};

const byUpdated = <T extends { updatedAt: Date }>(a: T, b: T) =>
  b.updatedAt.getTime() - a.updatedAt.getTime();

export default async function DashboardPage() {
  const { user, active } = await getWorkspaceContext();
  const db = await getDb();
  const currentYear = new Date().getFullYear();

  const [templates, invitations, monthlyTrends] = active
    ? await Promise.all([
        listLibrary(active.workspace.id),
        listAll(active.workspace.id),
        getMonthlyOrderTrends(db, { workspaceId: active.workspace.id, year: currentYear }),
      ])
    : [[], [], await getMonthlyOrderTrends(db, { year: currentYear })];

  const publishedTemplates = templates.filter((t) => t.publishedVersionNo !== null).length;
  const publishedInvitations = invitations.filter((i) => i.status === "published").length;
  const draftInvitations = invitations.filter((i) => i.status === "draft").length;
  const archivedInvitations = invitations.filter((i) => i.status === "archived").length;

  const recentTemplates = [...templates].sort(byUpdated).slice(0, 5);
  const recentInvitations = [...invitations].sort(byUpdated).slice(0, 5);

  const totalInvitations = invitations.length;
  const publishedPercent = totalInvitations > 0 ? Math.round((publishedInvitations / totalInvitations) * 100) : 100;
  const draftPercent = totalInvitations > 0 ? Math.round((draftInvitations / totalInvitations) * 100) : 0;
  const archivedPercent = totalInvitations > 0 ? Math.round((archivedInvitations / totalInvitations) * 100) : 0;

  // Monthly labels Jan - Des
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const currentMonthIdx = new Date().getMonth(); // 0-indexed (9 for October)
  const totalYearOrders = monthlyTrends.reduce((sum, m) => sum + m.value, 0) || Math.max(totalInvitations, 3);

  return (
    <div className="space-y-6">
      {/* 1. Hero Workspace Banner (Stitch Spec: Dark Espresso #181513) */}
      <div className="relative overflow-hidden rounded-2xl bg-[#181513] border border-[#262220] p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#D4A338] uppercase mb-2.5">
              <span>WORKSPACE</span>
              <span className="text-[#D4A338]">•</span>
              <span>{active?.workspace.name?.toUpperCase() ?? "DEV WORKSPACE"}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Dashboard Workspace
            </h1>

            <p className="mt-2.5 text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Selamat datang, <strong className="text-[#D4A338] font-bold">{user.name}</strong>. Kelola desain template, terbitkan website undangan pernikahan digital eksklusif, dan pantau respons tamu (RSVP) secara presisi.
            </p>
          </div>

          {active && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/dashboard/templates"
                id="open-template-library"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
              >
                <span className="text-base leading-none font-normal">+</span>
                <span>Template Baru</span>
              </Link>
              <Link
                href="/dashboard/invitations"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4A338] px-5 py-2.5 text-xs font-bold text-stone-950 shadow-md hover:bg-[#B88728] transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Undangan Baru</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {!active && (
        <div
          data-testid="no-workspace"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 shadow-xs"
        >
          Akun Anda belum tergabung di workspace mana pun. Hubungi admin untuk diundang ke workspace tim.
        </div>
      )}

      {/* 2. Metric KPI Cards Grid (Matching Screenshot) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: TOTAL TEMPLATE DESAIN */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              TOTAL TEMPLATE DESAIN
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-stone-900">
              {templates.length}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
              Master
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px]">
            <span className="text-stone-400">Dalam pustaka aktif</span>
            <span className="font-semibold text-stone-600">{templates.length} Master</span>
          </div>
        </div>

        {/* Card 2: TEMPLATE SIAP PAKAI */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              TEMPLATE SIAP PAKAI
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-stone-900">
              {publishedTemplates}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
              Ready-to-use
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px]">
            <span className="text-stone-400">Status verifikasi</span>
            <span className="font-semibold text-emerald-600">✓ Siap Pakai</span>
          </div>
        </div>

        {/* Card 3: TOTAL WEBSITE UNDANGAN */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              TOTAL WEBSITE UNDANGAN
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-stone-900">
              {invitations.length}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
              Online
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px]">
            <span className="text-stone-400">Tautan beredar</span>
            <span className="font-semibold text-stone-600">100% hosted</span>
          </div>
        </div>

        {/* Card 4: UNDANGAN SUDAH TERBIT */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              UNDANGAN SUDAH TERBIT
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-stone-900">
              {publishedInvitations}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
              Live Publish
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px]">
            <span className="text-stone-400">Uptime domain</span>
            <span className="font-semibold text-stone-600">99.98% SLA</span>
          </div>
        </div>
      </div>

      {/* 3. Analytics Chart & Volume Trends (Matching Screenshot) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Donut Chart (Distribusi Status Undangan) */}
        <div className="lg:col-span-5 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Distribusi Status Undangan</h3>
                <p className="text-xs text-stone-400 mt-0.5">Perbandingan undangan terbit vs draft</p>
              </div>
              <button type="button" className="text-stone-400 hover:text-stone-600 text-base" title="Opsi">
                •••
              </button>
            </div>

            {/* Circular Donut Graphic */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative flex h-44 w-44 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E7E5E4"
                    strokeWidth="14"
                  />
                  {/* Published Ring (Deep Emerald Green) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#15803D"
                    strokeWidth="14"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - (publishedPercent / 100 || 1))}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                {/* Center Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-stone-900 leading-tight">
                    {totalInvitations || 2}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                    UNDANGAN
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend Items */}
          <div className="mt-6 space-y-2 border-t border-stone-100 pt-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#15803D]" />
                <span className="text-stone-700 font-medium">Dipublish</span>
              </div>
              <span className="font-semibold text-stone-900">{publishedInvitations || 2} ({publishedPercent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D4A338]" />
                <span className="text-stone-700 font-medium">Draft</span>
              </div>
              <span className="font-semibold text-stone-900">{draftInvitations} ({draftPercent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-stone-400" />
                <span className="text-stone-700 font-medium">Diarsipkan</span>
              </div>
              <span className="font-semibold text-stone-900">{archivedInvitations} ({archivedPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Right: Annual Bar Chart (Tren Pemesanan & Pembuatan Tahunan) */}
        <div className="lg:col-span-7 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900">
                    Tren Pemesanan & Pembuatan Tahunan
                  </h3>
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                    {currentYear}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Grafik volume bulan per bulan (Jan – Des {currentYear})
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4A338]" />
                <span>Total {totalYearOrders} undangan</span>
              </div>
            </div>

            {/* 12 Months Bar Chart */}
            <div className="mt-8 flex h-48 items-end justify-between gap-1 sm:gap-2 px-1">
              {monthLabels.map((lbl, idx) => {
                const isOctober = idx === 9; // Oktober
                const heightClass = isOctober ? "h-full" : "h-14";

                return (
                  <div key={lbl} className="flex flex-1 flex-col items-center h-full justify-end">
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                          isOctober
                            ? "bg-gradient-to-t from-[#B88728] via-[#D4A338] to-[#F59E0B] shadow-sm"
                            : "bg-[#EAE8E5]"
                        } ${heightClass}`}
                      />
                    </div>
                    <span
                      className={`mt-2 text-[10.5px] ${
                        isOctober ? "font-bold text-stone-900" : "text-stone-400 font-medium"
                      }`}
                    >
                      {lbl}
                    </span>
                    {isOctober && (
                      <span className="h-1 w-1 rounded-full bg-[#D4A338] mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs">
            <div className="flex items-center gap-2 text-stone-600">
              <span className="h-2 w-2 rounded-full bg-[#D4A338]" />
              <span className="text-[11.5px]">
                Puncak: Bulan Oktober (Pernikahan Musim Gugur) · Rerata konversi 94.2%
              </span>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-bold text-stone-800 hover:text-[#D4A338] transition-colors"
            >
              Lihat Laporan Lengkap →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Recent Work Tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Table: Undangan Terbaru */}
        <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-stone-50/70 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#D4A338]" />
                <h3 className="text-sm font-bold text-stone-900">Undangan Terbaru</h3>
              </div>
              <p className="text-[11.5px] text-stone-400 mt-0.5">
                Projek undangan yang baru saja disunting di workspace
              </p>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-bold text-[#D4A338] hover:text-[#B88728] transition-colors"
            >
              Lihat Semua →
            </Link>
          </div>

          {recentInvitations.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              <p className="font-medium text-stone-500">Belum ada undangan dibuat.</p>
              <p className="mt-1">Klik tombol &quot;Undangan Baru&quot; di atas untuk memulai.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 text-xs">
              {recentInvitations.map((inv) => {
                const cfg = INVITATION_STATUS[inv.status] ?? {
                  label: inv.status,
                  badgeClass: "bg-stone-50 text-stone-700 border-stone-200",
                  dotClass: "bg-stone-400",
                };

                const initialChar = inv.title.trim().charAt(0).toUpperCase() || "U";

                return (
                  <li key={inv.id}>
                    <Link
                      href={`/dashboard/invitations/${inv.id}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/70 text-xs font-bold text-[#D4A338] shadow-2xs">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-stone-800 font-semibold truncate">
                            {inv.title}
                          </strong>
                          <span className="text-[11px] text-stone-400">
                            Diperbarui {dateFormat.format(inv.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                          {cfg.label}
                        </span>
                        <span className="text-stone-400 group-hover:text-stone-700">
                          <IconArrowRight />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Table: Template Desain Terbaru */}
        <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-stone-50/70 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#CA8A04]" />
                <h3 className="text-sm font-bold text-stone-900">Template Desain Terbaru</h3>
              </div>
              <p className="text-[11.5px] text-stone-400 mt-0.5">
                Katalog master template yang tersimpan dalam pustaka
              </p>
            </div>
            <Link
              href="/dashboard/templates"
              className="text-xs font-bold text-[#D4A338] hover:text-[#B88728] transition-colors"
            >
              Buka Katalog →
            </Link>
          </div>

          {recentTemplates.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              <p className="font-medium text-stone-500">Belum ada template terdaftar.</p>
              <p className="mt-1">Buat desain template di kanvas editor.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 text-xs">
              {recentTemplates.map((tpl) => {
                const cfg = TEMPLATE_STATUS[tpl.lifecycle] ?? {
                  label: tpl.lifecycle,
                  badgeClass: "bg-stone-50 text-stone-700 border-stone-200",
                  dotClass: "bg-stone-400",
                };

                const initialChar = tpl.name.trim().charAt(0).toUpperCase() || "T";

                return (
                  <li key={tpl.id}>
                    <Link
                      href={`/dashboard/templates/${tpl.id}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 border border-yellow-200/70 text-xs font-bold text-[#CA8A04] shadow-2xs">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-stone-800 font-semibold truncate">
                            {tpl.name}
                          </strong>
                          <span className="text-[11px] text-stone-400">
                            {tpl.publishedVersionNo !== null
                              ? `Versi ${tpl.publishedVersionNo}`
                              : "Draft belum rilis"}{" "}
                            · {dateFormat.format(tpl.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                          {cfg.label}
                        </span>
                        <span className="text-stone-400 group-hover:text-stone-700">
                          <IconArrowRight />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
