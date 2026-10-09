import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GuestNotFoundError,
  InvitationNotFoundError,
  listGuests,
  preview,
  type PreviewGuestSelection,
} from "@/features/invitations/api";
import styles from "@/features/invitations/components/invitations.module.css";
import { DocumentRenderer } from "@/features/renderer";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getInvitationReview } from "@/features/orders/api";
import { ClientPortalAccessCard } from "@/features/orders/components";
import {
  decideInvitationReviewAction,
  regenerateInvitationClientTokenAction,
} from "../../actions";

export const metadata: Metadata = { title: "Preview undangan" };

function parseSelection(raw: string | string[] | undefined): PreviewGuestSelection {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value === "generic") return { kind: "generic" };
  if (value === "sample") return { kind: "sample" };
  return { kind: "guest", guestId: value };
}

/**
 * Dashboard preview (FR-PRV-001): the SAME HTML renderer the public page will
 * use, fed by `resolveDocument` with an explicit guest context. No Konva here.
 */
export default async function InvitationPreviewPage({
  params,
  searchParams,
}: PageProps<"/dashboard/invitations/[id]/preview">) {
  const { id } = await params;
  const query = await searchParams;
  const selection = parseSelection(query.guest);

  let model;
  try {
    model = await preview(id, selection);
  } catch (error) {
    if (error instanceof InvitationNotFoundError) notFound();
    // An unknown/archived guest id falls back to the generic context.
    if (error instanceof GuestNotFoundError) {
      model = await preview(id, { kind: "generic" });
    } else {
      throw error;
    }
  }
  const [guests, review] = await Promise.all([listGuests(id), getInvitationReview(id)]);
  const current =
    selection.kind === "guest" && model.guest.name !== undefined
      ? selection.guestId
      : selection.kind;

  return (
    <main className={styles.page}>
      <Link href={`/dashboard/invitations/${id}`} className={styles.breadcrumb}>
        ← Kembali ke data undangan
      </Link>
      <div className="mb-6">
        <DashboardHeroHeader
          eyebrow={`PREVIEW UNDANGAN • ${model.guestLabel.toUpperCase()}`}
          title={<span data-testid="preview-title">{model.invitation.title}</span>}
          description="Pratinjau tampilan undangan pernikahan digital seperti yang akan dilihat oleh tamu undangan Anda."
          actions={
            <Link
              href={`/dashboard/invitations/${id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
            >
              <span>Edit Data Undangan</span>
              <span>→</span>
            </Link>
          }
        />
      </div>

      {model.invitation.clientAccessToken ? (
        <div className="mb-6">
          <ClientPortalAccessCard
            token={model.invitation.clientAccessToken}
            customerName={model.invitation.title}
            invitationId={id}
            canRegenerate={true}
            regenerateAction={regenerateInvitationClientTokenAction}
          />
        </div>
      ) : null}

      <nav className={styles.previewBar} aria-label="Konteks tamu preview">
        <Link
          className={styles.chip}
          href={`/dashboard/invitations/${id}/preview`}
          aria-current={current === "generic" ? "true" : undefined}
        >
          Umum
        </Link>
        <Link
          className={styles.chip}
          href={`/dashboard/invitations/${id}/preview?guest=sample`}
          aria-current={current === "sample" ? "true" : undefined}
        >
          Tamu contoh
        </Link>
        {guests.map((guest) => (
          <Link
            key={guest.id}
            className={styles.chip}
            href={`/dashboard/invitations/${id}/preview?guest=${guest.id}`}
            aria-current={current === guest.id ? "true" : undefined}
          >
            {guest.name}
          </Link>
        ))}
      </nav>

      {model.resolved.ok ? null : (
        <p className={styles.formError} role="status" data-testid="preview-incomplete">
          Data belum lengkap: {model.resolved.issues.length} masalah pada binding. Lengkapi di Data
          Mode sebelum publish.
        </p>
      )}

      {review?.isClientReviewer ? (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
          aria-labelledby="client-review-title"
        >
          <h2 id="client-review-title" className="text-base font-bold text-stone-900">
            Persetujuan klien
          </h2>
          {review.productionStatus === "client_review" ? (
            <div className="mt-3 grid gap-4">
              <p className="text-sm leading-6 text-stone-700">
                Periksa nama, tanggal, lokasi, tautan, dan tampilan undangan. Setujui jika sudah
                final, atau tuliskan revisi yang spesifik agar tim produksi dapat
                menindaklanjutinya.
              </p>
              <form action={decideInvitationReviewAction} className="grid gap-3">
                <input type="hidden" name="invitationId" value={id} />
                <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
                  Catatan revisi
                  <textarea
                    name="note"
                    rows={3}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal"
                    placeholder="Wajib diisi bila meminta revisi"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white"
                  >
                    Setujui Undangan
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="request_revision"
                    className="min-h-11 rounded-xl border border-rose-300 bg-white px-5 text-sm font-bold text-rose-700"
                  >
                    Minta Revisi
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-700">
              Status review saat ini:{" "}
              <strong>{review.productionStatus.replaceAll("_", " ")}</strong>.
            </p>
          )}
        </section>
      ) : null}

      <div className={styles.previewFrame} data-testid="preview-frame">
        <DocumentRenderer document={model.resolved} runtimeMode="preview" />
      </div>
    </main>
  );
}
