"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./templates.module.css";

/** Accessible confirmation built on the native <dialog> (focus trap + Esc handled by the browser). */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId} className={styles.dialogTitle}>
        {title}
      </h2>
      <div className={styles.dialogBody}>{children}</div>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondary} onClick={onCancel} disabled={pending}>
          Batal
        </button>
        <button
          type="button"
          className={styles.danger}
          onClick={onConfirm}
          disabled={pending}
          data-testid="confirm-action"
        >
          {pending ? "Memproses…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
