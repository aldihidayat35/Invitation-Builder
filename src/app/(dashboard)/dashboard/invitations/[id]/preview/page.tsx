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
  const guests = await listGuests(id);
  const current =
    selection.kind === "guest" && model.guest.name !== undefined
      ? selection.guestId
      : selection.kind;

  return (
    <main className={styles.page}>
      <Link href={`/dashboard/invitations/${id}`} className={styles.breadcrumb}>
        ← Kembali ke data
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Preview · {model.guestLabel}</p>
          <h1 className={styles.title} data-testid="preview-title">
            {model.invitation.title}
          </h1>
        </div>
      </header>

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

      <div className={styles.previewFrame} data-testid="preview-frame">
        <DocumentRenderer document={model.resolved} runtimeMode="preview" />
      </div>
    </main>
  );
}
