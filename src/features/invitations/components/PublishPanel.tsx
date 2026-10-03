"use client";

import { useActionState } from "react";
import type { SnapshotSummary } from "../types";
import type { ActionState, InvitationAction } from "./action-state";
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

/** Publish + revision history + rollback (FR-INV-004, FR-PUB-001..003). */
export function PublishPanel({
  invitationId,
  slug,
  status,
  ready,
  canWrite,
  snapshots,
  publish,
  rollback,
}: {
  invitationId: string;
  slug: string;
  status: string;
  ready: boolean;
  canWrite: boolean;
  snapshots: readonly SnapshotSummary[];
  publish: InvitationAction;
  rollback: InvitationAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(publish, {});
  const publicPath = `/i/${slug}`;
  const live = snapshots.some((snap) => snap.active);

  return (
    <section className={styles.panel} aria-labelledby="publish-title">
      <h2 id="publish-title" className={styles.panelTitle}>
        Publish
      </h2>
      {live ? (
        <p className={styles.okText} data-testid="public-url">
          Live: <a href={publicPath}>{publicPath}</a>
        </p>
      ) : (
        <p className={styles.muted}>Belum dipublish.</p>
      )}
      {canWrite && status !== "archived" ? (
        <form action={formAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <button
            id="publish-submit"
            type="submit"
            className={styles.primary}
            disabled={pending || !ready}
          >
            {pending ? "Mempublish…" : live ? "Publish ulang" : "Publish"}
          </button>
          {!ready ? <p className={styles.muted}>Lengkapi data wajib terlebih dahulu.</p> : null}
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
  );
}
