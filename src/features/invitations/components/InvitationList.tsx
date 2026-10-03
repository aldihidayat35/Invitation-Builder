import Link from "next/link";
import type { InvitationSummary } from "../types";
import styles from "./invitations.module.css";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const STATUS_LABEL: Record<InvitationSummary["status"], string> = {
  draft: "Draft",
  published: "Dipublish",
  archived: "Diarsipkan",
};

export function InvitationList({
  invitations,
  emptyMessage,
}: {
  invitations: readonly InvitationSummary[];
  emptyMessage: string;
}) {
  if (invitations.length === 0) {
    return (
      <div className={styles.empty} data-testid="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }
  return (
    <ul className={styles.list} aria-label="Daftar undangan">
      {invitations.map((invitation) => (
        <li key={invitation.id} className={styles.card} data-testid="invitation-card">
          <span className={styles.badge} data-status={invitation.status}>
            {STATUS_LABEL[invitation.status]}
          </span>
          <h3 className={styles.cardName}>
            <Link href={`/dashboard/invitations/${invitation.id}`} data-testid="open-invitation">
              {invitation.title}
            </Link>
          </h3>
          <span className={styles.slug}>/i/{invitation.slug}</span>
          <span className={styles.meta}>Diubah {dateFormat.format(invitation.updatedAt)}</span>
          <div className={styles.cardActions}>
            <Link
              href={`/dashboard/invitations/${invitation.id}`}
              className={`${styles.secondary} ${styles.small}`}
            >
              Isi data &amp; tamu
            </Link>
            <Link
              href={`/dashboard/invitations/${invitation.id}/preview`}
              className={`${styles.secondary} ${styles.small}`}
            >
              Preview
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
