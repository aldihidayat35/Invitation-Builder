import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getOrder, getProductionSetupOptions, OrderWorkflowError } from "@/features/orders/api";
import {
  ClientPortalAccessCard,
  OrderWorkflowTimeline,
  OrderActionCallout,
  OrderSidebarActions,
  OrderTemplateManager,
  OrderStudioAccessCard,
  IconClipboard,
  IconUser,
  IconHeart,
  IconWhatsApp,
  IconMail,
  IconTag,
  IconPalette,
  IconCalendar,
  IconMapPin,
  IconBarChart,
  IconCreditCard,
  IconClock,
  IconArrowRight,
  IconSparkles,
  IconEdit,
  IconExternalLink,
  IconLock,
  IconEye,
} from "@/features/orders/components";
import { requireOwner } from "@/lib/auth/server";
import type { CustomerOrderStatus, ProductionStatus } from "@/lib/schema/domain";
import {
  changeOrderTemplateAction,
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ all?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const showAll = resolvedSearchParams?.all === "1";

  await requireOwner();
  let detail;
  try {
    detail = await getOrder(id);
  } catch (error) {
    if (error instanceof OrderWorkflowError) notFound();
    throw error;
  }

  const options = await getProductionSetupOptions();
  const { order } = detail;

  const isTerminalCancelled = order.orderStatus === "cancelled" || order.orderStatus === "rejected";

  // Hitung Tahap Alur Workflow Saat Ini (1 sampai 4)
  let activeStep = 1;
  if (order.orderStatus === "new" || order.orderStatus === "qualified") {
    activeStep = 1;
  } else if (order.orderStatus === "accepted" && !order.invitationId) {
    activeStep = 2;
  } else if (
    order.orderStatus === "accepted" &&
    Boolean(order.invitationId) &&
    (order.productionStatus === "awaiting_client" ||
      order.productionStatus === "in_production" ||
      order.productionStatus === "revision_requested")
  ) {
    activeStep = 3;
  } else if (
    order.productionStatus === "client_review" ||
    order.productionStatus === "approved" ||
    order.productionStatus === "published" ||
    order.orderStatus === "completed"
  ) {
    activeStep = 4;
  }

  const showStudioCard = showAll || (!isTerminalCancelled && activeStep >= 2);
  const showClientPortalCard = showAll || (!isTerminalCancelled && activeStep >= 4);

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
          className="font-semibold text-[#84633F] hover:text-[#664624] hover:underline flex items-center gap-1.5"
        >
          <span className="rotate-180 inline-block">
            <IconArrowRight size={13} />
          </span>
          <span>Kembali ke Daftar Pesanan</span>
        </Link>
        <span className="text-stone-300">/</span>
        <span className="font-mono text-stone-400">Order #{order.id.slice(0, 8)}</span>
      </div>

      {/* Hero Header */}
      <DashboardHeroHeader
        eyebrow={`SUPER ADMIN • PESANAN #${order.id.slice(0, 8).toUpperCase()}`}
        title={order.groomBrideNames || order.customerName}
        description={`Dipesan oleh ${order.customerName} melalui ${detail.seller?.agencyName ?? "Platform Langsung"}. Master template desain dapat diubah kapan saja. Hanya admin yang memiliki akses ke Editor Studio.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {detail.invitation ? (
              <Link
                href={`/dashboard/invitations/${detail.invitation.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C221E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#42352E] transition"
              >
                <IconEdit size={14} />
                <span>Buka Editor Studio</span>
              </Link>
            ) : null}
            {order.clientAccessToken ? (
              <Link
                href={`/c/${order.clientAccessToken}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2.5 text-xs font-bold text-[#664624] shadow-2xs transition"
              >
                <span>Portal Klien</span>
                <IconExternalLink size={13} />
              </Link>
            ) : null}
          </div>
        }
      />

      {/* 1. Visual Stepper Timeline (Workflow Pipeline 4 Tahap) */}
      <OrderWorkflowTimeline
        orderStatus={order.orderStatus}
        productionStatus={order.productionStatus}
        hasInvitationProject={Boolean(order.invitationId)}
      />

      {/* 2. Banner Rekomendasi Tindakan Berikutnya (Next Step Callout) */}
      <OrderActionCallout
        orderId={order.id}
        orderStatus={order.orderStatus}
        productionStatus={order.productionStatus}
        invitationId={detail.invitation?.id}
        invitationSlug={detail.invitation?.slug}
        clientAccessToken={order.clientAccessToken}
        transitionOrderAction={transitionOrderAction}
        createOrderProjectAction={createOrderProjectAction}
        transitionProductionAction={transitionProductionAction}
      />

      {/* Layout Grid 2 Kolom (2/3 Kiri Konten Utama, 1/3 Kanan Sidebar) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ==================== KOLOM KIRI (2 Kolom di Desktop) ==================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Banner jika dalam Mode Lengkap (showAll) */}
          {showAll && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <IconEye size={15} className="text-[#8C5D2A]" />
                <span className="font-semibold">
                  Mode Lengkap Aktif: Menampilkan seluruh bagian tahapan lebih awal.
                </span>
              </div>
              <Link
                href="?"
                className="font-bold underline hover:text-[#2C221E] transition"
              >
                Kembali ke Mode Bertahap
              </Link>
            </div>
          )}

          {/* Card 1: Data Lengkap Pemesan & Acara (Tahap 1) */}
          {/* Card: Master Template Desain (Bisa Diubah-Ubah) */}
          {/* Card: Akses Editor Studio (Khusus Admin) */}
          {/* Card: Link Portal Klien Calon Pengantin (Akses Mandiri) */}

          {/* RENDER BERDASARKAN TAHAP AKTIF: */}
          {activeStep === 1 ? (
            <>
              {/* Di Tahap 1: Tampilkan Data Pemesan untuk verifikasi dan Master Template Desain */}
              <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                        Tahap 1
                      </span>
                      <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
                        <IconClipboard size={16} className="text-[#84633F]" />
                        <span>Data Pemesan & Rincian Pernikahan</span>
                      </h3>
                    </div>
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
                      <IconWhatsApp size={14} className="text-emerald-600" />
                      <span>Chat WhatsApp</span>
                    </a>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-y-3 gap-x-4 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconUser size={13} className="text-stone-400" />
                      <span>Nama Pemesan</span>
                    </dt>
                    <dd className="mt-1 font-bold text-[#2C221E] text-sm">{order.customerName}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconHeart size={13} className="text-rose-400" />
                      <span>Nama Kedua Mempelai</span>
                    </dt>
                    <dd className="mt-1 font-bold text-[#8C5D2A] text-sm">
                      {order.groomBrideNames || "Belum dicantumkan"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconWhatsApp size={13} className="text-emerald-500" />
                      <span>Nomor WhatsApp</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">{order.customerWhatsapp}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconMail size={13} className="text-stone-400" />
                      <span>Alamat Email</span>
                    </dt>
                    <dd className="mt-1 font-medium text-stone-700">{order.customerEmail || "—"}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconTag size={13} className="text-stone-400" />
                      <span>Jalur Penjualan (Seller)</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {detail.seller?.agencyName ?? "Platform Langsung (Website)"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconPalette size={13} className="text-[#84633F]" />
                      <span>Master Template Terpasang</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {detail.template?.name ?? "Belum memilih tema"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconCalendar size={13} className="text-stone-400" />
                      <span>Tanggal Acara Pernikahan</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {dateTime(order.eventDate)}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconMapPin size={13} className="text-stone-400" />
                      <span>Lokasi / Tempat Acara</span>
                    </dt>
                    <dd className="mt-1 font-medium text-stone-700">
                      {order.eventLocation || "—"}
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

              {!isTerminalCancelled && (
                <OrderTemplateManager
                  orderId={order.id}
                  currentTemplateId={order.templateId}
                  currentTemplateName={detail.template?.name}
                  templates={options.templates}
                  invitationId={order.invitationId}
                  changeOrderTemplateAction={changeOrderTemplateAction}
                />
              )}

              {/* Jika dalam mode showAll, tampilkan juga kartu studio & portal */}
              {showAll && (
                <>
                  <OrderStudioAccessCard
                    orderId={order.id}
                    orderStatus={order.orderStatus}
                    productionStatus={order.productionStatus}
                    invitationId={order.invitationId}
                    clientAccessToken={order.clientAccessToken}
                    createOrderProjectAction={createOrderProjectAction}
                    transitionProductionAction={transitionProductionAction}
                  />
                  <ClientPortalAccessCard
                    token={order.clientAccessToken}
                    customerName={order.customerName}
                    customerWhatsapp={order.customerWhatsapp}
                    orderId={order.id}
                    canRegenerate={true}
                    regenerateAction={regenerateOrderClientTokenAction}
                  />
                </>
              )}
            </>
          ) : activeStep === 2 || activeStep === 3 ? (
            <>
              {/* Di Tahap 2 & 3: Tampilkan Studio Access Card di urutan teratas, diikuti Template Manager dan Data Pemesan */}
              <OrderStudioAccessCard
                orderId={order.id}
                orderStatus={order.orderStatus}
                productionStatus={order.productionStatus}
                invitationId={order.invitationId}
                clientAccessToken={order.clientAccessToken}
                createOrderProjectAction={createOrderProjectAction}
                transitionProductionAction={transitionProductionAction}
              />

              {!isTerminalCancelled && (
                <OrderTemplateManager
                  orderId={order.id}
                  currentTemplateId={order.templateId}
                  currentTemplateName={detail.template?.name}
                  templates={options.templates}
                  invitationId={order.invitationId}
                  changeOrderTemplateAction={changeOrderTemplateAction}
                />
              )}

              <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                        Tahap 1
                      </span>
                      <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
                        <IconClipboard size={16} className="text-[#84633F]" />
                        <span>Data Pemesan & Rincian Pernikahan</span>
                      </h3>
                    </div>
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
                      <IconWhatsApp size={14} className="text-emerald-600" />
                      <span>Chat WhatsApp</span>
                    </a>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-y-3 gap-x-4 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconUser size={13} className="text-stone-400" />
                      <span>Nama Pemesan</span>
                    </dt>
                    <dd className="mt-1 font-bold text-[#2C221E] text-sm">{order.customerName}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconHeart size={13} className="text-rose-400" />
                      <span>Nama Kedua Mempelai</span>
                    </dt>
                    <dd className="mt-1 font-bold text-[#8C5D2A] text-sm">
                      {order.groomBrideNames || "Belum dicantumkan"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconWhatsApp size={13} className="text-emerald-500" />
                      <span>Nomor WhatsApp</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">{order.customerWhatsapp}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconMail size={13} className="text-stone-400" />
                      <span>Alamat Email</span>
                    </dt>
                    <dd className="mt-1 font-medium text-stone-700">{order.customerEmail || "—"}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconTag size={13} className="text-stone-400" />
                      <span>Jalur Penjualan (Seller)</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {detail.seller?.agencyName ?? "Platform Langsung (Website)"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconPalette size={13} className="text-[#84633F]" />
                      <span>Master Template Terpasang</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {detail.template?.name ?? "Belum memilih tema"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconCalendar size={13} className="text-stone-400" />
                      <span>Tanggal Acara Pernikahan</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {dateTime(order.eventDate)}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconMapPin size={13} className="text-stone-400" />
                      <span>Lokasi / Tempat Acara</span>
                    </dt>
                    <dd className="mt-1 font-medium text-stone-700">
                      {order.eventLocation || "—"}
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

              {/* Jika dalam mode showAll, tampilkan juga kartu portal */}
              {showAll && (
                <ClientPortalAccessCard
                  token={order.clientAccessToken}
                  customerName={order.customerName}
                  customerWhatsapp={order.customerWhatsapp}
                  orderId={order.id}
                  canRegenerate={true}
                  regenerateAction={regenerateOrderClientTokenAction}
                />
              )}
            </>
          ) : activeStep === 4 ? (
            <>
              {/* Di Tahap 4: Tampilkan Portal Klien di posisi teratas, diikuti Studio Card, Template Manager, dan Data Pemesan */}
              <ClientPortalAccessCard
                token={order.clientAccessToken}
                customerName={order.customerName}
                customerWhatsapp={order.customerWhatsapp}
                orderId={order.id}
                canRegenerate={true}
                regenerateAction={regenerateOrderClientTokenAction}
              />

              <OrderStudioAccessCard
                orderId={order.id}
                orderStatus={order.orderStatus}
                productionStatus={order.productionStatus}
                invitationId={order.invitationId}
                clientAccessToken={order.clientAccessToken}
                createOrderProjectAction={createOrderProjectAction}
                transitionProductionAction={transitionProductionAction}
              />

              {!isTerminalCancelled && (
                <OrderTemplateManager
                  orderId={order.id}
                  currentTemplateId={order.templateId}
                  currentTemplateName={detail.template?.name}
                  templates={options.templates}
                  invitationId={order.invitationId}
                  changeOrderTemplateAction={changeOrderTemplateAction}
                />
              )}

              <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                        Tahap 1
                      </span>
                      <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
                        <IconClipboard size={16} className="text-[#84633F]" />
                        <span>Data Pemesan & Rincian Pernikahan</span>
                      </h3>
                    </div>
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
                      <IconWhatsApp size={14} className="text-emerald-600" />
                      <span>Chat WhatsApp</span>
                    </a>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-y-3 gap-x-4 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconUser size={13} className="text-stone-400" />
                      <span>Nama Pemesan</span>
                    </dt>
                    <dd className="mt-1 font-bold text-[#2C221E] text-sm">{order.customerName}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconHeart size={13} className="text-rose-400" />
                      <span>Nama Kedua Mempelai</span>
                    </dt>
                    <dd className="mt-1 font-bold text-[#8C5D2A] text-sm">
                      {order.groomBrideNames || "Belum dicantumkan"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconWhatsApp size={13} className="text-emerald-500" />
                      <span>Nomor WhatsApp</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">{order.customerWhatsapp}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconMail size={13} className="text-stone-400" />
                      <span>Alamat Email</span>
                    </dt>
                    <dd className="mt-1 font-medium text-stone-700">{order.customerEmail || "—"}</dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconTag size={13} className="text-stone-400" />
                      <span>Jalur Penjualan (Seller)</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {detail.seller?.agencyName ?? "Platform Langsung (Website)"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconPalette size={13} className="text-[#84633F]" />
                      <span>Master Template Terpasang</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {detail.template?.name ?? "Belum memilih tema"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconCalendar size={13} className="text-stone-400" />
                      <span>Tanggal Acara Pernikahan</span>
                    </dt>
                    <dd className="mt-1 font-semibold text-[#2C221E]">
                      {dateTime(order.eventDate)}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-100 bg-[#FAF8F5]/60 p-3">
                    <dt className="text-stone-500 font-medium flex items-center gap-1.5">
                      <IconMapPin size={13} className="text-stone-400" />
                      <span>Lokasi / Tempat Acara</span>
                    </dt>
                    <dd className="mt-1 font-medium text-stone-700">
                      {order.eventLocation || "—"}
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
            </>
          ) : (
            /* Jika Terminal Cancelled / Rejected */
            <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
                  <IconClipboard size={16} className="text-[#84633F]" />
                  <span>Data Pemesan & Rincian Pernikahan</span>
                </h3>
              </div>
              <p className="mt-4 text-xs text-stone-500">
                Pesanan ini telah berstatus {order.orderStatus === "rejected" ? "ditolak" : "dibatalkan"}. Pengerjaan produksi dan review klien tidak aktif.
              </p>
            </article>
          )}

          {/* Indikator Bagian Tahapan yang Belum Aktif (Disembunyikan) */}
          {!showAll && !isTerminalCancelled && activeStep < 4 && (
            <div className="rounded-2xl border border-dashed border-[#D9CFC4] bg-[#FAF8F5]/80 p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-200/70 text-stone-500">
                <IconLock size={18} />
              </div>
              <h4 className="mt-2.5 text-xs font-bold text-[#2C221E]">
                {activeStep === 1
                  ? "Tahap 3 (Editor Studio) & Tahap 4 (Portal Review Klien) Disembunyikan"
                  : "Tahap 4 (Portal Review Klien) Masih Disembunyikan"}
              </h4>
              <p className="mt-1 text-[11px] text-stone-500 max-w-md mx-auto leading-relaxed">
                {activeStep === 1
                  ? "Bagian pengerjaan Studio dan Portal Review Klien akan otomatis terbuka saat pesanan disetujui (Tahap 2)."
                  : activeStep === 2
                    ? "Bagian Portal Review Klien akan terbuka setelah desain dirakit di Studio dan dikirim ke review klien."
                    : "Bagian Portal Review Klien akan terbuka saat Anda mengklik tombol 'Kirim ke Klien untuk Review'."}
              </p>
              <div className="mt-3.5 flex justify-center">
                <Link
                  href="?all=1"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 hover:text-[#664624] shadow-2xs transition"
                >
                  <IconEye size={12} />
                  <span>Paksa Tampilkan Semua Bagian Lebih Awal</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ==================== KOLOM KANAN (Sidebar - 1/3 di Desktop) ==================== */}
        <div className="space-y-6">
          {/* Card Sidebar 1: Ringkasan Status Cepat */}
          <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-[#2C221E] text-sm border-b border-stone-100 pb-3 flex items-center gap-2">
              <IconBarChart size={16} className="text-[#84633F]" />
              <span>Status Ringkas Pesanan</span>
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
              <IconCreditCard size={16} className="text-[#84633F]" />
              <span>Manajemen Pembayaran</span>
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
              <IconClock size={16} className="text-[#84633F]" />
              <span>Riwayat Aktivitas & Workflow</span>
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
