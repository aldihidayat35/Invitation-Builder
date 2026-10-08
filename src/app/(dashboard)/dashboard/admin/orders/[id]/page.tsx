import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getOrder, getProductionSetupOptions, OrderWorkflowError } from "@/features/orders/api";
import { ProductionSetupForm } from "@/features/orders/components/ProductionSetupForm";
import { requireOwner } from "@/lib/auth/server";
import type { CustomerOrderStatus, ProductionStatus } from "@/lib/schema/domain";
import {
  configureProductionAction,
  createOrderProjectAction,
  transitionOrderAction,
  transitionProductionAction,
  updatePaymentAction,
} from "../actions";

export const metadata: Metadata = { title: "Detail order" };

const orderLabels: Record<CustomerOrderStatus, string> = {
  new: "Baru",
  qualified: "Terkualifikasi",
  accepted: "Diterima",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

const productionLabels: Record<ProductionStatus, string> = {
  awaiting_client: "Menunggu konfigurasi",
  in_production: "Dalam produksi",
  client_review: "Review klien",
  revision_requested: "Revisi diminta",
  approved: "Disetujui klien",
  published: "Sudah terbit",
};

function dateTime(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "—";
}

function ActionButton({
  orderId,
  status,
  label,
  destructive = false,
  requireNote = false,
}: {
  orderId: string;
  status: CustomerOrderStatus;
  label: string;
  destructive?: boolean;
  requireNote?: boolean;
}) {
  return (
    <form
      action={transitionOrderAction}
      className="grid gap-2 rounded-xl border border-stone-200 p-3"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="nextStatus" value={status} />
      {requireNote ? (
        <input
          name="note"
          required
          placeholder="Alasan wajib diisi"
          className="min-h-10 rounded-lg border border-stone-200 px-3 text-sm"
        />
      ) : null}
      <button
        type="submit"
        className={`min-h-10 rounded-lg px-4 text-sm font-bold text-white ${destructive ? "bg-rose-700" : "bg-[#84633F]"}`}
      >
        {label}
      </button>
    </form>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/dashboard/admin/orders/[id]">) {
  const { id } = await params;
  const owner = await requireOwner();
  let detail;
  try {
    detail = await getOrder(id);
  } catch (error) {
    if (error instanceof OrderWorkflowError) notFound();
    throw error;
  }
  const options = await getProductionSetupOptions();
  const { order } = detail;
  const configured = Boolean(
    order.clientUserId && order.workspaceId && order.assignedTo && order.templateVersionId,
  );

  return (
    <main className="grid gap-6">
      <Link href="/dashboard/admin/orders" className="text-sm font-semibold text-[#84633F]">
        ← Kembali ke daftar order
      </Link>
      <DashboardHeroHeader
        eyebrow={`ORDER ${order.id.slice(0, 8).toUpperCase()}`}
        title={order.groomBrideNames || order.customerName}
        description="Satu pusat kendali untuk status komersial, handoff produksi, review klien, pembayaran, dan riwayat keputusan."
        actions={
          detail.invitation ? (
            <Link
              href={`/dashboard/invitations/${detail.invitation.id}`}
              className="rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-[#2C221E]"
            >
              Buka Proyek Undangan
            </Link>
          ) : null
        }
      />

      <section className="grid gap-4 md:grid-cols-3" aria-label="Status order">
        {[
          ["Status order", orderLabels[order.orderStatus]],
          ["Status produksi", productionLabels[order.productionStatus]],
          ["Status pembayaran", order.paymentStatus],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
            <p className="mt-2 text-lg font-bold capitalize text-stone-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Data pesanan</h2>
          <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-stone-500">Customer</dt>
            <dd>{order.customerName}</dd>
            <dt className="text-stone-500">Email</dt>
            <dd>{order.customerEmail}</dd>
            <dt className="text-stone-500">WhatsApp</dt>
            <dd>{order.customerWhatsapp}</dd>
            <dt className="text-stone-500">Seller</dt>
            <dd>{detail.seller.agencyName}</dd>
            <dt className="text-stone-500">Template</dt>
            <dd>{detail.template?.name ?? "Belum dipilih"}</dd>
            <dt className="text-stone-500">Acara</dt>
            <dd>{dateTime(order.eventDate)}</dd>
            <dt className="text-stone-500">Lokasi</dt>
            <dd>{order.eventLocation || "—"}</dd>
            <dt className="text-stone-500">Catatan</dt>
            <dd>{order.notes || "—"}</dd>
          </dl>
        </article>
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Handoff produksi</h2>
          <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-stone-500">Klien</dt>
            <dd>{detail.client?.name ?? "Belum ditetapkan"}</dd>
            <dt className="text-stone-500">Workspace</dt>
            <dd>{detail.workspace?.name ?? "Belum ditetapkan"}</dd>
            <dt className="text-stone-500">Assignee</dt>
            <dd>{detail.assignee?.name ?? "Belum ditetapkan"}</dd>
            <dt className="text-stone-500">Target</dt>
            <dd>{dateTime(order.dueAt)}</dd>
            <dt className="text-stone-500">Versi template</dt>
            <dd>
              {order.templateVersionId
                ? `Terkunci · ${order.templateVersionId.slice(0, 8)}`
                : "Belum dikunci"}
            </dd>
            <dt className="text-stone-500">Catatan internal</dt>
            <dd>{order.adminNotes || "—"}</dd>
          </dl>
        </article>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">Keputusan order</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {order.orderStatus === "new" ? (
            <>
              <ActionButton orderId={order.id} status="qualified" label="Tandai Terkualifikasi" />
              <ActionButton
                orderId={order.id}
                status="cancelled"
                label="Batalkan"
                destructive
                requireNote
              />
            </>
          ) : null}
          {order.orderStatus === "qualified" ? (
            <>
              <ActionButton orderId={order.id} status="accepted" label="Terima Order" />
              <ActionButton
                orderId={order.id}
                status="rejected"
                label="Tolak Order"
                destructive
                requireNote
              />
              <ActionButton
                orderId={order.id}
                status="cancelled"
                label="Batalkan"
                destructive
                requireNote
              />
            </>
          ) : null}
          {order.orderStatus === "accepted" ? (
            <ActionButton
              orderId={order.id}
              status="cancelled"
              label="Batalkan Order"
              destructive
              requireNote
            />
          ) : null}
          {["rejected", "cancelled", "completed"].includes(order.orderStatus) ? (
            <p className="text-sm text-stone-600">Order sudah berada pada status terminal.</p>
          ) : null}
        </div>
      </section>

      {order.orderStatus === "accepted" && !configured ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Konfigurasi produksi</h2>
          <p className="mb-4 mt-1 text-sm text-stone-600">
            Pilih klien, workspace, dan penanggung jawab. Versi template yang sedang terbit akan
            dikunci otomatis.
          </p>
          <ProductionSetupForm
            orderId={order.id}
            clients={options.clients}
            assignees={options.assignees}
            templates={options.templates}
            currentTemplateId={order.templateId}
            action={configureProductionAction}
          />
        </section>
      ) : null}

      {order.orderStatus === "accepted" && configured ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Workflow produksi</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {!order.invitationId && order.assignedTo === owner.id ? (
              <form action={createOrderProjectAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="min-h-11 rounded-xl bg-[#84633F] px-5 text-sm font-bold text-white">
                  Buat Proyek dari Versi Terkunci
                </button>
              </form>
            ) : null}
            {order.productionStatus === "in_production" ? (
              <form action={transitionProductionAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="nextStatus" value="client_review" />
                <button className="min-h-11 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white">
                  Kirim ke Review Klien
                </button>
              </form>
            ) : null}
            {order.productionStatus === "revision_requested" ? (
              <form action={transitionProductionAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="nextStatus" value="in_production" />
                <button className="min-h-11 rounded-xl bg-[#84633F] px-5 text-sm font-bold text-white">
                  Mulai Kerjakan Revisi
                </button>
              </form>
            ) : null}
            {order.productionStatus === "approved" && detail.invitation ? (
              <Link
                href={`/dashboard/invitations/${detail.invitation.id}`}
                className="min-h-11 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white"
              >
                Buka dan Publish Undangan
              </Link>
            ) : null}
          </div>
          {!order.invitationId && order.assignedTo !== owner.id ? (
            <p className="mt-3 text-sm text-amber-700">
              Proyek hanya dapat dibuat oleh assignee: {detail.assignee?.name}.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">Pembayaran</h2>
        <form action={updatePaymentAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input type="hidden" name="orderId" value={order.id} />
          <select
            name="paymentStatus"
            defaultValue={order.paymentStatus}
            className="min-h-11 rounded-xl border border-stone-200 px-3 text-sm"
          >
            <option value="unpaid">Belum dibayar</option>
            <option value="partial">Dibayar sebagian</option>
            <option value="paid">Lunas</option>
            <option value="refunded">Dikembalikan</option>
          </select>
          <input
            name="note"
            placeholder="Referensi atau catatan pembayaran"
            className="min-h-11 rounded-xl border border-stone-200 px-3 text-sm"
          />
          <button className="min-h-11 rounded-xl bg-stone-800 px-5 text-sm font-bold text-white">
            Simpan
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">Riwayat workflow</h2>
        {detail.events.length ? (
          <ol className="mt-4 grid gap-3">
            {detail.events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{event.eventType.replaceAll("_", " ")}</strong>
                  <time className="text-xs text-stone-500">{dateTime(event.createdAt)}</time>
                </div>
                {event.fromValue || event.toValue ? (
                  <p className="mt-1 text-stone-600">
                    {event.fromValue || "—"} → {event.toValue || "—"}
                  </p>
                ) : null}
                {event.note ? <p className="mt-1 text-stone-700">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-stone-500">Belum ada aktivitas workflow.</p>
        )}
      </section>
    </main>
  );
}
