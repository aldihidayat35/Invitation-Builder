import React, { type ReactNode } from "react";

interface KpiStatCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle?: string;
  readonly icon: ReactNode;
  readonly trend?: {
    readonly value: string;
    readonly positive?: boolean;
    readonly neutral?: boolean;
  };
  readonly tone?: "default" | "bronze" | "gold" | "emerald";
}

export function KpiStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  tone = "default",
}: KpiStatCardProps) {
  const getToneClasses = () => {
    switch (tone) {
      case "gold":
        return "border-[#D4AF37]/40 bg-gradient-to-br from-amber-50/60 to-white";
      case "bronze":
        return "border-[#84633F]/30 bg-gradient-to-br from-stone-50 to-white";
      case "emerald":
        return "border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white";
      default:
        return "border-stone-200/90 bg-white";
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md ${getToneClasses()}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-stone-500">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#2C221E] sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] border border-stone-200/80 text-[#84633F] shadow-2xs">
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${
                trend.neutral
                  ? "bg-stone-100 text-stone-600"
                  : trend.positive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
              }`}
            >
              {!trend.neutral && (trend.positive ? "↑" : "↓")} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-stone-400 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
