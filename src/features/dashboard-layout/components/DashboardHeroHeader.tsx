import React, { type ReactNode } from "react";

export interface DashboardHeroHeaderProps {
  /** Top eyebrow uppercase text, e.g. "WORKSPACE • DEV WORKSPACE" or category/role */
  eyebrow?: ReactNode;
  /** Main title of the page */
  title: ReactNode;
  /** Description or subtitle text */
  description?: ReactNode;
  /** Action buttons / elements on the right side */
  actions?: ReactNode;
  /** Optional extra classes */
  className?: string;
}

/**
 * Standardized dark espresso hero header banner for all dashboard pages.
 * Follows Stitch / Kencana Atelier design guidelines (#181513, Champagne Gold #D4AF37 accents).
 */
export function DashboardHeroHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: DashboardHeroHeaderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#181513] border border-[#262220] p-6 sm:p-8 text-white shadow-md ${className}`}
    >
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#D4AF37] uppercase mb-2.5">
              {typeof eyebrow === "string" ? <span>{eyebrow}</span> : eyebrow}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {title}
          </h1>

          {description && (
            <div className="mt-2.5 text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              {description}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
