"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import type { GuestSummary } from "../types";
import type { ActionState, InvitationAction } from "./action-state";
import styles from "./invitations.module.css";

function GuestRow({
  guest,
  invitationId,
  archive,
  canWrite,
}: {
  guest: GuestSummary;
  invitationId: string;
  archive: InvitationAction;
  canWrite: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(archive, {});
  return (
    <li className={styles.guest} data-testid="guest-row">
      <span>
        <strong>{guest.name}</strong> · maks. {guest.maxParty} orang
        <br />
        <code>token: {guest.tokenId}</code>
      </span>
      <span className={styles.row}>
        <Link
          className={`${styles.secondary} ${styles.small}`}
          href={`/dashboard/invitations/${invitationId}/preview?guest=${guest.id}`}
        >
          Preview
        </Link>
        {canWrite ? (
          <form action={formAction}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <input type="hidden" name="guestId" value={guest.id} />
            <button
              type="submit"
              className={`${styles.danger} ${styles.small}`}
              disabled={pending}
              aria-label={`Hapus tamu ${guest.name}`}
            >
              Hapus
            </button>
          </form>
        ) : null}
      </span>
      {state.error ? (
        <p role="alert" className={styles.formError}>
          {state.error}
        </p>
      ) : null}
    </li>
  );
}

/** Minimal guest CRUD (FR-GST-002): manual add/list/remove with opaque tokens. CSV import comes in Fase 10. */
export function GuestPanel({
  invitationId,
  guests,
  canWrite,
  add,
  archive,
}: {
  invitationId: string;
  guests: readonly GuestSummary[];
  canWrite: boolean;
  add: InvitationAction;
  archive: InvitationAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await add(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <section className={styles.panel} aria-labelledby="guests-title">
      <h2 id="guests-title" className={styles.panelTitle}>
        Daftar tamu ({guests.length})
      </h2>
      {canWrite ? (
        <form ref={formRef} action={formAction} className={styles.guestForm} aria-label="Tambah tamu">
          <input type="hidden" name="invitationId" value={invitationId} />
          <label className={styles.field}>
            <span>Nama tamu</span>
            <input id="new-guest-name" name="name" required maxLength={120} autoComplete="off" />
          </label>
          <label className={styles.field}>
            <span>Maks. orang</span>
            <input
              id="new-guest-party"
              name="maxParty"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              required
            />
          </label>
          <button
            id="add-guest-submit"
            type="submit"
            className={styles.primary}
            disabled={pending}
          >
            {pending ? "Menambah…" : "Tambah tamu"}
          </button>
          {state.error ? (
            <p role="alert" className={styles.formError}>
              {state.error}
            </p>
          ) : null}
        </form>
      ) : null}
      {guests.length === 0 ? (
        <p className={styles.muted}>Belum ada tamu. Tambahkan tamu untuk melihat preview personal.</p>
      ) : (
        <ul className={styles.guestList} aria-label="Daftar tamu">
          {guests.map((guest) => (
            <GuestRow
              key={guest.id}
              guest={guest}
              invitationId={invitationId}
              archive={archive}
              canWrite={canWrite}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
