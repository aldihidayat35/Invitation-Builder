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
    <form action={formAction} className={styles.createForm} aria-label="Buat template baru">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label className={styles.createField}>
        <span>Nama template baru</span>
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
  );
}
