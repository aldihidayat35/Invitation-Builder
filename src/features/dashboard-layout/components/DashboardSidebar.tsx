"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AgencyBrandingData, NavGroup, StorageUsageSummary } from "../types";

interface DashboardSidebarProps {
  readonly navGroups: readonly NavGroup[];
  readonly agencyBranding: AgencyBrandingData | null;
  readonly storageUsage?: StorageUsageSummary | null;
  readonly isMobileOpen: boolean;
  readonly onCloseMobile: () => void;
  readonly user?: {
    readonly name: string;
    readonly email: string;
    readonly initials: string;
    readonly systemRole: string;
  };
  readonly logoutAction?: () => Promise<void> | void;
}

export function DashboardSidebar({
  navGroups,
  agencyBranding,
  storageUsage,
  isMobileOpen,
  onCloseMobile,
  user,
  logoutAction,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderBadge = (badge: number | string) => {
    const badgeStr = String(badge);
    if (badgeStr.toLowerCase().includes("aktif")) {
      return (
        <span className="inline-flex items-center rounded-lg bg-[#142A1D] border border-emerald-900/50 px-2 py-0.5 text-xs font-bold text-[#22C55E]">
          {badge}
        </span>
      );
    }
    if (badgeStr.toLowerCase() === "baru") {
      return (
        <span className="inline-flex items-center rounded-lg bg-[#342410] border border-amber-900/50 px-2.5 py-0.5 text-[11px] font-bold text-[#F59E0B]">
          {badge}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-lg bg-[#282422] px-2 py-0.5 text-xs font-semibold text-[#A8A29E]">
        {badge}
      </span>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-[#181513] text-stone-200 border-r border-[#262220] select-none">
      {/* Top Brand Section */}
      <div>
        <div className="flex items-center gap-3.5 border-b border-[#262220] px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D4A338] text-base font-black text-stone-950 shadow-md shadow-amber-950/20">
            IS
          </div>
          <div className="overflow-hidden">
            <h2 className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-white leading-tight">
              <span>Invitation Studio</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
            </h2>
            <p className="mt-0.5 text-[10px] font-bold text-[#D4A338] tracking-widest uppercase">
              PLATFORM UNDANGAN
            </p>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6 px-3.5 py-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[11px] font-bold tracking-wider text-[#78716C] uppercase mb-2">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isLinkActive(item.href, item.exact);
                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-[13.5px] font-medium transition-all ${
                          active
                            ? "bg-[#282422] text-white font-semibold shadow-xs"
                            : "text-[#A8A29E] hover:bg-[#231F1D] hover:text-white"
                        }`}
                        title={item.hint}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`h-5 w-5 shrink-0 transition-colors flex items-center justify-center ${
                              active ? "text-[#D4A338]" : "text-[#78716C] group-hover:text-stone-300"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate leading-tight">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge !== undefined ? renderBadge(item.badge) : null}
                          {active && !item.badge && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A338] shrink-0" />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Storage Meter + Agency Branding or User Card */}
      <div className="p-3.5 border-t border-[#262220] space-y-3">
        {/* Storage Meter Widget */}
        {storageUsage ? (
          <div className="rounded-xl border border-[#2B2725] bg-[#221E1C] p-3 shadow-inner">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-stone-300">
                <svg className="h-4 w-4 text-[#D4A338]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16" />
                </svg>
                <span className="text-[11px] font-medium tracking-wide">Storage Server</span>
              </div>
              <span className={`text-[11px] font-bold ${
                storageUsage.usagePercent >= 90
                  ? "text-rose-400"
                  : storageUsage.usagePercent >= 75
                  ? "text-amber-400"
                  : "text-[#D4A338]"
              }`}>
                {storageUsage.usagePercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#181513]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storageUsage.usagePercent >= 90
                    ? "bg-rose-500"
                    : storageUsage.usagePercent >= 75
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-[#D4A338] to-[#F59E0B]"
                }`}
                style={{ width: `${Math.min(100, Math.max(storageUsage.usagePercent, 2))}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10.5px] text-stone-400">
              <span>{storageUsage.formattedUsed} / {storageUsage.formattedLimit}</span>
              <Link
                href="/dashboard/storage"
                onClick={onCloseMobile}
                className="font-medium text-[#D4A338] hover:text-amber-300 transition-colors"
              >
                Kelola →
              </Link>
            </div>
          </div>
        ) : null}

        {agencyBranding ? (
          <div className="rounded-xl border border-[#2B2725] bg-[#221E1C] p-3.5">
            <div className="flex items-center gap-2.5">
              {agencyBranding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agencyBranding.logoUrl}
                  alt={agencyBranding.agencyName}
                  className="h-8 w-8 rounded-lg object-contain bg-white/10 p-0.5"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4A338] text-xs font-bold text-stone-950">
                  {agencyBranding.agencyName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="overflow-hidden">
                <span className="block text-[10px] text-stone-400">Dikelola oleh</span>
                <strong className="block truncate text-xs text-stone-200">
                  {agencyBranding.agencyName}
                </strong>
              </div>
            </div>

            <a
              href={`https://wa.me/${agencyBranding.whatsappContact.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-900/50"
            >
              <span>💬 Bantuan CS</span>
            </a>
          </div>
        ) : user ? (
          <div className="rounded-xl border border-[#2B2725] bg-[#221E1C] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#12100E] border border-stone-700/80 text-xs font-bold text-white shadow-xs">
                  {user.initials}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-xs font-semibold text-white leading-tight truncate">
                    {user.name}
                  </p>
                  <p className="text-[10.5px] text-stone-400 leading-tight truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {logoutAction && (
                <form action={logoutAction} className="shrink-0">
                  <button
                    type="submit"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-red-950/50 hover:text-red-400 transition-colors"
                    title="Keluar"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 text-[10.5px] text-stone-500 text-center">
            Studio Edition · Enterprise
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Width 288px / w-72 for spacious comfortable nav) */}
      <aside className="hidden w-72 shrink-0 lg:block sticky top-0 h-screen self-start">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative flex w-72 max-w-[85%] flex-1 flex-col shadow-2xl">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800 text-stone-400 hover:text-white"
                aria-label="Tutup navigasi"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      ) : null}
    </>
  );
}
