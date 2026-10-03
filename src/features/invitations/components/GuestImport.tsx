"use client";

import { useActionState, useState } from "react";
import type { ImportAction, ImportState } from "./action-state";
import styles from "./invitations.module.css";

/** CSV paste/upload -> preview with duplicate/invalid report -> confirm import (FR-GST-001). */
export function GuestImport({
  invitationId,
  action,
}: {
  invitationId: string;
  action: ImportAction;
}) {
  const [csv, setCsv] = useState("");
  const [state, formAction, pending] = useActionState<ImportState, FormData>(action, {});
  const plan = state.plan;

  async function onFile(file: File | undefined) {
    if (file) setCsv(await file.text());
  }

  return (
    <details className={styles.panel} data-testid="guest-import">
      <summary className={styles.panelTitle}>Impor tamu dari CSV</summary>
      <form action={formAction} aria-label="Impor tamu CSV" className={styles.guestForm}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <label className={styles.field}>
          <span>File CSV (kolom: nama, jumlah)</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        <label className={styles.field}>
          <span>atau tempel isi CSV</span>
          <textarea
            name="csv"
            rows={5}
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            placeholder={"nama,jumlah\nBudi,2\nWulan,1"}
          />
        </label>
        <div className={styles.row}>
          <button
            type="submit"
            name="intent"
            value="preview"
            className={styles.secondary}
            disabled={pending}
          >
            Pratinjau
          </button>
          <button
            type="submit"
            name="intent"
            value="import"
            className={styles.primary}
            disabled={pending || !plan || plan.summary.ok === 0}
          >
            Impor {plan ? plan.summary.ok : 0} tamu
          </button>
        </div>
      </form>
      {state.error ? (
        <p role="alert" className={styles.formError}>
          {state.error}
        </p>
      ) : null}
      {plan?.fatal ? (
        <p role="alert" className={styles.formError}>
          {plan.fatal}
        </p>
      ) : null}
      {plan && !plan.fatal ? (
        <div role="status" data-testid="import-summary">
          <p>
            {state.created !== undefined ? `Berhasil mengimpor ${state.created} tamu. ` : ""}
            Total {plan.summary.total} baris · valid {plan.summary.ok} · duplikat{" "}
            {plan.summary.duplicate} · tidak valid {plan.summary.invalid}
          </p>
          {plan.rows.some((r) => r.status !== "ok") ? (
            <ul className={styles.issues}>
              {plan.rows
                .filter((r) => r.status !== "ok")
                .slice(0, 20)
                .map((r) => (
                  <li key={r.line}>
                    Baris {r.line}: {r.name || "(kosong)"} — {r.reason}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
