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
          className: "bg-gradient-to-r from-amber-100 to-amber-200/70 text-[#92400E] border-amber-300/80 shadow-2xs",
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
          className: "bg-stone-50 text-stone-800 border-stone-200 shadow-2xs",
          icon: "💍",
        };
    }
  };

  const roleBadge = getRoleBadge(user.systemRole);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#E8E2D8] bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile trigger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8E2D8] bg-white text-[#2C221E] shadow-2xs hover:bg-[#F7F4EF] transition-colors lg:hidden"
          aria-label="Buka navigasi menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="font-medium text-stone-400">Studio Dashboard</span>
          <span className="text-stone-300">/</span>
          {activeWorkspace ? (
            <div
              id="active-workspace"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D8] bg-[#F7F4EF] px-3 py-1 text-xs font-semibold text-[#2C221E] shadow-2xs cursor-default"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              <span className="workspaceName">{activeWorkspace.name}</span>
              <svg className="h-3 w-3 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <span id="active-workspace" className="text-xs text-stone-400">
              Workspace Mandiri
            </span>
          )}
        </div>
      </div>

      {/* Right: Role indicator, Bell, User Profile, Logout */}
      <div className="flex items-center gap-3.5">
        {/* Role Badge */}
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${roleBadge.className}`}
        >
          <span>{roleBadge.icon}</span>
          <span>{roleBadge.label}</span>
        </span>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="Notifikasi"
          aria-label="Notifikasi"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* User Card */}
        <div id="current-user" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-xs font-bold text-white shadow-xs">
            {user.initials}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-bold text-stone-900 leading-tight">{user.name}</p>
            <p className="text-[11px] text-stone-400 leading-tight truncate max-w-[140px]">{user.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <form action={logoutAction}>
          <button
            id="logout-button"
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Keluar dari akun"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
