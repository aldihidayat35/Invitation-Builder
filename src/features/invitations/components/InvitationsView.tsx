"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { InvitationSummary } from "../types";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const STATUS_CONFIG: Record<
  InvitationSummary["status"],
  { label: string; badgeClass: string; dotClass: string }
> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200/90",
    dotClass: "bg-amber-500",
  },
  published: {
    label: "Dipublish",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200/90",
    dotClass: "bg-emerald-500",
  },
  archived: {
    label: "Diarsipkan",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
    dotClass: "bg-stone-400",
  },
};

interface InvitationsViewProps {
  readonly invitations: readonly InvitationSummary[];
  readonly emptyMessage?: string;
  readonly initialStatus?: "all" | "published" | "draft" | "archived";
}

export function InvitationsView({
  invitations,
  emptyMessage = "Belum ada undangan dibuat. Mulai buat undangan pertama Anda.",
  initialStatus = "all",
}: InvitationsViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">(initialStatus);
  const [sortBy, setSortBy] = useState<"updated-desc" | "updated-asc" | "title-asc">("updated-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: invitations.length,
      published: invitations.filter((i) => i.status === "published").length,
      draft: invitations.filter((i) => i.status === "draft").length,
      archived: invitations.filter((i) => i.status === "archived").length,
    };
  }, [invitations]);

  // Filtered and sorted list
  const filtered = useMemo(() => {
    return invitations
      .filter((inv) => {
        if (statusFilter !== "all" && inv.status !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          inv.title.toLowerCase().includes(q) ||
          inv.slug.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "updated-desc") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === "updated-asc") {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return a.title.localeCompare(b.title);
      });
  }, [invitations, statusFilter, search, sortBy]);

  const handleCopyLink = async (inv: InvitationSummary) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/i/${inv.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Toolbar: Filter, Search & View Switcher */}
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        {/* Left: Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-[#84633F] text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            <span>Semua</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                statusFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-stone-200/80 text-stone-700"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("published")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "published"
                ? "bg-emerald-800 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Dipublish</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                statusFilter === "published"
                  ? "bg-white/20 text-white"
                  : "bg-stone-200/80 text-stone-700"
              }`}
            >
              {counts.published}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("draft")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "draft"
                ? "bg-amber-700 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Draft</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                statusFilter === "draft"
                  ? "bg-white/20 text-white"
                  : "bg-stone-200/80 text-stone-700"
              }`}
            >
              {counts.draft}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("archived")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "archived"
                ? "bg-stone-700 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            <span>Diarsipkan</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                statusFilter === "archived"
                  ? "bg-white/20 text-white"
                  : "bg-stone-200/80 text-stone-700"
              }`}
            >
              {counts.archived}
            </span>
          </button>
        </div>

        {/* Right: Search, Sort, and View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <span className="absolute inset-y-0 left-3 flex items-center text-stone-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul / slug..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-1.5 pr-8 pl-9 text-xs text-[#2C221E] transition focus:border-[#84633F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-2.5 flex items-center text-xs text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-1.5 text-xs font-medium text-stone-700 transition focus:border-[#84633F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]/30"
          >
            <option value="updated-desc">Terbaru Diperbarui</option>
            <option value="updated-asc">Terlama Diperbarui</option>
            <option value="title-asc">Judul (A–Z)</option>
          </select>

          {/* Grid vs List View Toggle */}
          <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 text-xs transition ${
                viewMode === "grid"
                  ? "bg-white text-[#84633F] shadow-2xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="Tampilan Grid Kartu"
              aria-label="Tampilan Grid"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 text-xs transition ${
                viewMode === "list"
                  ? "bg-white text-[#84633F] shadow-2xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="Tampilan Daftar Tabel"
              aria-label="Tampilan Daftar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Empty State vs Cards / Table */}
      {filtered.length === 0 ? (
        <div
          data-testid="empty-state"
          className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-10 text-center shadow-xs"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl shadow-inner">
            💌
          </div>
          <h3 className="mt-4 text-base font-bold text-[#2C221E]">
            {search ? "Tidak ada undangan yang cocok" : "Belum Ada Undangan"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
            {search
              ? `Tidak ditemukan undangan dengan kata kunci "${search}". Coba periksa kembali ejaan atau reset filter pencarian.`
              : emptyMessage}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-[#84633F] shadow-xs hover:bg-stone-50"
            >
              Reset Pencarian &amp; Filter
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Daftar undangan">
          {filtered.map((invitation) => {
            const statusCfg = STATUS_CONFIG[invitation.status] ?? STATUS_CONFIG.draft;
            const isCopied = copiedId === invitation.id;

            return (
              <li
                key={invitation.id}
                data-testid="invitation-card"
                className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/60 hover:shadow-md"
              >
                <div>
                  {/* Card Header: Icon & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F2EAE0] to-[#E5D7C5] text-lg text-[#84633F] shadow-inner">
                      💍
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Title & Link */}
                  <h3 className="mt-4 text-base font-bold text-[#2C221E] transition-colors group-hover:text-[#84633F]">
                    <Link
                      href={`/dashboard/invitations/${invitation.id}`}
                      data-testid="open-invitation"
                      className="focus:outline-hidden"
                    >
                      {invitation.title}
                    </Link>
                  </h3>

                  {/* Public Slug URL with Copy Shortcut */}
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-stone-100 bg-[#FAF8F5] px-2.5 py-1.5 text-[11px]">
                    <span className="font-mono text-stone-600 truncate mr-2" title={`/i/${invitation.slug}`}>
                      /i/{invitation.slug}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(invitation)}
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                        isCopied
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                      }`}
                      title="Salin link publik"
                    >
                      {isCopied ? "✓ Tersalin" : "Salin Link"}
                    </button>
                  </div>

                  {/* Meta Updated */}
                  <p className="mt-3 text-[11px] text-stone-400">
                    Diperbarui {dateFormat.format(new Date(invitation.updatedAt))}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-3.5">
                  <Link
                    href={`/dashboard/invitations/${invitation.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#84633F] px-3 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#715332]"
                  >
                    <span>Isi Data &amp; Tamu</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href={`/dashboard/invitations/${invitation.id}/preview`}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-xs font-medium text-stone-600 shadow-2xs transition hover:bg-stone-50 hover:text-stone-900"
                    title="Buka Pratinjau Undangan"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-[#FAF8F5] text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Undangan &amp; Tautan
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Terakhir Diperbarui
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((invitation) => {
                  const statusCfg = STATUS_CONFIG[invitation.status] ?? STATUS_CONFIG.draft;
                  const isCopied = copiedId === invitation.id;

                  return (
                    <tr
                      key={invitation.id}
                      data-testid="invitation-card"
                      className="transition-colors hover:bg-stone-50/70"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/invitations/${invitation.id}`}
                          data-testid="open-invitation"
                          className="font-bold text-[#2C221E] hover:text-[#84633F]"
                        >
                          {invitation.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-[11px] text-stone-500">
                            /i/{invitation.slug}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopyLink(invitation)}
                            className="text-[10px] font-semibold text-[#84633F] hover:underline"
                          >
                            {isCopied ? "✓ Tersalin" : "Salin"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusCfg.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-stone-500 whitespace-nowrap">
                        {dateFormat.format(new Date(invitation.updatedAt))}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/invitations/${invitation.id}`}
                            className="rounded-lg bg-[#84633F] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#715332]"
                          >
                            Kelola
                          </Link>
                          <Link
                            href={`/dashboard/invitations/${invitation.id}/preview`}
                            target="_blank"
                            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Preview
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
