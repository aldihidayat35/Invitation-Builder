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
  const getBadgeClasses = () => {
    switch (tone) {
      case "gold":
        return "border-amber-200/80 bg-[#FEF3C7] text-[#D97706]";
      case "bronze":
        return "border-yellow-200/80 bg-[#FEF9C3] text-[#CA8A04]";
      case "emerald":
        return "border-emerald-200/80 bg-[#ECFDF5] text-[#059669]";
      default:
        return "border-blue-200/80 bg-[#EFF6FF] text-[#2563EB]";
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#1E293B]">
            {value}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${getBadgeClasses()}`}>
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${
                trend.neutral
                  ? "bg-slate-100 text-slate-600"
                  : trend.positive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
              }`}
            >
              {!trend.neutral && (trend.positive ? "↑" : "↓")} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-400 truncate text-[11.5px]">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
