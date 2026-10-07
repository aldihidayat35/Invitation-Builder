"use client";

import React, { useState } from "react";

export interface MonthlyDataPoint {
  readonly month: number;
  readonly label: string;
  readonly value: number;
}

interface MonthlyTrendBarChartProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly data: readonly MonthlyDataPoint[];
  readonly year?: number;
  readonly valueSuffix?: string;
}

export function MonthlyTrendBarChart({
  title,
  subtitle,
  data,
  year = new Date().getFullYear(),
  valueSuffix = " pesanan",
}: MonthlyTrendBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const currentMonth = new Date().getMonth() + 1; // 1-12

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#2C221E]">{title}</h3>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
              {year}
            </span>
          </div>
          {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {hoveredIndex !== null ? (
            <div className="text-right">
              <span className="text-[11px] font-medium text-stone-400">
                {data[hoveredIndex]?.label}:{" "}
              </span>
              <strong className="text-sm font-bold text-[#84633F]">
                {data[hoveredIndex]?.value}
                {valueSuffix}
              </strong>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/60 px-2.5 py-0.5 text-xs font-semibold text-[#84633F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                Total {total}
                {valueSuffix}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-3 px-2 pt-6">
        {data.map((item, idx) => {
          const heightPercent = maxVal > 0 ? Math.max((item.value / maxVal) * 100, 4) : 4;
          const isCurrent = item.month === currentMonth;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.month}
              className="group relative flex flex-1 flex-col items-center h-full justify-end"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip on top of bar */}
              {isHovered && (
                <div className="absolute -top-7 z-10 rounded-md bg-[#2C221E] px-2 py-0.5 text-[10px] font-bold text-white shadow-md pointer-events-none whitespace-nowrap">
                  {item.value}
                </div>
              )}

              {/* Bar track background */}
              <div className="relative w-full rounded-t-lg bg-stone-100 flex items-end overflow-hidden h-full max-h-[140px]">
                {/* Filled bar with luxury bronze & gold gradient */}
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                    item.value > 0
                      ? isHovered || isCurrent
                        ? "bg-gradient-to-t from-[#84633F] via-[#A8861B] to-[#D4AF37] shadow-xs"
                        : "bg-gradient-to-t from-[#84633F]/80 to-[#D4AF37]/80"
                      : "bg-stone-200/50"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Month label */}
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
                  <span className="mx-auto block h-1 w-1 rounded-full bg-[#D4AF37] mt-0.5" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
