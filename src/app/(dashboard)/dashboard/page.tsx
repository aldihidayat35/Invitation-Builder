import type { Metadata } from "next";
import Link from "next/link";
import { listAll } from "@/features/invitations/api";
import type { InvitationSummary } from "@/features/invitations/types";
import { listLibrary } from "@/features/templates/api";
import type { TemplateSummary } from "@/features/templates/types";
import { KpiStatCard, StatusDonutChart, MonthlyTrendBarChart } from "@/features/analytics";
import { getWorkspaceContext } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { getMonthlyOrderTrends } from "@/lib/db/repositories/orders";
import { IconArrowRight, IconInvitation, IconPlus, IconTemplate } from "./nav-icons";

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
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/80",
    dotClass: "bg-slate-400",
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
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/80",
    dotClass: "bg-slate-400",
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
  const draftTemplates = templates.filter((t) => t.lifecycle === "draft").length;
  const publishedInvitations = invitations.filter((i) => i.status === "published").length;
  const draftInvitations = invitations.filter((i) => i.status === "draft").length;
  const archivedInvitations = invitations.filter((i) => i.status === "archived").length;

  const recentTemplates = [...templates].sort(byUpdated).slice(0, 5);
  const recentInvitations = [...invitations].sort(byUpdated).slice(0, 5);

  const invitationDonutSegments = [
    { label: "Dipublish", value: publishedInvitations, color: "#059669" },
    { label: "Draft", value: draftInvitations, color: "#D97706" },
    { label: "Diarsipkan", value: archivedInvitations, color: "#64748B" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Hero Welcome & Creation Banner (Stitch Spec) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-white to-amber-50/40 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-[11px] font-bold text-amber-900 tracking-wide uppercase mb-2 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D97706] animate-pulse" />
              <span>{active ? `Workspace · ${active.workspace.name}` : "Studio Platform Undangan"}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B]">
              Studio Dashboard Workspace
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Selamat datang kembali, <strong className="text-slate-900 font-semibold">{user.name}</strong>. Kelola desain template, buat website undangan pernikahan digital, dan pantau konfirmasi kehadiran tamu (RSVP) secara realtime.
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {publishedInvitations} Undangan Dipublish
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {publishedTemplates} Template Siap Pakai
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {invitations.length} Total Projek
              </span>
            </div>
          </div>

          {active && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/dashboard/templates"
                id="open-template-library"
                className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-amber-300 hover:bg-amber-50/40 hover:text-slate-900"
              >
                <IconPlus />
                <span>Katalog Template</span>
              </Link>
              <Link
                href="/dashboard/invitations"
                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#D97706] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#B45309] hover:shadow-md"
              >
                <IconPlus />
                <span>Buat Undangan Baru</span>
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

      {/* 2. Metric KPI Cards Grid (30px bold numeral & domain badge pills) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          title="Total Template Desain"
          value={templates.length}
          tone="gold"
          subtitle={`${publishedTemplates} template siap pakai`}
          icon={<IconTemplate />}
        />

        <KpiStatCard
          title="Template Siap Pakai"
          value={publishedTemplates}
          tone="bronze"
          subtitle={`${draftTemplates} template dalam draft`}
          icon={<IconTemplate />}
        />

        <KpiStatCard
          title="Total Website Undangan"
          value={invitations.length}
          tone="default"
          subtitle={`${publishedInvitations} telah dipublish`}
          icon={<IconInvitation />}
        />

        <KpiStatCard
          title="Undangan Sudah Terbit"
          value={publishedInvitations}
          tone="emerald"
          subtitle={`${draftInvitations} undangan masih draft`}
          icon={<IconInvitation />}
        />
      </div>

      {/* 3. Analytics Chart & Volume Trends */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StatusDonutChart
            title="Distribusi Status Undangan"
            subtitle="Perbandingan undangan terbit vs draft"
            segments={invitationDonutSegments}
            totalLabel="Undangan"
          />
        </div>

        <div className="lg:col-span-2">
          <MonthlyTrendBarChart
            title="Tren Pemesanan & Pembuatan Tahunan"
            subtitle={`Grafik volume bulan per bulan (Jan – Des ${currentYear})`}
            data={monthlyTrends}
            year={currentYear}
            valueSuffix=" undangan"
          />
        </div>
      </div>

      {/* 4. Recent Work Tables (Stitch Partner & Storefront Table Style) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Table: Undangan Terbaru */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50/70 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#D97706]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Undangan Terbaru</h3>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-0.5">
                Projek undangan yang baru saja disunting di workspace
              </p>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-bold text-[#D97706] hover:text-[#B45309] transition-colors"
            >
              Lihat Semua →
            </Link>
          </div>

          {recentInvitations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <p className="font-medium text-slate-500">Belum ada undangan dibuat.</p>
              <p className="mt-1">Klik tombol &quot;Buat Undangan Baru&quot; di atas untuk memulai.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {recentInvitations.map((inv) => {
                const cfg = INVITATION_STATUS[inv.status] ?? {
                  label: inv.status,
                  badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
                  dotClass: "bg-slate-400",
                };

                const initialChar = inv.title.trim().charAt(0).toUpperCase() || "U";

                return (
                  <li key={inv.id}>
                    <Link
                      href={`/dashboard/invitations/${inv.id}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-[#FAF7F2] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Monogram Identity Square (Stitch Spec) */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/70 text-xs font-bold text-[#D97706] shadow-2xs">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-slate-800 font-semibold truncate">
                            {inv.title}
                          </strong>
                          <span className="text-[11px] text-slate-400">
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
                        <span className="text-slate-400 group-hover:text-slate-700">
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
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50/70 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#CA8A04]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Template Desain Terbaru</h3>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-0.5">
                Katalog master template yang tersimpan dalam pustaka
              </p>
            </div>
            <Link
              href="/dashboard/templates"
              className="text-xs font-bold text-[#D97706] hover:text-[#B45309] transition-colors"
            >
              Buka Katalog →
            </Link>
          </div>

          {recentTemplates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <p className="font-medium text-slate-500">Belum ada template terdaftar.</p>
              <p className="mt-1">Buat desain template di kanvas editor.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {recentTemplates.map((tpl) => {
                const cfg = TEMPLATE_STATUS[tpl.lifecycle] ?? {
                  label: tpl.lifecycle,
                  badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
                  dotClass: "bg-slate-400",
                };

                const initialChar = tpl.name.trim().charAt(0).toUpperCase() || "T";

                return (
                  <li key={tpl.id}>
                    <Link
                      href={`/dashboard/templates/${tpl.id}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-[#FAF7F2] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Monogram Identity Square (Stitch Spec) */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 border border-yellow-200/70 text-xs font-bold text-[#CA8A04] shadow-2xs">
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-slate-800 font-semibold truncate">
                            {tpl.name}
                          </strong>
                          <span className="text-[11px] text-slate-400">
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
                        <span className="text-slate-400 group-hover:text-slate-700">
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
