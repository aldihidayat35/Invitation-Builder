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
}

export function DashboardSidebar({
  navGroups,
  agencyBranding,
  isMobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-[#2C221E] text-stone-200">
      {/* Top Brand Section */}
      <div>
        <div className="flex items-center gap-3 border-b border-stone-800/80 px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#84633F] text-sm font-extrabold text-[#2C221E] shadow-md">
            IS
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
              Invitation Studio
            </h2>
            <p className="text-[11px] font-medium text-[#D4AF37]/90 tracking-wide uppercase">
              Platform Undangan
            </p>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6 px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[10px] font-bold tracking-wider text-stone-400 uppercase">
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
                            ? "bg-[#D4AF37]/15 text-[#D4AF37] font-semibold border-l-2 border-[#D4AF37]"
                            : "text-stone-300 hover:bg-stone-800/60 hover:text-white"
                        }`}
                        title={item.hint}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              active ? "text-[#D4AF37]" : "text-stone-400 group-hover:text-stone-200"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined ? (
                          <span className="inline-flex items-center rounded-full bg-[#84633F] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
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

      {/* Bottom White-label Agency Section */}
      {agencyBranding ? (
        <div className="m-3 rounded-xl border border-stone-800 bg-stone-900/60 p-3.5 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            {agencyBranding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agencyBranding.logoUrl}
                alt={agencyBranding.agencyName}
                className="h-8 w-8 rounded-lg object-contain bg-white/10 p-0.5"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#84633F] text-xs font-bold text-white">
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
      ) : (
        <div className="px-6 py-4 text-[11px] text-stone-400 text-center border-t border-stone-800/60">
          Studio Edition · Enterprise
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky / Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block sticky top-0 h-screen self-start border-r border-stone-800/80">
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
