import Link from "next/link";
import type { InvitationSummary } from "../types";
import styles from "./invitations.module.css";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

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
          <span className={styles.meta}>
            {invitation.status} · Diubah {dateFormat.format(invitation.updatedAt)}
          </span>
          <h3 className={styles.cardName}>
            <Link href={`/dashboard/invitations/${invitation.id}`} data-testid="open-invitation">
              {invitation.title}
            </Link>
          </h3>
          <div className={styles.row}>
            <Link
              href={`/dashboard/invitations/${invitation.id}`}
              className={`${styles.secondary} ${styles.small}`}
            >
              Isi data
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
