import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitationNotFoundError, open } from "@/features/invitations/api";
import styles from "@/features/invitations/components/invitations.module.css";
import { rsvpsFor } from "@/features/rsvp/api";
import { totalsOf } from "@/features/rsvp/schemas";
import { DashboardHeroHeader } from "@/features/dashboard-layout";

export const metadata: Metadata = { title: "RSVP undangan" };

/** Basic RSVP dashboard: totals + responses for one invitation (FR-WDG-005). */
export default async function InvitationRsvpPage({
  params,
}: PageProps<"/dashboard/invitations/[id]/rsvp">) {
  const { id } = await params;
  let invitation;
  try {
    invitation = await open(id);
  } catch (error) {
    if (error instanceof InvitationNotFoundError) notFound();
    throw error;
  }
  const rows = await rsvpsFor(invitation.id);
  const totals = totalsOf(rows);

  return (
    <main className={styles.page}>
      <Link href={`/dashboard/invitations/${invitation.id}`} className={styles.breadcrumb}>
        ← Kembali ke {invitation.title}
      </Link>
      <div className="mb-6">
        <DashboardHeroHeader
          eyebrow={`BUKU TAMU RSVP • ${invitation.title.toUpperCase()}`}
          title="Daftar Respons & Kehadiran RSVP"
          description="Pantau konfirmasi kehadiran dan pesan ucapan doa dari para tamu undangan secara realtime."
          actions={
            <Link
              href={`/dashboard/invitations/${invitation.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
            >
              <span>← Data Undangan</span>
            </Link>
          }
        />
      </div>
      <section className={styles.panel} aria-label="Ringkasan RSVP" data-testid="rsvp-totals">
        <p>
          Hadir: <strong>{totals.attending}</strong> ({totals.attendingParty} orang) · Tidak hadir:{" "}
          <strong>{totals.notAttending}</strong> · Total respons: <strong>{rows.length}</strong>
        </p>
      </section>
      {rows.length === 0 ? (
        <p className={styles.muted}>Belum ada respons.</p>
      ) : (
        <ul className={styles.guestList} aria-label="Daftar respons">
          {rows.map((row) => (
            <li key={row.id} className={styles.guest} data-testid="rsvp-row">
              <span>
                <strong>{row.name}</strong> ·{" "}
                {row.response === "attending" ? `hadir (${row.partySize})` : "tidak hadir"}
                {row.message ? (
                  <>
                    <br />
                    <q>{row.message}</q>
                  </>
                ) : null}
              </span>
              <small>{row.createdAt.toLocaleString("id-ID")}</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
