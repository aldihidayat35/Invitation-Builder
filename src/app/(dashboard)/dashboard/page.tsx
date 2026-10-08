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
  title: "Dashboard Workspace",
  description: "Dashboard workspace: ringkasan template, undangan, dan status publikasi.",
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

const TEMPLATE_STATUS: Record<TemplateSummary["lifecycle"], { label: string; badgeClass: string }> = {
  draft: { label: "Draft", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" },
  published: { label: "Dipublish", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  "published-with-changes": { label: "Revisi Aktif", badgeClass: "bg-blue-100 text-blue-900 border-blue-300" },
  archived: { label: "Diarsipkan", badgeClass: "bg-stone-100 text-stone-600 border-stone-200" },
};

const INVITATION_STATUS: Record<InvitationSummary["status"], { label: string; badgeClass: string }> = {
  draft: { label: "Draft", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" },
  published: { label: "Dipublish", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  archived: { label: "Diarsipkan", badgeClass: "bg-stone-100 text-stone-600 border-stone-200" },
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
    { label: "Dipublish", value: publishedInvitations, color: "#257849" },
    { label: "Draft", value: draftInvitations, color: "#D4AF37" },
    { label: "Diarsipkan", value: archivedInvitations, color: "#8F7F74" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#84633F]">
            {active ? `Workspace · ${active.workspace.name}` : "Akun Personal"}
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#2C221E] sm:text-3xl">
            Dashboard Workspace
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Selamat datang, <strong>{user.name}</strong>. Kelola desain template, buat website undangan pernikahan digital, dan pantau konfirmasi tamu (RSVP).
          </p>
        </div>

        {active && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/templates"
              id="open-template-library"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50"
            >
              <IconPlus />
              <span>Template Baru</span>
            </Link>
            <Link
              href="/dashboard/invitations"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#84633F] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#715332]"
            >
              <IconPlus />
              <span>Undangan Baru</span>
            </Link>
          </div>
        )}
      </div>

      {!active && (
        <div
          data-testid="no-workspace"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 shadow-xs"
        >
          Akun Anda belum tergabung di workspace mana pun. Hubungi admin untuk diundang ke workspace tim.
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          title="Total Template Desain"
          value={templates.length}
          tone="bronze"
          icon={<IconTemplate />}
        />

        <KpiStatCard
          title="Template Siap Pakai"
          value={publishedTemplates}
          tone="gold"
          icon={<IconTemplate />}
        />

        <KpiStatCard
          title="Total Website Undangan"
          value={invitations.length}
          tone="default"
          icon={<IconInvitation />}
        />

        <KpiStatCard
          title="Undangan Sudah Terbit"
          value={publishedInvitations}
          tone="emerald"
          icon={<IconInvitation />}
        />
      </div>

      {/* Analytics Chart & Workflow Grid */}
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

      {/* Recent Work Grid (Invitations & Templates) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Invitations */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-[#2C221E]">Undangan Terbaru</h3>
              <p className="text-xs text-stone-400">Undangan yang baru saja disunting di workspace</p>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-semibold text-[#84633F] hover:text-[#715332]"
            >
              Lihat Semua →
            </Link>
          </div>

          {recentInvitations.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              Belum ada undangan dibuat. Klik tombol &quot;Undangan Baru&quot; di atas untuk memulai.
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100 text-xs">
              {recentInvitations.map((inv) => {
                const cfg = INVITATION_STATUS[inv.status] ?? { label: inv.status, badgeClass: "bg-stone-100 text-stone-700" };
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/dashboard/invitations/${inv.id}`}
                      className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      <div>
                        <strong className="block text-[#2C221E] font-medium">{inv.title}</strong>
                        <span className="text-[11px] text-stone-400">
                          Diperbarui {dateFormat.format(inv.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        <IconArrowRight />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Templates */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-[#2C221E]">Template Desain Terbaru</h3>
              <p className="text-xs text-stone-400">Desain template yang tersimpan dalam pustaka</p>
            </div>
            <Link
              href="/dashboard/templates"
              className="text-xs font-semibold text-[#84633F] hover:text-[#715332]"
            >
              Buka Katalog →
            </Link>
          </div>

          {recentTemplates.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              Belum ada template. Buat desain template di kanvas editor.
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100 text-xs">
              {recentTemplates.map((tpl) => {
                const cfg = TEMPLATE_STATUS[tpl.lifecycle] ?? { label: tpl.lifecycle, badgeClass: "bg-stone-100 text-stone-700" };
                return (
                  <li key={tpl.id}>
                    <Link
                      href={`/dashboard/templates/${tpl.id}`}
                      className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      <div>
                        <strong className="block text-[#2C221E] font-medium">{tpl.name}</strong>
                        <span className="text-[11px] text-stone-400">
                          {tpl.publishedVersionNo !== null ? `Versi ${tpl.publishedVersionNo}` : "Draft belum rilis"} · {dateFormat.format(tpl.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        <IconArrowRight />
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
