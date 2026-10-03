"use client";

import { useState } from "react";
import type { ValidationReport } from "../types";
import styles from "./templates.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; report: ValidationReport };

/** Calls POST /api/templates/:id/validate (schema + semantic validation of the stored draft). */
export function ValidationPanel({ templateId }: { templateId: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function run() {
    setStatus({ kind: "loading" });
    try {
      const response = await fetch(`/api/templates/${templateId}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message: body.error ?? `Permintaan gagal (${response.status}).`,
        });
        return;
      }
      setStatus({ kind: "done", report: (await response.json()) as ValidationReport });
    } catch {
      setStatus({ kind: "error", message: "Tidak dapat menghubungi server." });
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="validation-heading">
      <div className={styles.panelHead}>
        <h2 id="validation-heading" className={styles.panelTitle}>
          Validasi draft
        </h2>
        <button
          id="validate-button"
          type="button"
          className={styles.secondarySmall}
          onClick={run}
          disabled={status.kind === "loading"}
        >
          {status.kind === "loading" ? "Memvalidasi…" : "Jalankan validasi"}
        </button>
      </div>
      <div aria-live="polite" data-testid="validation-result">
        {status.kind === "idle" ? (
          <p className={styles.muted}>Periksa skema dan binding/widget draft sebelum publish.</p>
        ) : null}
        {status.kind === "error" ? (
          <p role="alert" className={styles.formError}>
            {status.message}
          </p>
        ) : null}
        {status.kind === "done" && status.report.valid ? (
          <p className={styles.okText}>Draft valid. Siap dipublish.</p>
        ) : null}
        {status.kind === "done" && !status.report.valid ? (
          <ul className={styles.issues}>
            {[...status.report.schemaIssues, ...status.report.semanticIssues].map((issue, i) => (
              <li key={i}>
                <code>{Array.isArray(issue.path) ? issue.path.join(".") : issue.path}</code>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
