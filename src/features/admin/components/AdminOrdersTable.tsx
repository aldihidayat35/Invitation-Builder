"use client";

import { useMemo, useState, useTransition } from "react";
import type { AdminOrderItem } from "../types";
import type { CustomerOrderStatus } from "@/lib/schema/domain";

interface AdminOrdersTableProps {
  orders: AdminOrderItem[];
  onUpdateStatus: (orderId: string, nextStatus: CustomerOrderStatus) => Promise<void>;
}

function getStatusBadge(status: CustomerOrderStatus) {
  switch (status) {
    case "new":
      return { label: "Pesanan Baru", className: "bg-amber-100 text-amber-900 border-amber-300" };
    case "in_review":
      return { label: "Sedang Ditinjau", className: "bg-purple-100 text-purple-900 border-purple-300" };
    case "in_progress":
      return { label: "Sedang Dikerjakan", className: "bg-blue-100 text-blue-900 border-blue-300" };
    case "completed":
      return { label: "Selesai & Terbit", className: "bg-emerald-100 text-emerald-900 border-emerald-300" };
    case "cancelled":
      return { label: "Dibatalkan", className: "bg-rose-100 text-rose-900 border-rose-300" };
    default:
      return { label: status, className: "bg-stone-100 text-stone-700 border-stone-200" };
  }
}

export function AdminOrdersTable({ orders, onUpdateStatus }: AdminOrdersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerEmail.toLowerCase().includes(q) ||
        item.customerWhatsapp.toLowerCase().includes(q) ||
        item.sellerName.toLowerCase().includes(q) ||
        (item.groomBrideNames && item.groomBrideNames.toLowerCase().includes(q)) ||
        (item.templateTitle && item.templateTitle.toLowerCase().includes(q));

      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const handleStatusChange = (orderId: string, nextStatus: CustomerOrderStatus) => {
    setActionTargetId(orderId);
    startTransition(async () => {
      try {
        await onUpdateStatus(orderId, nextStatus);
      } finally {
        setActionTargetId(null);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#2C221E]">
              Pusat Pemrosesan Pesanan Customer
            </h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-[#84633F] border border-amber-200/70">
              {filtered.length} pesanan
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Admin memiliki akses penuh mutlak untuk mengolah data dan membuat website undangan customer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            placeholder="Cari customer, seller, atau mempelai…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none sm:w-64"
            aria-label="Cari pesanan"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none"
            aria-label="Filter status pesanan"
          >
            <option value="all">Semua Status</option>
            <option value="new">Pesanan Baru</option>
            <option value="in_review">Sedang Ditinjau</option>
            <option value="in_progress">Sedang Dikerjakan</option>
            <option value="completed">Selesai & Terbit</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              <th className="py-3 px-3">Mitra Seller</th>
              <th className="py-3 px-3">Customer & Mempelai</th>
              <th className="py-3 px-3">Kontak WhatsApp</th>
              <th className="py-3 px-3">Pilihan Desain</th>
              <th className="py-3 px-3">Status Pengerjaan</th>
              <th className="py-3 px-3">Tanggal Order</th>
              <th className="py-3 px-3 text-right">Aksi Pengolahan Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <strong className="mt-3 block font-semibold text-stone-700">Tidak ada data pesanan</strong>
                  <p className="mt-1 text-xs text-stone-400">
                    {search ? "Coba ganti kata kunci pencarian Anda." : "Belum ada pesanan masuk dari toko seller."}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const badge = getStatusBadge(item.status);
                const waDigits = item.customerWhatsapp.replace(/\D/g, "");
                const waUrl = `https://wa.me/${waDigits.startsWith("0") ? "62" + waDigits.slice(1) : waDigits}`;
                const isTargetPending = isPending && actionTargetId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <strong className="block font-medium text-[#2C221E]">{item.sellerName}</strong>
                    </td>

                    <td className="py-3 px-3">
                      <div>
                        <strong className="block font-medium text-stone-900">{item.customerName}</strong>
                        {item.groomBrideNames && (
                          <div className="text-[11px] font-medium text-[#84633F]">
                            💍 {item.groomBrideNames}
                          </div>
                        )}
                        <div className="text-[11px] text-stone-400">{item.customerEmail}</div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                        </svg>
                        <span>{item.customerWhatsapp}</span>
                      </a>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-stone-700">
                        {item.templateTitle || "Belum memilih tema"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                        <select
                          value={item.status}
                          disabled={isTargetPending}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as CustomerOrderStatus)}
                          className="rounded-md border border-stone-200 bg-[#FAF8F5] px-2 py-1 text-[11px] text-stone-700 shadow-2xs hover:bg-white"
                        >
                          <option value="new">Ubah: Baru</option>
                          <option value="in_review">Ubah: Sedang Ditinjau</option>
                          <option value="in_progress">Ubah: Sedang Dikerjakan</option>
                          <option value="completed">Ubah: Selesai</option>
                          <option value="cancelled">Ubah: Dibatalkan</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-stone-400">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {item.invitationSlug ? (
                        <a
                          href={`/i/${item.invitationSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#84633F] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#715332]"
                        >
                          Lihat Web Undangan ↗
                        </a>
                      ) : (
                        <a
                          href="/dashboard/invitations"
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50"
                          title="Buat dan edit undangan untuk pesanan ini"
                        >
                          Olah Data Undangan
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
