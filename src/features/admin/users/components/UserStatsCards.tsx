"use client";

import React from "react";
import type { UsersSummary } from "../types";

interface UserStatsCardsProps {
  summary: UsersSummary;
}

export function UserStatsCards({ summary }: UserStatsCardsProps) {
  const cards = [
    {
      label: "Total Pengguna",
      value: summary.total,
      sublabel: `${summary.active} aktif · ${summary.disabled} dinonaktifkan`,
      icon: (
        <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bgIcon: "bg-amber-500/10 border-amber-200/80",
    },
    {
      label: "Super Admin",
      value: summary.owners,
      sublabel: "Akses penuh platform",
      icon: (
        <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      bgIcon: "bg-amber-100/80 border-amber-300/80",
    },
    {
      label: "Mitra Seller",
      value: summary.resellers,
      sublabel: "Agensi & reseller aktif",
      icon: (
        <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      bgIcon: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Portal Pengantin",
      value: "Mandiri",
      sublabel: "Akses link token tanpa login",
      icon: (
        <svg className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      bgIcon: "bg-indigo-50 border-indigo-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              {c.label}
            </span>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${c.bgIcon} transition-transform duration-200 group-hover:scale-110`}
            >
              {c.icon}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#2C221E]">
              {c.value.toLocaleString("id-ID")}
            </div>
            <p className="mt-1 text-xs text-stone-500">{c.sublabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
