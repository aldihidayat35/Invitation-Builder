"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState, InvitationAction } from "./action-state";
import styles from "./invitations.module.css";

export interface PublishedTemplateOption {
  readonly id: string;
  readonly name: string;
  readonly versionNo: number;
}

export function CreateInvitationForm({
  workspaceId,
  templates,
  action,
}: {
  workspaceId: string;
  templates: readonly PublishedTemplateOption[];
  action: InvitationAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  if (templates.length === 0) {
    return (
      <div className={styles.empty} data-testid="no-published-template">
        <p>
          <strong>Belum ada template yang dipublish.</strong> Undangan selalu dibuat dari template
          yang sudah dipublish. Publish template terlebih dahulu di halaman Template.
        </p>
        <Link href="/dashboard/templates" className={styles.secondary}>
          Buka halaman Template
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.createCard} aria-labelledby="create-invitation-heading">
      <div className={styles.createHead}>
        <h2 id="create-invitation-heading" className={styles.createTitle}>
          Buat undangan baru
        </h2>
        <p className={styles.muted}>
          Pilih template yang sudah dipublish dan beri judul. Setelah dibuat, Anda bisa mengisi data
          acara, menambah tamu, lalu mempublish link undangan.
        </p>
      </div>
      <form action={formAction} className={styles.createForm} aria-label="Buat undangan baru">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <label className={styles.field}>
          <span>Template</span>
          <select id="new-invitation-template" name="templateId" required defaultValue="">
            <option value="" disabled>
              Pilih template…
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} (v{template.versionNo})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Judul undangan</span>
          <input
            id="new-invitation-title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="mis. Pernikahan Anin & Raka"
            autoComplete="off"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "create-invitation-error" : undefined}
          />
        </label>
        <button
          id="create-invitation-submit"
          type="submit"
          className={styles.primary}
          disabled={pending}
        >
          {pending ? "Membuat…" : "Buat undangan"}
        </button>
        {state.error ? (
          <p id="create-invitation-error" role="alert" className={styles.formError}>
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
