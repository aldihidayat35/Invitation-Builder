"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AgencyBrandingData, NavGroup } from "../types";

interface DashboardSidebarProps {
  readonly navGroups: readonly NavGroup[];
  readonly agencyBranding: AgencyBrandingData | null;
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

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-[#0F172A] text-slate-200 border-r border-slate-800/80 select-none">
      {/* Top Brand Section */}
      <div>
        <div className="flex items-center gap-3 border-b border-slate-800/90 px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D97706] to-[#B45309] text-sm font-extrabold text-white shadow-md shadow-amber-950/30">
            IS
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
              Invitation Studio
            </h2>
            <p className="text-[10px] font-bold text-[#F59E0B] tracking-wider uppercase">
              Platform Undangan
            </p>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6 px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = isLinkActive(item.href, item.exact);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-amber-500/15 text-[#F59E0B] font-semibold border-l-2 border-[#D97706]"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                        title={item.hint}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              active ? "text-[#F59E0B]" : "text-slate-400 group-hover:text-slate-200"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined ? (
                          <span className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow-xs">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Agency Branding or User Card */}
      <div className="p-3 border-t border-slate-800/80">
        {agencyBranding ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              {agencyBranding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agencyBranding.logoUrl}
                  alt={agencyBranding.agencyName}
                  className="h-8 w-8 rounded-lg object-contain bg-white/10 p-0.5"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 text-xs font-bold text-white">
                  {agencyBranding.agencyName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="overflow-hidden">
                <span className="block text-[10px] text-slate-400">Dikelola oleh</span>
                <strong className="block truncate text-xs text-slate-200">
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 text-xs font-bold text-white shadow-xs">
                  {user.initials}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-xs font-semibold text-white leading-tight truncate">
                    {user.name}
                  </p>
                  <p className="text-[10.5px] text-slate-400 leading-tight truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {logoutAction && (
                <form action={logoutAction} className="shrink-0">
                  <button
                    type="submit"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-950/50 hover:text-red-400 transition-colors"
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
          <div className="px-3 py-2 text-[10.5px] text-slate-500 text-center">
            Studio Edition · Enterprise
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky / Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block sticky top-0 h-screen self-start">
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
