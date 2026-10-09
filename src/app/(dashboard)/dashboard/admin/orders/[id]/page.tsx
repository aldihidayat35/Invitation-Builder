import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getOrder, getProductionSetupOptions, OrderWorkflowError } from "@/features/orders/api";
import {
  ClientPortalAccessCard,
  ProductionSetupForm,
  OrderWorkflowTimeline,
  OrderActionCallout,
  OrderSidebarActions,
} from "@/features/orders/components";
import { requireOwner } from "@/lib/auth/server";
import type { CustomerOrderStatus, ProductionStatus } from "@/lib/schema/domain";
import {
  configureProductionAction,
  createOrderProjectAction,
  regenerateOrderClientTokenAction,
  transitionOrderAction,
  transitionProductionAction,
  updatePaymentAction,
} from "../actions";

export const metadata: Metadata = { title: "Detail Order — Pusat Pengolahan Pesanan" };

const orderBadgeConfig: Record<CustomerOrderStatus, { label: string; className: string }> = {
  new: { label: "Baru Masuk", className: "bg-amber-100 text-[#8C5D2A] border-amber-300" },
  qualified: { label: "Terkualifikasi", className: "bg-blue-100 text-blue-900 border-blue-300" },
  accepted: { label: "Diterima", className: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  rejected: { label: "Ditolak", className: "bg-rose-100 text-rose-900 border-rose-300" },
  cancelled: { label: "Dibatalkan", className: "bg-stone-200 text-stone-700 border-stone-300" },
  completed: { label: "Selesai", className: "bg-purple-100 text-purple-900 border-purple-300" },
};

const productionBadgeConfig: Record<ProductionStatus, { label: string; className: string }> = {
  awaiting_client: { label: "Menunggu Konfigurasi", className: "bg-amber-50 text-amber-800 border-amber-200" },
  in_production: { label: "Dalam Produksi", className: "bg-blue-50 text-blue-800 border-blue-200" },
  client_review: { label: "Review Klien", className: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  revision_requested: { label: "Revisi Diminta", className: "bg-rose-50 text-rose-800 border-rose-200" },
  approved: { label: "Disetujui Klien", className: "bg-teal-50 text-teal-800 border-teal-200" },
  published: { label: "Sudah Terbit (Live)", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const paymentBadgeConfig: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Belum Dibayar", className: "bg-rose-50 text-rose-700 border-rose-200" },
  partial: { label: "Dibayar Sebagian (DP)", className: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "Lunas", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  refunded: { label: "Dikembalikan (Refund)", className: "bg-stone-100 text-stone-600 border-stone-200" },
};

function dateTime(value: Date | string | null): string {
  if (!value) return "—";
  const dateObj = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(dateObj.getTime())
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(dateObj)
    : "—";
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
    order.workspaceId && order.assignedTo && order.templateVersionId,
  );

  const cleanPhone = (order.customerWhatsapp || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
  const waUrl = formattedPhone ? `https://wa.me/${formattedPhone}` : null;

  const orderBadge = orderBadgeConfig[order.orderStatus] || {
    label: order.orderStatus,
    className: "bg-stone-100 text-stone-700 border-stone-200",
  };
  const productionBadge = productionBadgeConfig[order.productionStatus] || {
    label: order.productionStatus,
    className: "bg-stone-100 text-stone-700 border-stone-200",
  };
  const paymentBadge = paymentBadgeConfig[order.paymentStatus] || {
    label: order.paymentStatus,
    className: "bg-stone-100 text-stone-700 border-stone-200",
  };

  return (
    <main className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard/admin/orders"
          className="font-semibold text-[#84633F] hover:text-[#664624] hover:underline flex items-center gap-1"
        >
          <span>←</span> Kembali ke Daftar Pesanan
        </Link>
        <span className="text-stone-300">/</span>
        <span className="font-mono text-stone-400">Order #{order.id.slice(0, 8)}</span>
      </div>

      {/* Hero Header */}
      <DashboardHeroHeader
        eyebrow={`SUPER ADMIN • PESANAN #${order.id.slice(0, 8).toUpperCase()}`}
        title={order.groomBrideNames || order.customerName}
        description={`Dipesan oleh ${order.customerName} melalui ${detail.seller?.agencyName ?? "Platform Langsung"}. Kelola alur persetujuan, handoff produksi, review klien, dan pembayaran di sini.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {detail.invitation ? (
              <Link
                href={`/editor/${detail.invitation.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#42352E] transition"
              >
                <span>✏️ Buka di Editor Studio</span>
              </Link>
            ) : null}
            {detail.invitation ? (
              <Link
                href={`/dashboard/invitations/${detail.invitation.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-4 py-2.5 text-xs font-bold text-[#2C221E] shadow-xs transition"
              >
                <span>📁 Detail Undangan</span>
              </Link>
            ) : null}
          </div>
        }
      />

      {/* 1. Visual Stepper Timeline (Workflow Pipeline 5 Tahap) */}
      <OrderWorkflowTimeline
        orderStatus={order.orderStatus}
        productionStatus={order.productionStatus}
        isConfigured={configured}
        hasInvitationProject={Boolean(order.invitationId)}
      />

      {/* 2. Banner Rekomendasi Tindakan Berikutnya (Next Step Callout) */}
      <OrderActionCallout
        orderId={order.id}
        orderStatus={order.orderStatus}
        productionStatus={order.productionStatus}
        isConfigured={configured}
        invitationId={detail.invitation?.id}
        invitationSlug={detail.invitation?.slug}
        assigneeName={detail.assignee?.name}
        isAssignee={Boolean(order.assignedTo === owner.id)}
        clientAccessToken={order.clientAccessToken}
        transitionOrderAction={transitionOrderAction}
        createOrderProjectAction={createOrderProjectAction}
        transitionProductionAction={transitionProductionAction}
      />

      {/* Layout Grid 2 Kolom (2/3 Kiri Konten Utama, 1/3 Kanan Sidebar) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ==================== KOLOM KIRI (2 Kolom di Desktop) ==================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Data Lengkap Pemesan & Acara */}
          <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
                  <span>📋</span> Data Pemesan & Rincian Pernikahan
                </h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  Data yang dikirimkan calon pengantin saat memesan dari formulir website.
                </p>
              </div>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                  </svg>
                  <span>Chat WhatsApp</span>
                </a>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-y-3 gap-x-4 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Nama Pemesan</dt>
                <dd className="mt-1 font-bold text-[#2C221E] text-sm">{order.customerName}</dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Nama Kedua Mempelai</dt>
                <dd className="mt-1 font-bold text-[#8C5D2A] text-sm">
                  💍 {order.groomBrideNames || "Belum dicantumkan"}
                </dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Nomor WhatsApp</dt>
                <dd className="mt-1 font-semibold text-[#2C221E]">{order.customerWhatsapp}</dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Alamat Email</dt>
                <dd className="mt-1 font-medium text-stone-700">{order.customerEmail || "—"}</dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Jalur Penjualan (Seller)</dt>
                <dd className="mt-1 font-semibold text-[#2C221E]">
                  {detail.seller?.agencyName ?? "Platform Langsung (Website)"}
                </dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Master Template Dipilih</dt>
                <dd className="mt-1 font-semibold text-[#2C221E]">
                  🎨 {detail.template?.name ?? "Belum memilih tema"}
                </dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Tanggal Acara Pernikahan</dt>
                <dd className="mt-1 font-semibold text-[#2C221E]">
                  📅 {dateTime(order.eventDate)}
                </dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                <dt className="text-stone-500 font-medium">Lokasi / Tempat Acara</dt>
                <dd className="mt-1 font-medium text-stone-700">
                  📍 {order.eventLocation || "—"}
                </dd>
              </div>

              <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3 sm:col-span-2">
                <dt className="text-stone-500 font-medium">Catatan Khusus dari Pemesan</dt>
                <dd className="mt-1 text-stone-700 italic">
                  &ldquo;{order.notes || "Tidak ada catatan khusus dari pemesan."}&rdquo;
                </dd>
              </div>
            </dl>
          </article>

          {/* Card 2: Konfigurasi Produksi / Handoff Studio Card */}
          <article
            id="konfigurasi-produksi"
            className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
                  <span>⚙️</span> Konfigurasi Handoff Studio & Desain
                </h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  Penetapan workspace, penguncian versi master template, dan penugasan desainer.
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${
                  configured
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {configured ? "✓ Terkonfigurasi" : "Belum Dikonfigurasi"}
              </span>
            </div>

            {/* Tampilkan Form Jika Belum Dikonfigurasi dan Order Telah Diterima */}
            {order.orderStatus === "accepted" && !configured ? (
              <div className="mt-4">
                <ProductionSetupForm
                  orderId={order.id}
                  workspaces={options.workspaces}
                  assignees={options.assignees}
                  templates={options.templates}
                  currentTemplateId={order.templateId}
                  action={configureProductionAction}
                />
              </div>
            ) : null}

            {/* Tampilkan Status Jika Masih Status Baru (Belum Diterima) */}
            {order.orderStatus !== "accepted" && !configured ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-[#FAF8F5] p-5 text-center text-xs text-stone-500">
                <p>
                  Konfigurasi produksi akan otomatis terbuka setelah status pesanan disetujui (diterima) oleh Admin.
                </p>
              </div>
            ) : null}

            {/* Tampilkan Rincian Jika Sudah Dikonfigurasi */}
            {configured ? (
              <div className="mt-4 space-y-4">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium">Workspace Produksi</dt>
                    <dd className="mt-1 font-bold text-[#2C221E]">
                      🏢 {detail.workspace?.name ?? "Belum ditentukan"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium">Master Template Terkunci</dt>
                    <dd className="mt-1 font-bold text-[#8C5D2A]">
                      🔒 {detail.template?.name ?? "Master"} (Versi #{order.templateVersionId?.slice(0, 8)})
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium">Penanggung Jawab Desainer</dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      👤 {detail.assignee?.name ?? "Belum ditentukan"} ({detail.assignee?.email})
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium">Target Tenggat Waktu (Deadline)</dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      ⏰ {dateTime(order.dueAt)}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3 sm:col-span-2">
                    <dt className="text-stone-500 font-medium">Catatan Internal Produksi</dt>
                    <dd className="mt-1 text-stone-700 italic">
                      {order.adminNotes || "Tidak ada catatan internal."}
                    </dd>
                  </div>
                </dl>

                {/* Tombol Pembuatan / Akses Proyek Undangan */}
                <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                  {!order.invitationId && order.assignedTo === owner.id ? (
                    <form action={createOrderProjectAction} className="w-full sm:w-auto">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        className="w-full sm:w-auto rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition flex items-center justify-center gap-2"
                      >
                        <span>Buat Proyek dari Versi Terkunci Sekarang</span>
                        <span>➔</span>
                      </button>
                    </form>
                  ) : null}

                  {detail.invitation ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/editor/${detail.invitation.id}`}
                        className="rounded-xl bg-[#2C221E] px-4 py-2 text-xs font-bold text-white hover:bg-[#42352E] transition flex items-center gap-1.5"
                      >
                        <span>✏️ Buka di Editor Studio</span>
                      </Link>
                      <Link
                        href={`/dashboard/invitations/${detail.invitation.id}`}
                        className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] transition"
                      >
                        Lihat Proyek di Dashboard
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>

          {/* Card 3: Link Portal Klien Calon Pengantin (Akses Mandiri) */}
          <ClientPortalAccessCard
            token={order.clientAccessToken}
            customerName={order.customerName}
            customerWhatsapp={order.customerWhatsapp}
            orderId={order.id}
            canRegenerate={true}
            regenerateAction={regenerateOrderClientTokenAction}
          />
        </div>

        {/* ==================== KOLOM KANAN (Sidebar - 1/3 di Desktop) ==================== */}
        <div className="space-y-6">
          {/* Card Sidebar 1: Ringkasan Status Cepat */}
          <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-[#2C221E] text-sm border-b border-stone-100 pb-3 flex items-center gap-2">
              <span>📊</span> Status Ringkas Pesanan
            </h3>

            <div className="mt-4 space-y-3.5">
              <div>
                <span className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Status Komersial (Order)
                </span>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${orderBadge.className}`}
                  >
                    {orderBadge.label}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400 capitalize">
                    {order.orderStatus}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Status Produksi Studio
                </span>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${productionBadge.className}`}
                  >
                    {productionBadge.label}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    {order.productionStatus}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Status Pembayaran
                </span>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${paymentBadge.className}`}
                  >
                    {paymentBadge.label}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400 capitalize">
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* Card Sidebar 2: Pembaruan Pembayaran */}
          <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-[#2C221E] text-sm border-b border-stone-100 pb-3 flex items-center gap-2">
              <span>💳</span> Manajemen Pembayaran
            </h3>

            <form action={updatePaymentAction} className="mt-4 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className="block text-xs font-semibold text-[#2C221E] mb-1">
                  Status Pembayaran Customer
                </label>
                <select
                  name="paymentStatus"
                  defaultValue={order.paymentStatus}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-[#2C221E] outline-none shadow-2xs focus:border-[#84633F]"
                >
                  <option value="unpaid">Belum Dibayar</option>
                  <option value="partial">Dibayar Sebagian (DP)</option>
                  <option value="paid">Lunas (Selesai)</option>
                  <option value="refunded">Dikembalikan (Refund)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C221E] mb-1">
                  Catatan / Bukti Referensi
                </label>
                <input
                  name="note"
                  placeholder="Mis. Transfer BCA no. ref #98213"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-[#2C221E] outline-none shadow-2xs focus:border-[#84633F]"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-stone-800 hover:bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-2xs transition"
              >
                Simpan Status Pembayaran
              </button>
            </form>
          </article>

          {/* Card Sidebar 3: Zona Bahaya & Pembatalan (Dengan Konfirmasi Aman) */}
          <OrderSidebarActions
            orderId={order.id}
            orderStatus={order.orderStatus}
            transitionOrderAction={transitionOrderAction}
          />

          {/* Card Sidebar 4: Riwayat Workflow & Audit Log */}
          <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-[#2C221E] text-sm border-b border-stone-100 pb-3 flex items-center gap-2">
              <span>⏱️</span> Riwayat Aktivitas & Workflow
            </h3>

            {detail.events.length ? (
              <ol className="mt-4 space-y-3">
                {detail.events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-stone-100 bg-[#FAF8F5]/80 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#2C221E] font-semibold capitalize">
                        {event.eventType.replaceAll("_", " ")}
                      </strong>
                      <time className="text-[10px] text-stone-400 font-mono">
                        {dateTime(event.createdAt)}
                      </time>
                    </div>

                    {event.fromValue || event.toValue ? (
                      <p className="mt-1 text-[11px] text-stone-600 font-medium">
                        <span className="text-stone-400">{event.fromValue || "—"}</span>
                        {" → "}
                        <span className="text-[#8C5D2A] font-bold">{event.toValue || "—"}</span>
                      </p>
                    ) : null}

                    {event.note ? (
                      <p className="mt-1 text-[11px] text-stone-700 italic bg-white p-1.5 rounded border border-[#EBDCCB]/50">
                        &ldquo;{event.note}&rdquo;
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-xs text-stone-400 text-center py-4">
                Belum ada catatan aktivitas workflow.
              </p>
            )}
          </article>
        </div>
      </div>
    </main>
  );
}
