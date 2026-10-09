"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { TopResellerTrendItem } from "../types";

interface TopResellersTrendChartProps {
  topSellers: TopResellerTrendItem[];
}

export function TopResellersTrendChart({ topSellers }: TopResellersTrendChartProps) {
  const [filterType, setFilterType] = useState<"total" | "completed" | "new">("total");

  // Determine sorted list based on filterType
  const sortedSellers = [...topSellers].sort((a, b) => {
    if (filterType === "completed") return b.completedOrders - a.completedOrders;
    if (filterType === "new") return b.newOrders - a.newOrders;
    return b.totalOrders - a.totalOrders;
  });

  const totalAllOrders = topSellers.reduce((sum, s) => sum + s.totalOrders, 0);
  const maxMetricValue = Math.max(
    ...sortedSellers.map((s) =>
      filterType === "completed"
        ? s.completedOrders
        : filterType === "new"
          ? s.newOrders
          : s.totalOrders,
    ),
    1,
  );

  const topPerformer = topSellers.find((s) => s.totalOrders > 0) ?? topSellers[0];
  const activeSellersWithOrders = topSellers.filter((s) => s.totalOrders > 0).length;

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#2C221E]">
              Tren Seller Terbanyak Mendapat Orderan
            </h3>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#84633F] border border-amber-200/80">
              Peringkat Penjualan
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">
            Peringkat mitra seller berdasarkan volume pesanan customer yang masuk ke toko online mereka
          </p>
        </div>

        {/* Filter Type Tabs */}
        <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-0.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType("total")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              filterType === "total"
                ? "bg-white text-[#84633F] shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Semua Pesanan
          </button>
          <button
            type="button"
            onClick={() => setFilterType("completed")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              filterType === "completed"
                ? "bg-white text-[#84633F] shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Selesai Terbit
          </button>
          <button
            type="button"
            onClick={() => setFilterType("new")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              filterType === "new"
                ? "bg-white text-[#84633F] shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Antrean Baru
          </button>
        </div>
      </div>

      {/* Mini Executive Metric Strip */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-stone-100 bg-[#FAF8F5] p-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#D4AF37] font-bold text-base shadow-2xs">
            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.202a1 1 0 0 1-.962.733H5.815a1 1 0 0 1-.962-.733L2.019 6.019a.5.5 0 0 1 .798-.519l4.277 3.664a1 1 0 0 0 1.516-.294z" />
              <path d="M5 21h14" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-stone-400">Seller No. 1 Terlaris</span>
            <strong className="block truncate font-bold text-[#2C221E]">
              {topPerformer && topPerformer.totalOrders > 0
                ? `${topPerformer.agencyName} (${topPerformer.totalOrders} order)`
                : "Belum ada transaksi"}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-200/70 text-[#84633F] font-bold text-base">
            <svg className="h-5 w-5 text-[#84633F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16.5 9.4-9 5.2M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12.01 20.71 7" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-stone-400">Total Akumulasi Pesanan</span>
            <strong className="block font-bold text-[#84633F]">
              {totalAllOrders} <span className="text-[11px] font-normal text-stone-500">pesanan customer</span>
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-base">
            <svg className="h-5 w-5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-stone-400">Mitra Menghasilkan Order</span>
            <strong className="block font-bold text-emerald-800">
              {activeSellersWithOrders} <span className="text-[11px] font-normal text-stone-500">dari {topSellers.length} seller</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Chart List Body */}
      {topSellers.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-400">
          Belum ada mitra seller yang terdaftar di platform.
        </div>
      ) : totalAllOrders === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-stone-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-[#D4AF37]">
            <svg className="h-6 w-6 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h4 className="mt-3 text-sm font-bold text-[#2C221E]">Belum Ada Riwayat Pesanan Masuk</h4>
          <p className="mx-auto mt-1 max-w-md text-xs text-stone-400 leading-relaxed">
            Mitra seller telah terdaftar, namun belum ada orderan yang masuk melalui etalase toko seller. Begitu pesanan pertama masuk, grafik tren performa seller terbanyak akan otomatis muncul di sini.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {topSellers.slice(0, 4).map((seller) => (
              <span
                key={seller.sellerId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {seller.agencyName}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3.5">
          {sortedSellers.map((seller, idx) => {
            const metricValue =
              filterType === "completed"
                ? seller.completedOrders
                : filterType === "new"
                  ? seller.newOrders
                  : seller.totalOrders;

            const barPercent = Math.max((metricValue / maxMetricValue) * 100, 4);

            // Medals & badges
            const rankBadge =
              idx === 0 ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[11px] font-black text-amber-950 shadow-2xs">
                  1
                </span>
              ) : idx === 1 ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-300 text-[11px] font-black text-stone-700 shadow-2xs">
                  2
                </span>
              ) : idx === 2 ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-[11px] font-black text-amber-900 shadow-2xs">
                  3
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold text-stone-500">
                  {idx + 1}
                </span>
              );

            return (
              <div
                key={seller.sellerId}
                className="group relative rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3 transition hover:border-amber-200 hover:bg-white hover:shadow-2xs"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Rank + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{rankBadge}</div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#2C221E] truncate">
                          {seller.agencyName}
                        </span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] font-medium text-stone-500">
                          @{seller.slug}
                        </span>
                        {seller.isActive ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 border border-emerald-200/60">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-semibold text-rose-700 border border-rose-200/60">
                            Non-aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 truncate">
                        PIC: {seller.ownerName} • {seller.customDomain ?? `${seller.slug}.undangan.id`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Numbers & Conversion */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <strong className="text-sm font-extrabold text-[#84633F]">
                          {metricValue}
                        </strong>
                        <span className="text-[11px] text-stone-400">order</span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {seller.percentageOfTotal}% dari total platform
                      </span>
                    </div>

                    <Link
                      href={`/seller/${seller.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:border-[#84633F] hover:text-[#84633F] transition shadow-2xs"
                      title="Lihat website etalase seller"
                    >
                      Lihat Toko
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="mt-3">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#84633F] via-[#A8861B] to-[#D4AF37] transition-all duration-700 ease-out"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown sub-row */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-400 pt-1 border-t border-stone-100/80">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Selesai: <strong className="text-stone-600 font-semibold">{seller.completedOrders}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Baru: <strong className="text-stone-600 font-semibold">{seller.newOrders}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Proses: <strong className="text-stone-600 font-semibold">{seller.inProgressOrders}</strong>
                    </span>
                  </div>

                  {seller.whatsappContact && (
                    <a
                      href={`https://wa.me/${seller.whatsappContact.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-emerald-600 font-medium transition"
                    >
                      WhatsApp: {seller.whatsappContact}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
