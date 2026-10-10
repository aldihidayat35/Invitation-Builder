"use client";

import { useEffect, useState } from "react";
import {
  EDITOR_TOAST_EVENT,
  type EditorToastEventDetail,
  type ToastType,
} from "../utils/external-image-handler";
import styles from "./editor.module.css";

interface ToastState {
  readonly id: number;
  readonly message: string;
  readonly type: ToastType;
}

export function EditorToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<EditorToastEventDetail>).detail;
      if (!detail?.message) return;

      const newToast: ToastState = {
        id: Date.now(),
        message: detail.message,
        type: detail.type || "info",
      };

      setToast(newToast);

      if (timer) clearTimeout(timer);
      // Notifikasi info/loading bertahan sedikit lebih lama jika sedang proses,
      // sedangkan success/error auto-dismiss setelah 3.5 detik.
      const duration = detail.type === "info" ? 6000 : 3500;
      timer = setTimeout(() => {
        setToast(null);
      }, duration);
    };

    window.addEventListener(EDITOR_TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(EDITOR_TOAST_EVENT, onToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const icon =
    toast.type === "success" ? "✨" : toast.type === "error" ? "⚠️" : "⏳";

  return (
    <div
      className={`${styles.editorToast} ${
        toast.type === "success"
          ? styles.editorToastSuccess
          : toast.type === "error"
            ? styles.editorToastError
            : styles.editorToastInfo
      }`}
      role="status"
      aria-live="polite"
      data-testid="editor-toast"
    >
      <span className={styles.editorToastIcon}>{icon}</span>
      <span className={styles.editorToastText}>{toast.message}</span>
      <button
        type="button"
        className={styles.editorToastClose}
        onClick={() => setToast(null)}
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}
