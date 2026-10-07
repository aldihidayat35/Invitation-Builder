import React from "react";

export interface DonutSegment {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

interface StatusDonutChartProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly segments: readonly DonutSegment[];
  readonly totalLabel?: string;
}

export function StatusDonutChart({
  title,
  subtitle,
  segments,
  totalLabel = "Total",
}: StatusDonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // SVG Donut geometry
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      <div>
        <h3 className="text-sm font-bold text-[#2C221E]">{title}</h3>
        {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
      </div>

      <div className="mt-4 flex flex-col items-center justify-center gap-6 sm:flex-row">
        {/* SVG Donut */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            {/* Background Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#EFE9DF"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {total > 0 &&
              segments.map((seg, idx) => {
                const fraction = seg.value / total;
                const strokeDasharray = `${fraction * circumference} ${circumference}`;
                const strokeDashoffset = -cumulativeAngle * circumference;
                cumulativeAngle += fraction;

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                );
              })}
          </svg>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-[#2C221E] leading-tight">
              {total}
            </span>
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
              {totalLabel}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex w-full flex-col gap-2.5 sm:w-auto">
          {segments.map((seg, idx) => {
            const percent = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-medium text-stone-600">{seg.label}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[#2C221E]">
                  <span>{seg.value}</span>
                  <span className="text-[11px] font-normal text-stone-400">
                    ({percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
