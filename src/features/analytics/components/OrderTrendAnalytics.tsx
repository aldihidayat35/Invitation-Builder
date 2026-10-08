"use client";

import React, { useState } from "react";
import type { MonthlyDataPoint } from "./MonthlyTrendBarChart";
import type { TrendDataPoint } from "./TrendLineChart";

export interface OrderTrendAnalyticsProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly monthlyData: readonly MonthlyDataPoint[];
  readonly dailyData?: readonly TrendDataPoint[];
  readonly year?: number;
  readonly valueSuffix?: string;
}

export function OrderTrendAnalytics({
  title = "Tren Volume Pesanan (Bulan ke Bulan)",
  subtitle,
  monthlyData,
  dailyData,
  year = new Date().getFullYear(),
  valueSuffix = " pesanan",
}: OrderTrendAnalyticsProps) {
  const [viewMode, setViewMode] = useState<"monthly" | "daily">("monthly");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredDailyIdx, setHoveredDailyIdx] = useState<number | null>(null);

  // Monthly stats
  const monthlyValues = monthlyData.map((d) => d.value);
  const totalYearOrders = monthlyValues.reduce((a, b) => a + b, 0);
  const maxMonthlyVal = Math.max(...monthlyValues, 1);
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentMonthData = monthlyData.find((d) => d.month === currentMonth);

  const peakMonth = monthlyData.reduce(
    (max, curr) => (curr.value > max.value ? curr : max),
    monthlyData[0] ?? { month: 1, label: "Jan", value: 0 },
  );

  const avgPerMonth = (totalYearOrders / 12).toFixed(1);

  // Quarters breakdown
  const q1 = monthlyValues.slice(0, 3).reduce((a, b) => a + b, 0);
  const q2 = monthlyValues.slice(3, 6).reduce((a, b) => a + b, 0);
  const q3 = monthlyValues.slice(6, 9).reduce((a, b) => a + b, 0);
  const q4 = monthlyValues.slice(9, 12).reduce((a, b) => a + b, 0);

  // Daily line calculations (for daily view)
  const dailyPoints = dailyData ?? [];
  const dailyValues = dailyPoints.map((d) => d.value);
  const dailyMin = Math.min(...dailyValues, 0);
  const dailyMax = Math.max(...dailyValues, 5);
  const dailyRange = dailyMax - dailyMin || 1;

  const svgWidth = 600;
  const svgHeight = 180;
  const padX = 30;
  const padY = 20;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padY * 2;

  const points = dailyPoints.map((d, i) => {
    const x = padX + (i / Math.max(dailyPoints.length - 1, 1)) * chartW;
    const y = svgHeight - padY - ((d.value - dailyMin) / dailyRange) * chartH;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1]!;
    const cX1 = prev.x + (curr.x - prev.x) / 2;
    const cY1 = prev.y;
    const cX2 = prev.x + (curr.x - prev.x) / 2;
    const cY2 = curr.y;
    return `${acc} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${curr.x} ${curr.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1]!.x} ${svgHeight - padY} L ${points[0]!.x} ${svgHeight - padY} Z`
      : "";

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      {/* Header with Title, Year, and View Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#2C221E]">{title}</h3>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
              {year}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">
            {subtitle ??
              (viewMode === "monthly"
                ? `Grafik perkembangan akumulasi pesanan masuk per bulan (Jan – Des ${year})`
                : "Grafik fluktuasi harian dalam 30 hari terakhir")}
          </p>
        </div>

        {/* View Switcher: Bulan ke Bulan vs Harian */}
        <div className="flex items-center gap-2">
          {dailyData && dailyData.length > 0 && (
            <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("monthly")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  viewMode === "monthly"
                    ? "bg-white text-[#84633F] shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>📊 Bulan ke Bulan</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  viewMode === "daily"
                    ? "bg-white text-[#84633F] shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>📈 Harian ({dailyData.length} Hari)</span>
              </button>
            </div>
          )}

          {viewMode === "monthly" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/60 px-2.5 py-1 text-xs font-semibold text-[#84633F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              Total {totalYearOrders}
              {valueSuffix}
            </span>
          )}
        </div>
      </div>

      {/* MONTHLY VIEW (BULAN KE BULAN) */}
      {viewMode === "monthly" && (
        <div className="mt-5 space-y-5">
          {/* Executive Quick Stats Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-stone-100 bg-[#FAF8F5] p-3">
            <div>
              <span className="block text-[11px] font-medium text-stone-400">Total Tahun Ini</span>
              <strong className="mt-0.5 block text-base font-bold text-[#2C221E]">
                {totalYearOrders} <span className="text-xs font-normal text-stone-500">pesanan</span>
              </strong>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-stone-400">Rata-rata Bulanan</span>
              <strong className="mt-0.5 block text-base font-bold text-[#84633F]">
                {avgPerMonth} <span className="text-xs font-normal text-stone-500">/ bln</span>
              </strong>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-stone-400">Bulan Paling Ramai</span>
              <strong className="mt-0.5 block text-base font-bold text-emerald-800">
                {peakMonth.value > 0 ? `${peakMonth.label} (${peakMonth.value})` : "-"}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-stone-400">Bulan Ini ({currentMonthData?.label})</span>
              <strong className="mt-0.5 block text-base font-bold text-[#D4AF37]">
                {currentMonthData?.value ?? 0} <span className="text-xs font-normal text-stone-500">pesanan</span>
              </strong>
            </div>
          </div>

          {/* Interactive Monthly Bar Chart (Jan - Des) */}
          <div className="relative pt-6">
            <div className="flex h-48 items-end gap-1.5 sm:gap-2.5 px-2">
              {monthlyData.map((item, idx) => {
                const heightPercent =
                  maxMonthlyVal > 0 ? Math.max((item.value / maxMonthlyVal) * 100, 4) : 4;
                const isCurrent = item.month === currentMonth;
                const isHovered = hoveredMonthIdx === idx;
                const sharePercent =
                  totalYearOrders > 0 ? Math.round((item.value / totalYearOrders) * 100) : 0;

                return (
                  <div
                    key={item.month}
                    className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                  >
                    {/* Floating Info Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 rounded-xl bg-[#2C221E] px-3 py-1.5 text-center text-white shadow-lg pointer-events-none whitespace-nowrap">
                        <p className="text-[10px] text-stone-300">Bulan {item.label}</p>
                        <p className="text-xs font-bold text-[#D4AF37]">
                          {item.value} {valueSuffix} ({sharePercent}%)
                        </p>
                      </div>
                    )}

                    {/* Bar Track Background */}
                    <div className="relative w-full rounded-t-lg bg-stone-100 flex items-end overflow-hidden h-full max-h-[140px]">
                      {/* Bar fill with gradient */}
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                          item.value > 0
                            ? isHovered || isCurrent
                              ? "bg-gradient-to-t from-[#84633F] via-[#A8861B] to-[#D4AF37] shadow-sm"
                              : "bg-gradient-to-t from-[#84633F]/85 to-[#D4AF37]/85"
                            : "bg-stone-200/40"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Month Label */}
                    <div className="mt-2 text-center">
                      <span
                        className={`block text-[11px] font-medium transition-colors ${
                          isCurrent
                            ? "font-bold text-[#84633F]"
                            : isHovered
                              ? "font-semibold text-stone-900"
                              : "text-stone-400"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isCurrent && (
                        <span
                          className="mx-auto block h-1.5 w-1.5 rounded-full bg-[#D4AF37] mt-0.5 shadow-2xs"
                          title="Bulan Sekarang"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quarterly Summary Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-[11px] text-stone-500">
            <span className="font-medium text-stone-400">Ringkasan Kuartal:</span>
            <div className="flex items-center gap-4">
              <span>
                <strong>Q1:</strong> {q1} pesanan
              </span>
              <span>
                <strong>Q2:</strong> {q2} pesanan
              </span>
              <span>
                <strong>Q3:</strong> {q3} pesanan
              </span>
              <span>
                <strong>Q4:</strong> {q4} pesanan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DAILY VIEW (HARIAN) */}
      {viewMode === "daily" && dailyData && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              {hoveredDailyIdx !== null ? (
                <span>
                  Tanggal <strong>{dailyPoints[hoveredDailyIdx]?.label}</strong>:{" "}
                  <strong className="text-[#84633F]">
                    {dailyPoints[hoveredDailyIdx]?.value} pesanan
                  </strong>
                </span>
              ) : (
                <span>Arahkan kursor pada titik grafik untuk melihat detail harian</span>
              )}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {dailyValues.reduce((a, b) => a + b, 0)} Total 30 Hari
            </span>
          </div>

          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-48 w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="orderTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line
                x1={padX}
                y1={padY}
                x2={svgWidth - padX}
                y2={padY}
                stroke="#EFE9DF"
                strokeDasharray="4 4"
              />
              <line
                x1={padX}
                y1={svgHeight / 2}
                x2={svgWidth - padX}
                y2={svgHeight / 2}
                stroke="#EFE9DF"
                strokeDasharray="4 4"
              />
              <line
                x1={padX}
                y1={svgHeight - padY}
                x2={svgWidth - padX}
                y2={svgHeight - padY}
                stroke="#E2D9CC"
              />

              {/* Gradient Area */}
              <path d={areaD} fill="url(#orderTrendGradient)" />

              {/* Spline Curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#84633F"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Points */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDailyIdx === idx ? 6 : 3}
                    className={`cursor-pointer transition-all ${
                      hoveredDailyIdx === idx
                        ? "fill-[#D4AF37] stroke-[#2C221E] stroke-2"
                        : "fill-[#84633F] stroke-white stroke-2"
                    }`}
                    onMouseEnter={() => setHoveredDailyIdx(idx)}
                    onMouseLeave={() => setHoveredDailyIdx(null)}
                  />
                </g>
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="mt-2 flex justify-between px-2 text-[10px] text-stone-400">
              <span>{dailyPoints[0]?.label}</span>
              {dailyPoints.length > 2 && (
                <span>{dailyPoints[Math.floor(dailyPoints.length / 2)]?.label}</span>
              )}
              <span>{dailyPoints[dailyPoints.length - 1]?.label}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
