import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getOrder, OrderWorkflowError } from "@/features/orders/api";
import { requireReseller } from "@/lib/auth/server";
import { qualifyOrderAction } from "../actions";

export const metadata: Metadata = { title: "Detail pesanan seller" };

export default async function ResellerOrderDetailPage({
  params,
}: PageProps<"/dashboard/reseller/orders/[id]">) {
  const { id } = await params;
  await requireReseller();
  let detail;
  try {
    detail = await getOrder(id);
  } catch (error) {
    if (error instanceof OrderWorkflowError) notFound();
    throw error;
  }
  const { order } = detail;

  return (
    <main className="grid gap-6">
      <Link href="/dashboard/reseller/orders" className="text-sm font-semibold text-[#84633F]">
        ← Kembali ke pesanan
      </Link>
      <DashboardHeroHeader
        eyebrow={`ORDER ${order.id.slice(0, 8).toUpperCase()}`}
        title={order.groomBrideNames || order.customerName}
        description="Periksa kelengkapan permintaan customer sebelum menyerahkannya ke tim produksi."
      />
      <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Data customer</h2>
          <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-stone-500">Nama</dt>
            <dd>{order.customerName}</dd>
            <dt className="text-stone-500">Email</dt>
            <dd>{order.customerEmail}</dd>
            <dt className="text-stone-500">WhatsApp</dt>
            <dd>{order.customerWhatsapp}</dd>
            <dt className="text-stone-500">Mempelai</dt>
            <dd>{order.groomBrideNames || "—"}</dd>
            <dt className="text-stone-500">Tanggal acara</dt>
            <dd>
              {order.eventDate
                ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(order.eventDate)
                : "—"}
            </dd>
            <dt className="text-stone-500">Lokasi</dt>
            <dd>{order.eventLocation || "—"}</dd>
            <dt className="text-stone-500">Template</dt>
            <dd>{detail.template?.name || "Belum dipilih"}</dd>
            <dt className="text-stone-500">Catatan</dt>
            <dd>{order.notes || "—"}</dd>
          </dl>
        </article>
        <aside className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Status</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <p>
              Order: <strong className="capitalize">{order.orderStatus}</strong>
            </p>
            <p>
              Produksi:{" "}
              <strong className="capitalize">{order.productionStatus.replaceAll("_", " ")}</strong>
            </p>
            <p>
              Pembayaran: <strong className="capitalize">{order.paymentStatus}</strong>
            </p>
          </div>
          {order.orderStatus === "new" ? (
            <form action={qualifyOrderAction} className="mt-5">
              <input type="hidden" name="orderId" value={order.id} />
              <button className="min-h-11 w-full rounded-xl bg-[#84633F] px-4 text-sm font-bold text-white">
                Data Lengkap, Kirim ke Admin
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-stone-600">
              Order sudah diserahkan. Perubahan status berikutnya dilakukan oleh tim produksi.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
