"use client";

import { useActionState, useRef, useState } from "react";
import type { ActionState, TemplateAction } from "./action-state";
import { ConfirmDialog } from "./ConfirmDialog";
import styles from "./templates.module.css";

export interface TemplateActionsProps {
  templateId: string;
  templateName: string;
  canWrite: boolean;
  canArchive: boolean;
  rename: TemplateAction;
  duplicate: TemplateAction;
  archive: TemplateAction;
}

/** Row/detail actions: rename (inline), duplicate, archive (with confirmation). */
export function TemplateActions(props: TemplateActionsProps) {
  const { templateId, templateName, canWrite, canArchive } = props;
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const [renameState, renameAction, renamePending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await props.rename(prev, formData);
      if (result.ok) setRenaming(false);
      return result;
    },
    {},
  );
  const [dupState, dupAction, dupPending] = useActionState<ActionState, FormData>(
    props.duplicate,
    {},
  );
  const [archiveState, archiveAction, archivePending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await props.archive(prev, formData);
      setConfirming(false);
      return result;
    },
    {},
  );

  const error = renameState.error ?? dupState.error ?? archiveState.error;

  if (!canWrite && !canArchive) return null;

  return (
    <div className={styles.actions}>
      {canWrite && renaming ? (
        <form action={renameAction} className={styles.renameForm}>
          <input type="hidden" name="templateId" value={templateId} />
          <label className={styles.srOnly} htmlFor={`rename-${templateId}`}>
            Nama baru untuk {templateName}
          </label>
          <input
            id={`rename-${templateId}`}
            name="name"
            defaultValue={templateName}
            required
            maxLength={120}
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className={styles.primarySmall} disabled={renamePending}>
            Simpan
          </button>
          <button
            type="button"
            className={styles.secondarySmall}
            onClick={() => setRenaming(false)}
          >
            Batal
          </button>
        </form>
      ) : (
        <>
          {canWrite ? (
            <button
              type="button"
              className={styles.secondarySmall}
              data-testid="rename-button"
              onClick={() => setRenaming(true)}
            >
              Ubah nama
            </button>
          ) : null}
          {canWrite ? (
            <form action={dupAction}>
              <input type="hidden" name="templateId" value={templateId} />
              <button
                type="submit"
                className={styles.secondarySmall}
                data-testid="duplicate-button"
                disabled={dupPending}
              >
                {dupPending ? "Menyalin…" : "Duplikat"}
              </button>
            </form>
          ) : null}
          <a
            href={`/api/templates/${templateId}/export`}
            className={styles.secondarySmall}
            data-testid="export-button"
            download
            title="Ekspor template ke format paket .zip"
          >
            Ekspor (.zip)
          </a>
          {canArchive ? (
            <button
              type="button"
              className={styles.dangerSmall}
              data-testid="archive-button"
              onClick={() => setConfirming(true)}
            >
              Arsipkan
            </button>
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Arsipkan template?"
        confirmLabel="Ya, arsipkan"
        pending={archivePending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => archiveFormRef.current?.requestSubmit()}
      >
        <p>
          <strong>{templateName}</strong> akan disembunyikan dari library dan tidak dapat diubah
          lagi. Versi yang sudah dipublish tetap tersimpan.
        </p>
      </ConfirmDialog>
      <form ref={archiveFormRef} action={archiveAction} hidden>
        <input type="hidden" name="templateId" value={templateId} />
      </form>
    </div>
  );
}
