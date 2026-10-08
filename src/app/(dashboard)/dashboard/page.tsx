import type { Metadata } from "next";
import Link from "next/link";
import { and, gte, lte, sql, eq } from "drizzle-orm";
import { listAll } from "@/features/invitations/api";
import type { InvitationSummary } from "@/features/invitations/types";
import { listLibrary } from "@/features/templates/api";
import type { TemplateSummary } from "@/features/templates/types";
import { getWorkspaceContext } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { invitations, templates as templatesTable, rsvps } from "@/lib/db/schema";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
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
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const [
    templates,
    invitationsData,
    invitationMonthRows,
    templateMonthRows,
    rsvpStatsRows,
  ] = active
    ? await Promise.all([
        listLibrary(active.workspace.id),
        listAll(active.workspace.id),
        db
          .select({
            monthNum: sql<number>`extract(month from ${invitations.createdAt})::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(invitations)
          .where(
            and(
              eq(invitations.workspaceId, active.workspace.id),
              gte(invitations.createdAt, startOfYear),
              lte(invitations.createdAt, endOfYear),
            ),
          )
          .groupBy(sql`extract(month from ${invitations.createdAt})`),
        db
          .select({
            monthNum: sql<number>`extract(month from ${templatesTable.createdAt})::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(templatesTable)
          .where(
            and(
              eq(templatesTable.workspaceId, active.workspace.id),
              gte(templatesTable.createdAt, startOfYear),
              lte(templatesTable.createdAt, endOfYear),
            ),
          )
          .groupBy(sql`extract(month from ${templatesTable.createdAt})`),
        db
          .select({
            totalRsvps: sql<number>`count(*)::int`,
            attendingCount: sql<number>`coalesce(sum(case when ${rsvps.response} = 'attending' then 1 else 0 end), 0)::int`,
            totalPartyGuests: sql<number>`coalesce(sum(case when ${rsvps.response} = 'attending' then ${rsvps.partySize} else 0 end), 0)::int`,
          })
          .from(rsvps)
          .innerJoin(invitations, eq(invitations.id, rsvps.invitationId))
          .where(eq(invitations.workspaceId, active.workspace.id)),
      ])
    : [
        [],
        [],
        [],
        [],
        [{ totalRsvps: 0, attendingCount: 0, totalPartyGuests: 0 }],
      ];

  const rsvpStats = rsvpStatsRows[0] ?? { totalRsvps: 0, attendingCount: 0, totalPartyGuests: 0 };

  // Template Metrics
  const publishedTemplates = templates.filter((t) => t.publishedVersionNo !== null).length;
  const draftTemplates = templates.length - publishedTemplates;
  const templateReadyPercent =
    templates.length > 0 ? Math.round((publishedTemplates / templates.length) * 100) : 0;

  // Invitation Metrics
  const totalInvitations = invitationsData.length;
  const publishedInvitations = invitationsData.filter((i) => i.status === "published").length;
  const draftInvitations = invitationsData.filter((i) => i.status === "draft").length;
  const archivedInvitations = invitationsData.filter((i) => i.status === "archived").length;

  const publishedPercent = totalInvitations > 0 ? Math.round((publishedInvitations / totalInvitations) * 100) : 0;
  const draftPercent = totalInvitations > 0 ? Math.round((draftInvitations / totalInvitations) * 100) : 0;
  const archivedPercent = totalInvitations > 0 ? Math.round((archivedInvitations / totalInvitations) * 100) : 0;

  const recentTemplates = [...templates].sort(byUpdated).slice(0, 5);
  const recentInvitations = [...invitationsData].sort(byUpdated).slice(0, 5);

  // SVG Geometry for Donut Chart
  const C = 251.327; // 2 * PI * 40
  const pubLen = totalInvitations > 0 ? (publishedInvitations / totalInvitations) * C : 0;
  const draftLen = totalInvitations > 0 ? (draftInvitations / totalInvitations) * C : 0;
  const archLen = totalInvitations > 0 ? (archivedInvitations / totalInvitations) * C : 0;

  // Monthly labels Jan - Des
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const currentMonthIdx = new Date().getMonth(); // 0-indexed

  const invCounts = new Map<number, number>();
  for (const r of invitationMonthRows) {
    invCounts.set(r.monthNum, r.count);
  }

  const tplCounts = new Map<number, number>();
  for (const r of templateMonthRows) {
    tplCounts.set(r.monthNum, r.count);
  }

  const monthlyData = monthLabels.map((lbl, idx) => {
    const month = idx + 1;
    const invCount = invCounts.get(month) ?? 0;
    const tplCount = tplCounts.get(month) ?? 0;
    const totalActivity = invCount + tplCount;
    return {
      month,
      label: lbl,
      invitations: invCount,
      templates: tplCount,
      value: totalActivity,
    };
  });

  const totalYearActivity = monthlyData.reduce((sum, m) => sum + m.value, 0);
  const maxMonthlyVal = Math.max(...monthlyData.map((m) => m.value), 0);

  const defaultMonth = monthlyData[0] ?? {
    month: 1,
    label: "Jan",
    invitations: 0,
    templates: 0,
    value: 0,
  };

  const peakMonth = monthlyData.reduce(
    (max, curr) => (curr.value > max.value ? curr : max),
    defaultMonth,
  );

  return (
    <div className="space-y-6">
      {/* 1. Hero Workspace Banner */}
      <DashboardHeroHeader
        eyebrow={`WORKSPACE • ${active?.workspace.name?.toUpperCase() ?? "DEV WORKSPACE"}`}
        title="Dashboard Workspace"
        description={
          <>
            Selamat datang, <strong className="text-[#D4AF37] font-bold">{user.name}</strong>. Kelola desain template, terbitkan website undangan pernikahan digital eksklusif, dan pantau respons tamu (RSVP) secara presisi.
          </>
        }
        actions={
          active ? (
            <>
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
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md hover:bg-[#BD9B2F] transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Undangan Baru</span>
              </Link>
            </>
          ) : undefined
        }
      />

      {!active && (
        <div
          data-testid="no-workspace"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 shadow-xs"
        >
          Akun Anda belum tergabung di workspace mana pun. Hubungi admin untuk diundang ke workspace tim.
        </div>
      )}

      {/* 2. Metric KPI Cards Grid */}
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
            <span className="font-semibold text-stone-600">{draftTemplates} draft · {publishedTemplates} terbit</span>
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
            <span className="text-stone-400">Rasio siap pakai</span>
            <span className="font-semibold text-emerald-600">{templateReadyPercent}% terverifikasi</span>
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
              {totalInvitations}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
              Online
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px]">
            <span className="text-stone-400">Status pengerjaan</span>
            <span className="font-semibold text-stone-600">{publishedInvitations} live · {draftInvitations} draft</span>
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
            <span className="text-stone-400">Respons tamu RSVP</span>
            <span className="font-semibold text-stone-600">
              {rsvpStats.totalRsvps > 0
                ? `${rsvpStats.totalRsvps} respons (${rsvpStats.attendingCount} hadir)`
                : `${publishedPercent}% rasio publish`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Analytics Chart & Volume Trends */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Donut Chart (Distribusi Status Undangan) */}
        <div className="lg:col-span-5 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Distribusi Status Undangan</h3>
                <p className="text-xs text-stone-400 mt-0.5">Perbandingan status undangan dalam workspace</p>
              </div>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                {totalInvitations} Total
              </span>
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
                  {/* Published Ring (Emerald Green) */}
                  {pubLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#15803D"
                      strokeWidth="14"
                      strokeDasharray={`${pubLen} ${C - pubLen}`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  )}
                  {/* Draft Ring (Gold/Amber #D4AF37) */}
                  {draftLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="14"
                      strokeDasharray={`${draftLen} ${C - draftLen}`}
                      strokeDashoffset={-pubLen}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  )}
                  {/* Archived Ring (Stone) */}
                  {archLen > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#A8A29E"
                      strokeWidth="14"
                      strokeDasharray={`${archLen} ${C - archLen}`}
                      strokeDashoffset={-(pubLen + draftLen)}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  )}
                </svg>
                {/* Center Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-[#2C221E] leading-tight">
                    {totalInvitations}
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
              <span className="font-semibold text-[#2C221E]">{publishedInvitations} ({publishedPercent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                <span className="text-stone-700 font-medium">Draft</span>
              </div>
              <span className="font-semibold text-[#2C221E]">{draftInvitations} ({draftPercent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-stone-400" />
                <span className="text-stone-700 font-medium">Diarsipkan</span>
              </div>
              <span className="font-semibold text-[#2C221E]">{archivedInvitations} ({archivedPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Right: Annual Bar Chart (Tren Pembuatan & Volume Tahunan) */}
        <div className="lg:col-span-7 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#2C221E]">
                    Tren Aktivitas Desain & Pembuatan
                  </h3>
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                    {currentYear}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Volume projek bulanan (Jan – Des {currentYear})
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                <span>Total {totalYearActivity} projek dibuat</span>
              </div>
            </div>

            {/* 12 Months Bar Chart */}
            <div className="mt-8 flex h-48 items-end justify-between gap-1 sm:gap-2 px-1">
              {monthlyData.map((item, idx) => {
                const isPeak = maxMonthlyVal > 0 && item.value === maxMonthlyVal;
                const isCurrentMonth = idx === currentMonthIdx;
                const heightPercent =
                  maxMonthlyVal > 0
                    ? item.value > 0
                      ? Math.max(16, Math.round((item.value / maxMonthlyVal) * 100))
                      : 6
                    : isCurrentMonth
                      ? 10
                      : 6;

                return (
                  <div
                    key={item.label}
                    className="flex flex-1 flex-col items-center h-full justify-end group cursor-pointer"
                    title={`${item.label} ${currentYear}: ${item.value} projek (${item.invitations} undangan, ${item.templates} template)`}
                  >
                    {item.value > 0 ? (
                      <span className="text-[10px] font-bold text-[#2C221E] leading-none mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.value}
                      </span>
                    ) : null}

                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                          isPeak
                            ? "bg-gradient-to-t from-[#84633F] via-[#D4AF37] to-[#F3C74D] shadow-sm group-hover:brightness-110"
                            : item.value > 0
                              ? "bg-gradient-to-t from-stone-400 via-[#84633F]/70 to-[#D4AF37] shadow-2xs group-hover:brightness-110"
                              : "bg-[#EAE8E5] group-hover:bg-stone-300"
                        }`}
                      />
                    </div>
                    <span
                      className={`mt-2 text-[10.5px] ${
                        isPeak || isCurrentMonth ? "font-bold text-[#2C221E]" : "text-stone-400 font-medium"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isCurrentMonth && (
                      <span className="h-1 w-1 rounded-full bg-[#D4AF37] mt-0.5" title="Bulan Berjalan" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs">
            <div className="flex items-center gap-2 text-stone-600">
              <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
              <span className="text-[11.5px]">
                {peakMonth && peakMonth.value > 0
                  ? `Puncak: Bulan ${peakMonth.label} (${peakMonth.value} projek) · Total ${totalYearActivity} projek tahun ${currentYear}`
                  : `Belum ada projek dibuat pada tahun ${currentYear} · Buat template atau undangan baru untuk melihat grafik volume.`}
              </span>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-bold text-[#2C221E] hover:text-[#D4AF37] transition-colors"
            >
              Lihat Semua Undangan →
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
                <span className="flex h-2 w-2 rounded-full bg-[#D4AF37]" />
                <h3 className="text-sm font-bold text-[#2C221E]">Undangan Terbaru</h3>
              </div>
              <p className="text-[11.5px] text-stone-400 mt-0.5">
                Projek undangan yang baru saja disunting di workspace
              </p>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#BD9B2F] transition-colors"
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/70 text-xs font-bold text-[#D4AF37] shadow-2xs">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-[#2C221E] font-semibold truncate">
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
                <span className="flex h-2 w-2 rounded-full bg-[#84633F]" />
                <h3 className="text-sm font-bold text-[#2C221E]">Template Desain Terbaru</h3>
              </div>
              <p className="text-[11.5px] text-stone-400 mt-0.5">
                Katalog master template yang tersimpan dalam pustaka
              </p>
            </div>
            <Link
              href="/dashboard/templates"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#BD9B2F] transition-colors"
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4EDE4] border border-[#84633F]/30 text-xs font-bold text-[#84633F] shadow-2xs">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-[#2C221E] font-semibold truncate">
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
