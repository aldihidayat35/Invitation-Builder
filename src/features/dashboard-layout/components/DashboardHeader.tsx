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
          className: "bg-amber-50 text-amber-900 border-amber-200/90 shadow-2xs",
          icon: "👑",
        };
      case "reseller":
        return {
          label: "Mitra Seller",
          className: "bg-emerald-50 text-emerald-900 border-emerald-200/90 shadow-2xs",
          icon: "🏪",
        };
      default:
        return {
          label: "Klien / Mempelai",
          className: "bg-slate-50 text-slate-800 border-slate-200 shadow-2xs",
          icon: "💍",
        };
    }
  };

  const roleBadge = getRoleBadge(user.systemRole);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left: Mobile trigger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors lg:hidden"
          aria-label="Buka navigasi menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-[#1E293B] tracking-tight">Studio Dashboard</span>
          <span className="text-slate-300">/</span>
          {activeWorkspace ? (
            <span
              id="active-workspace"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow-2xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#D97706] animate-pulse" />
              <span className="workspaceName">{activeWorkspace.name}</span>
            </span>
          ) : (
            <span id="active-workspace" className="text-xs text-slate-400">
              Workspace Mandiri
            </span>
          )}
        </div>
      </div>

      {/* Center: Search input micro-component (Desktop) */}
      <div className="hidden md:flex items-center relative max-w-xs w-full mx-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Cari undangan, template..."
          className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/15 transition-all"
          readOnly
        />
        <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[10px] font-semibold text-slate-400">
          ⌘K
        </span>
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
        <div id="current-user" className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-xs font-bold text-white shadow-xs">
              {user.initials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-[#1E293B] leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">{user.email}</p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              id="logout-button"
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-2xs hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
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
