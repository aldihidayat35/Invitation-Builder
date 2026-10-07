import React from "react";

export function DashboardFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200/70 bg-white/50 px-6 py-4 text-xs text-stone-500 backdrop-blur-xs">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-stone-700">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistem Aktif & Terlindungi
          </span>
          <span className="text-stone-300">·</span>
          <span>Platform Undangan Digital v1.2</span>
        </div>
        <p className="text-stone-400">
          © {new Date().getFullYear()} Invitation Studio. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
