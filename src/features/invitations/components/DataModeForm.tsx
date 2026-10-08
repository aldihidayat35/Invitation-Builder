"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssetSummary } from "@/features/assets/api";
import type { FormGroup } from "@/lib/engine";
import type { SaveDataAction } from "./action-state";
import styles from "./invitations.module.css";
import { VariableFields } from "./VariableFields";

const AUTOSAVE_DELAY_MS = 800;
const PREFIX = "v.";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const STATUS_TEXT: Record<SaveState, string> = {
  idle: "Perubahan tersimpan otomatis.",
  dirty: "Menunggu untuk menyimpan…",
  saving: "Menyimpan…",
  saved: "Tersimpan.",
  error: "Gagal menyimpan.",
};

function collect(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form).entries()) {
    if (typeof value === "string" && name.startsWith(PREFIX)) {
      values[name.slice(PREFIX.length)] = value;
    }
  }
  return values;
}

/**
 * Data Mode form (FR-INV-002): fields come from VariableDefinition, edits are
 * autosaved (debounced) to the invitation only - never to the template (AC-03).
 * Missing required fields are reported but never block saving.
 */
export function DataModeForm({
  invitationId,
  workspaceId,
  groups,
  values,
  initialErrors,
  imageOptions,
  initialAssets,
  save,
  readOnly = false,
}: {
  invitationId: string;
  workspaceId?: string;
  groups: readonly FormGroup[];
  values: Readonly<Record<string, string>>;
  initialErrors: Readonly<Record<string, string>>;
  imageOptions?: readonly { id: string; label: string }[];
  initialAssets?: readonly AssetSummary[];
  save: SaveDataAction;
  readOnly?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sequence = useRef(0);
  const [state, setState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>(initialErrors);
  const [message, setMessage] = useState<string | undefined>();

  const flush = useCallback(async () => {
    const form = formRef.current;
    if (!form) return;
    clearTimeout(timer.current);
    const current = ++sequence.current;
    setState("saving");
    try {
      const result = await save(invitationId, collect(form));
      if (current !== sequence.current) return; // a newer edit superseded this response
      setErrors(result.errors);
      setMessage(result.error);
      setState(result.ok ? "saved" : "error");
    } catch {
      if (current !== sequence.current) return;
      setMessage("Koneksi bermasalah. Perubahan akan dicoba disimpan lagi.");
      setState("error");
    }
  }, [invitationId, save]);

  const schedule = useCallback(() => {
    if (readOnly) return;
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  }, [flush, readOnly]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <form
      ref={formRef}
      noValidate
      onInput={schedule}
      onChange={schedule}
      onBlur={() => {
        if (state === "dirty") void flush();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void flush();
      }}
      aria-label="Data undangan"
    >
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <VariableFields
          groups={groups}
          values={values}
          namePrefix={PREFIX}
          errors={errors}
          workspaceId={workspaceId}
          initialAssets={initialAssets}
          {...(imageOptions && { imageOptions })}
        />
      </fieldset>
      <p
        id="autosave-status"
        className={styles.saveStatus}
        role="status"
        aria-live="polite"
        data-state={state}
      >
        {message ?? STATUS_TEXT[state]}
      </p>
      {readOnly ? null : (
        <button type="submit" className={styles.secondary} disabled={state === "saving"}>
          Simpan sekarang
        </button>
      )}
    </form>
  );
}
