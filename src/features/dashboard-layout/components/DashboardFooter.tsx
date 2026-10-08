import React from "react";

export function DashboardFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/70 px-6 py-4 text-xs text-slate-500 backdrop-blur-xs select-none">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistem Aktif & Terlindungi
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Platform Undangan Digital v1.2</span>
        </div>
        <p className="text-slate-400">
          © {new Date().getFullYear()} Invitation Studio · Kencana Atelier. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
