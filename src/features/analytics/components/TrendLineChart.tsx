"use client";

import React, { useState } from "react";

export interface TrendDataPoint {
  readonly label: string;
  readonly value: number;
}

interface TrendLineChartProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly data: readonly TrendDataPoint[];
  readonly valuePrefix?: string;
  readonly valueSuffix?: string;
}

export function TrendLineChart({
  title,
  subtitle,
  data,
  valuePrefix = "",
  valueSuffix = "",
}: TrendLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-stone-200/90 bg-white p-6 text-center text-xs text-stone-400">
        Belum ada data tren yang tercatat.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 5);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 200;
  const paddingX = 35;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - paddingY - ((d.value - minVal) / range) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // Construct SVG path using smooth line
  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1]!;
    const cX1 = prev.x + (curr.x - prev.x) / 2;
    const cY1 = prev.y;
    const cX2 = prev.x + (curr.x - prev.x) / 2;
    const cY2 = curr.y;
    return `${acc} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${curr.x} ${curr.y}`;
  }, "");

  // Closed path for gradient area
  const areaD = `${pathD} L ${points[points.length - 1]!.x} ${height - paddingY} L ${points[0]!.x} ${height - paddingY} Z`;

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#2C221E]">{title}</h3>
          {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        </div>

        {hoveredIndex !== null ? (
          <div className="text-right">
            <span className="text-[11px] font-medium text-stone-400">
              {data[hoveredIndex]?.label}:{" "}
            </span>
            <strong className="text-sm font-bold text-[#84633F]">
              {valuePrefix}
              {data[hoveredIndex]?.value}
              {valueSuffix}
            </strong>
          </div>
        ) : (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            {values.reduce((a, b) => a + b, 0)} Total
          </span>
        )}
      </div>

      <div className="relative mt-4 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#EFE9DF"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#EFE9DF"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#E2D9CC"
          />

          {/* Area fill */}
          <path d={areaD} fill="url(#trendGradient)" />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#84633F"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === idx ? 6 : 3.5}
                className={`cursor-pointer transition-all ${
                  hoveredIndex === idx
                    ? "fill-[#D4AF37] stroke-[#2C221E] stroke-2"
                    : "fill-[#84633F] stroke-white stroke-2"
                }`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="mt-2 flex justify-between px-2 text-[10px] text-stone-400">
          <span>{data[0]?.label}</span>
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.label}</span>
          )}
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
