"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ProductionStatus } from "@/lib/schema/domain";
import type { SnapshotSummary } from "../types";
import type { ActionState, InvitationAction } from "./action-state";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconExternalLink,
  IconSparkles,
  IconUser,
  IconWhatsApp,
} from "@/features/orders/components/OrderIcons";
import styles from "./invitations.module.css";

function RollbackButton({
  invitationId,
  revisionNo,
  rollback,
}: {
  invitationId: string;
  revisionNo: number;
  rollback: InvitationAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(rollback, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="revisionNo" value={revisionNo} />
      <button
        type="submit"
        className={`${styles.secondary} ${styles.small}`}
        disabled={pending}
        aria-label={`Jadikan revisi ${revisionNo} aktif`}
      >
        {pending ? "…" : "Aktifkan"}
      </button>
      {state.error ? (
        <p role="alert" className={styles.formError}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export interface OrderPublicationContext {
  id: string;
  customerName: string;
  customerWhatsapp: string | null;
  customerEmail?: string | null;
  productionStatus: ProductionStatus;
  orderStatus?: string;
  paymentStatus?: string;
  clientAccessToken: string | null;
  groomBrideNames?: string | null;
  dueAt?: Date | null;
}

/** Publish + revision history + rollback (FR-INV-004, FR-PUB-001..003) with Order Approval workflow. */
export function PublishPanel({
  invitationId,
  slug,
  status,
  ready,
  canWrite,
  snapshots,
  publish,
  rollback,
  orderContext,
  adminApprove,
  adminSendToReview,
}: {
  invitationId: string;
  slug: string;
  status: string;
  ready: boolean;
  canWrite: boolean;
  snapshots: readonly SnapshotSummary[];
  publish: InvitationAction;
  rollback: InvitationAction;
  orderContext?: OrderPublicationContext | null;
  adminApprove?: InvitationAction;
  adminSendToReview?: InvitationAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(publish, {});
  const [approveState, approveAction, approvePending] = useActionState<ActionState, FormData>(
    adminApprove ?? (async () => ({})),
    {},
  );
  const [reviewState, reviewAction, reviewPending] = useActionState<ActionState, FormData>(
    adminSendToReview ?? (async () => ({})),
    {},
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalNote, setModalNote] = useState("Klien konfirmasi via WhatsApp");
  const [copied, setCopied] = useState(false);

  // Close modal when approval succeeds
  const showModal = isModalOpen && !approveState.ok;

  const publicPath = `/i/${slug}`;
  const live = snapshots.some((snap) => snap.active);

  // Order approval gating
  const isLinkedToOrder = Boolean(orderContext);
  const isOrderApproved =
    !orderContext ||
    orderContext.productionStatus === "approved" ||
    orderContext.productionStatus === "published";

  // Pre-generate WhatsApp link if client details are available
  const cleanPhone = (orderContext?.customerWhatsapp || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = orderContext?.clientAccessToken
    ? `${origin}/c/${orderContext.clientAccessToken}`
    : "";
  const waReviewMessage = encodeURIComponent(
    `Halo kak ${orderContext?.customerName || "Klien"},\n\nDraft desain undangan pernikahan digital Kakak sudah siap untuk diperiksa:\n${portalUrl}\n\nSilakan buka tautan di atas untuk melihat preview desain dan menyetujui atau memberikan catatan revisi jika ada penyesuaian. Terima kasih! 🙏`,
  );
  const waReviewUrl =
    formattedPhone && orderContext?.clientAccessToken
      ? `https://wa.me/${formattedPhone}?text=${waReviewMessage}`
      : null;

  const handleCopyPortal = () => {
    if (portalUrl && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <section className={styles.panel} aria-labelledby="publish-title">
        <div className="flex items-center justify-between">
          <h2 id="publish-title" className={styles.panelTitle}>
            Publish
          </h2>
          {isLinkedToOrder ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              Order Workflow
            </span>
          ) : null}
        </div>

        {live ? (
          <p className={styles.okText} data-testid="public-url">
            Live: <a href={publicPath}>{publicPath}</a>
          </p>
        ) : (
          <p className={styles.muted}>Belum dipublish.</p>
        )}

        {/* Integration Card with Customer Order details & Workflow */}
        {orderContext ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600 flex items-center gap-1.5">
                <IconUser size={13} className="text-stone-500" />
                <span>Pesanan #{orderContext.id.slice(0, 8)}</span>
              </span>

              {/* Status Badge */}
              {orderContext.productionStatus === "approved" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  <IconCheckCircle size={12} />
                  <span>Disetujui Klien</span>
                </span>
              ) : orderContext.productionStatus === "published" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  <IconCheckCircle size={12} />
                  <span>Terbit & Selesai</span>
                </span>
              ) : orderContext.productionStatus === "client_review" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                  <IconClock size={12} />
                  <span>Review Klien</span>
                </span>
              ) : orderContext.productionStatus === "revision_requested" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
                  <IconAlertTriangle size={12} />
                  <span>Revisi Diminta</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800 border border-sky-200">
                  <IconSparkles size={12} />
                  <span>Draft di Studio</span>
                </span>
              )}
            </div>

            {/* Customer Details info */}
            <div className="text-xs space-y-1 text-stone-700 bg-white/70 p-2.5 rounded-lg border border-stone-200/60">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 text-[11px]">Nama Klien:</span>
                <span className="font-semibold text-stone-900">{orderContext.customerName}</span>
              </div>
              {orderContext.customerWhatsapp ? (
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 text-[11px]">WhatsApp:</span>
                  <span className="font-mono text-[11px]">{orderContext.customerWhatsapp}</span>
                </div>
              ) : null}
              <div className="pt-1 flex justify-end">
                <Link
                  href={`/dashboard/orders/${orderContext.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C5D2A] hover:text-[#664624] hover:underline"
                >
                  <span>Lihat Detail Pesanan</span>
                  <IconExternalLink size={11} />
                </Link>
              </div>
            </div>

            {/* Actions & Alerts based on current status */}
            {orderContext.productionStatus === "approved" ||
            orderContext.productionStatus === "published" ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-[11px] text-emerald-800 flex items-center gap-1.5">
                <IconCheckCircle size={14} className="shrink-0 text-emerald-600" />
                <span>Klien telah menyetujui desain ini. Undangan siap dipublikasikan.</span>
              </div>
            ) : orderContext.productionStatus === "client_review" ? (
              <div className="space-y-2.5">
                <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-[11px] text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <IconClock size={13} className="text-amber-700" />
                    <span>Menunggu Respon Klien di Portal</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Klien sedang meninjau draft undangan. Jika klien menyetujui langsung via WhatsApp atau telepon, Anda dapat menyetujuinya secara manual.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {waReviewUrl ? (
                    <a
                      href={waReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition"
                    >
                      <IconWhatsApp size={14} />
                      <span>Kirim Tautan via WhatsApp</span>
                      <IconExternalLink size={12} />
                    </a>
                  ) : null}

                  {portalUrl ? (
                    <button
                      type="button"
                      onClick={handleCopyPortal}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs transition"
                    >
                      <span>{copied ? "✓ Tautan Disalin!" : "Salin Tautan Portal Klien"}</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100/90 px-3 py-2 text-xs font-bold text-amber-900 transition"
                  >
                    <IconCheckCircle size={14} className="text-amber-700" />
                    <span>Setujui Manual oleh Admin</span>
                  </button>
                </div>
              </div>
            ) : (
              /* in_production / revision_requested / awaiting_client */
              <div className="space-y-2">
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Lengkapi data undangan. Setelah draft siap, kirimkan ke klien untuk direview atau setujui manual.
                </p>

                <div className="flex flex-col gap-1.5">
                  {adminSendToReview ? (
                    <form action={reviewAction}>
                      <input type="hidden" name="orderId" value={orderContext.id} />
                      <input type="hidden" name="invitationId" value={invitationId} />
                      <button
                        type="submit"
                        disabled={reviewPending}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#664624] hover:bg-[#2C221E] px-3 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-60"
                      >
                        <IconSparkles size={13} />
                        <span>{reviewPending ? "Memproses…" : "Kirim untuk Review Klien"}</span>
                      </button>
                    </form>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition"
                  >
                    <IconCheckCircle size={13} className="text-emerald-600" />
                    <span>Setujui Manual (Admin)</span>
                  </button>
                </div>

                {reviewState.error ? (
                  <p role="alert" className={styles.formError}>
                    {reviewState.error}
                  </p>
                ) : null}
                {reviewState.message ? (
                  <p role="status" className={styles.okText}>
                    {reviewState.message}
                  </p>
                ) : null}
              </div>
            )}

            {approveState.error ? (
              <p role="alert" className={styles.formError}>
                {approveState.error}
              </p>
            ) : null}
            {approveState.message ? (
              <p role="status" className={styles.okText}>
                {approveState.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Publish Form */}
        {canWrite && status !== "archived" ? (
          <form action={formAction}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <button
              id="publish-submit"
              type="submit"
              className={styles.primary}
              disabled={pending || !ready || !isOrderApproved}
              title={
                !isOrderApproved
                  ? "Undangan order belum disetujui oleh klien."
                  : !ready
                    ? "Lengkapi data wajib terlebih dahulu."
                    : undefined
              }
            >
              {pending ? "Mempublish…" : live ? "Publish ulang" : "Publish"}
            </button>

            {/* Validation & Approval warnings */}
            {!isOrderApproved ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 mt-2 flex items-start gap-2">
                <IconAlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">Persetujuan Klien Diperlukan</p>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Tombol Publish dinonaktifkan karena pesanan belum disetujui klien. Kirim link review ke klien atau gunakan tombol Setujui Manual.
                  </p>
                </div>
              </div>
            ) : !ready ? (
              <p className={styles.muted}>Lengkapi data wajib terlebih dahulu.</p>
            ) : null}

            {state.error ? (
              <p role="alert" className={styles.formError}>
                {state.error}
              </p>
            ) : null}
            {state.message ? (
              <p role="status" className={styles.okText}>
                {state.message}
              </p>
            ) : null}
          </form>
        ) : null}

        {snapshots.length > 0 ? (
          <ul className={styles.guestList} aria-label="Riwayat revisi">
            {snapshots.map((snap) => (
              <li key={snap.revisionNo} className={styles.guest} data-testid="snapshot-row">
                <span>
                  <strong>Revisi {snap.revisionNo}</strong>
                  {snap.active ? " · aktif" : ""}
                  <br />
                  <small>{snap.createdAt.toLocaleString("id-ID")}</small>
                </span>
                {canWrite && !snap.active && status !== "archived" ? (
                  <RollbackButton
                    invitationId={invitationId}
                    revisionNo={snap.revisionNo}
                    rollback={rollback}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Admin Manual Approval Modal Pop-up */}
      {showModal && orderContext ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <IconCheckCircle size={18} />
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  Setujui Manual oleh Admin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg p-1"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Tindakan ini menandai bahwa pesanan untuk <strong>{orderContext.customerName}</strong> telah disetujui di luar portal (misal konfirmasi melalui WhatsApp atau telepon). Status akan berubah menjadi <strong>Disetujui Klien</strong> dan tombol Publish akan aktif.
            </p>

            <form action={approveAction} className="space-y-4">
              <input type="hidden" name="orderId" value={orderContext.id} />
              <input type="hidden" name="invitationId" value={invitationId} />

              <div>
                <label htmlFor="admin-note" className="block text-xs font-semibold text-stone-700 mb-1">
                  Catatan Persetujuan (akan dicatat di audit log):
                </label>
                <input
                  id="admin-note"
                  type="text"
                  name="note"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Contoh: Klien konfirmasi via WhatsApp"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#8C5D2A]/30 focus:border-[#8C5D2A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={approvePending}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={approvePending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-60"
                >
                  <IconCheckCircle size={14} />
                  <span>{approvePending ? "Menyetujui…" : "Konfirmasi & Setujui"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
