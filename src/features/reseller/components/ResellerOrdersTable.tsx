import Link from "next/link";
import type { ResellerOrderItem } from "../types";

function getStatusBadge(status: string) {
  switch (status) {
    case "new":
      return { label: "Pesanan Baru", className: "bg-amber-100 text-amber-900 border-amber-300" };
    case "qualified":
      return {
        label: "Ditinjau Admin",
        className: "bg-purple-100 text-purple-900 border-purple-300",
      };
    case "accepted":
      return { label: "Diproses Admin", className: "bg-blue-100 text-blue-900 border-blue-300" };
    case "rejected":
      return { label: "Ditolak", className: "bg-stone-100 text-stone-700 border-stone-300" };
    case "completed":
      return {
        label: "Selesai & Terbit",
        className: "bg-emerald-100 text-emerald-900 border-emerald-300",
      };
    case "cancelled":
      return { label: "Dibatalkan", className: "bg-rose-100 text-rose-900 border-rose-300" };
    default:
      return { label: status, className: "bg-stone-100 text-stone-700 border-stone-200" };
  }
}

export function ResellerOrdersTable({ orders }: { orders: ResellerOrderItem[] }) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      <div className="pb-4 border-b border-stone-100">
        <h3 className="text-base font-bold text-[#2C221E]">Daftar Pesanan Masuk Customer</h3>
        <p className="mt-1 text-xs text-stone-500">
          Pesanan customer yang masuk melalui website toko seller Anda. Pengolahan dan pengeditan
          data undangan dikelola langsung oleh Admin.
        </p>
      </div>

      <div className="my-4 flex items-center gap-3 rounded-xl border border-[#84633F]/20 bg-[#84633F]/5 p-3.5 text-xs text-[#2C221E]">
        <svg
          className="h-5 w-5 shrink-0 text-[#84633F]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <line x1="12" y1="16" x2="12" y2="12" strokeWidth={2} strokeLinecap="round" />
          <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <span>
          <strong>Ketentuan Otoritas Data:</strong> Seluruh pengubahan data teknis dan penerbitan
          website undangan dilakukan oleh Admin untuk memastikan keamanan & keakuratan data
          customer.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              <th className="py-3 px-3">Pemesan</th>
              <th className="py-3 px-3">Mempelai</th>
              <th className="py-3 px-3">Kontak WhatsApp</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Catatan Customer</th>
              <th className="py-3 px-3">Tanggal Masuk</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-stone-400">
                  Belum ada pesanan masuk dari customer. Bagikan link website toko Anda untuk mulai
                  menerima pesanan!
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const waNumber = order.customerWhatsapp.replace(/\D/g, "");
                const waHref = `https://wa.me/${waNumber.startsWith("0") ? "62" + waNumber.slice(1) : waNumber}`;

                return (
                  <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <strong className="block font-medium text-stone-900">
                        {order.customerName}
                      </strong>
                      <span className="text-[11px] text-stone-400">{order.customerEmail || "-"}</span>
                    </td>
                    <td className="py-3 px-3">
                      {order.groomBrideNames ? (
                        <span className="font-medium text-[#84633F]">
                          💍 {order.groomBrideNames}
                        </span>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                      >
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>{order.customerWhatsapp}</span>
                      </a>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-600 max-w-xs truncate">
                      {order.notes || "-"}
                    </td>
                    <td className="py-3 px-3 text-stone-400">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/dashboard/reseller/orders/${order.id}`}
                        className="inline-flex rounded-lg border border-[#84633F] px-3 py-1.5 font-semibold text-[#84633F]"
                      >
                        Detail
                      </Link>
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
