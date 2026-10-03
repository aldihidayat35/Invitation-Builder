"use client";

import { useActionState } from "react";
import type { ActionState, TemplateAction } from "./action-state";
import styles from "./templates.module.css";

export function CreateTemplateForm({
  workspaceId,
  action,
}: {
  workspaceId: string;
  action: TemplateAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <section className={styles.createCard} aria-labelledby="create-template-heading">
      <div className={styles.createHead}>
        <h2 id="create-template-heading" className={styles.createTitle}>
          Buat template baru
        </h2>
        <p className={styles.muted}>
          Beri nama, lalu buka template untuk mendesainnya di editor. Template berstatus Draft
          sampai Anda mempublishnya.
        </p>
      </div>
      <form action={formAction} className={styles.createForm} aria-label="Buat template baru">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <label className={styles.createField}>
          <span>Nama template</span>
          <input
            id="new-template-name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="mis. Elegant Rose"
            autoComplete="off"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "create-error" : undefined}
          />
        </label>
        <button
          id="create-template-submit"
          type="submit"
          className={styles.primary}
          disabled={pending}
        >
          {pending ? "Membuat…" : "Buat template"}
        </button>
        {state.error ? (
          <p id="create-error" role="alert" className={styles.formError}>
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
