"use client";

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
          Belum ada template yang dipublish. Minta designer untuk mem-publish template terlebih
          dahulu.
        </p>
      </div>
    );
  }

  return (
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
  );
}
