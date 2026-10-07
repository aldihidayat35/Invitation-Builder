"use client";

import React from "react";
import type { UserSummaryData, WorkspaceSummaryData } from "../types";

interface DashboardHeaderProps {
  readonly user: UserSummaryData;
  readonly activeWorkspace: WorkspaceSummaryData | null;
  readonly onToggleMobileSidebar: () => void;
  readonly logoutAction: () => Promise<void> | void;
}

export function DashboardHeader({
  user,
  activeWorkspace,
  onToggleMobileSidebar,
  logoutAction,
}: DashboardHeaderProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return {
          label: "Super Admin",
          className: "bg-amber-100 text-amber-900 border-amber-300/80 shadow-xs",
          icon: "👑",
        };
      case "reseller":
        return {
          label: "Mitra Seller",
          className: "bg-emerald-100 text-emerald-900 border-emerald-300/80 shadow-xs",
          icon: "🏪",
        };
      default:
        return {
          label: "Klien / Mempelai",
          className: "bg-stone-100 text-stone-800 border-stone-200 shadow-xs",
          icon: "💍",
        };
    }
  };

  const roleBadge = getRoleBadge(user.systemRole);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-stone-200/80 bg-[#FAF8F5]/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile trigger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-50 lg:hidden"
          aria-label="Buka navigasi menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-[#2C221E] tracking-tight">Studio Dashboard</span>
          <span className="text-stone-300">/</span>
          {activeWorkspace ? (
            <span
              id="active-workspace"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/60 px-2.5 py-0.5 text-xs font-medium text-[#84633F]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              <span className="workspaceName">{activeWorkspace.name}</span>
            </span>
          ) : (
            <span id="active-workspace" className="text-xs text-stone-400">
              Workspace Mandiri
            </span>
          )}
        </div>
      </div>

      {/* Right: Role indicator & User Menu */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${roleBadge.className}`}
        >
          <span>{roleBadge.icon}</span>
          <span>{roleBadge.label}</span>
        </span>

        {/* User Card & Logout */}
        <div id="current-user" className="flex items-center gap-3 pl-2 sm:border-l sm:border-stone-200">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#84633F] text-xs font-bold text-white shadow-xs">
              {user.initials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-[#2C221E] leading-tight">{user.name}</p>
              <p className="text-[11px] text-stone-400 leading-tight truncate max-w-[140px]">{user.email}</p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              id="logout-button"
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 shadow-xs hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
              title="Keluar dari akun"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
