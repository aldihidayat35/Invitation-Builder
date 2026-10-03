"use client";

import { useActionState } from "react";
import type { ActionState, TemplateAction } from "./action-state";
import styles from "./templates.module.css";

export function PublishPanel({
  templateId,
  revision,
  canPublish,
  unpublishedChanges,
  neverPublished,
  action,
}: {
  templateId: string;
  revision: number;
  canPublish: boolean;
  unpublishedChanges: boolean;
  neverPublished: boolean;
  action: TemplateAction;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const publishable = canPublish && (neverPublished || unpublishedChanges);

  return (
    <section className={styles.panel} aria-labelledby="publish-heading">
      <h2 id="publish-heading" className={styles.panelTitle}>
        Publish
      </h2>
      <p className={styles.muted}>
        Publish membuat versi baru yang <strong>tidak dapat diubah</strong>. Draft tetap bisa diedit
        setelahnya tanpa memengaruhi versi yang sudah dipublish.
      </p>
      {!canPublish ? (
        <p className={styles.muted}>Role Anda tidak dapat mempublish template.</p>
      ) : (
        <form action={formAction} className={styles.publishForm}>
          <input type="hidden" name="templateId" value={templateId} />
          <input type="hidden" name="expectedRevision" value={revision} />
          <label className={styles.createField}>
            <span>Catatan versi (opsional)</span>
            <input name="note" maxLength={500} autoComplete="off" id="publish-note" />
          </label>
          <button
            id="publish-button"
            type="submit"
            className={styles.primary}
            disabled={pending || !publishable}
          >
            {pending ? "Mempublish…" : "Publish versi baru"}
          </button>
          {!publishable ? (
            <p className={styles.muted}>Tidak ada perubahan untuk dipublish.</p>
          ) : null}
        </form>
      )}
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
    </section>
  );
}
