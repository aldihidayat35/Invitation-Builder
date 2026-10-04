"use client";

import Link from "next/link";
import { useState } from "react";
import { useAutosaver, useEditor, useEditorStore } from "./EditorProvider";
import { selectCanRedo, selectCanUndo } from "../core/store";
import { MAX_ZOOM, MIN_ZOOM, fitZoom } from "../core/geometry";
import { IconEye } from "./icons";
import styles from "./editor.module.css";

const STATUS_LABEL = {
  idle: "Tersimpan",
  dirty: "Perubahan belum disimpan",
  saving: "Menyimpan...",
  saved: "Tersimpan",
  error: "Gagal menyimpan",
  conflict: "Konflik revisi",
} as const;

export interface TopBarProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly currentRevision: (templateId: string) => Promise<number | null>;
}

export function TopBar({ templateId, templateName, currentRevision }: TopBarProps) {
  const store = useEditorStore();
  const autosaver = useAutosaver();
  const canUndo = useEditor(selectCanUndo);
  const canRedo = useEditor(selectCanRedo);
  const zoom = useEditor((s) => s.zoom);
  const readOnly = useEditor((s) => s.readOnly);
  const status = useEditor((s) => s.saveStatus);
  const saveError = useEditor((s) => s.saveError);
  const [resolving, setResolving] = useState(false);

  async function overwrite() {
    setResolving(true);
    try {
      const revision = await currentRevision(templateId);
      if (revision === null) return;
      store.getState().adoptRevision(revision);
      await autosaver?.flush();
    } finally {
      setResolving(false);
    }
  }

  return (
    <header className={styles.topBar}>
      <Link href={`/dashboard/templates/${templateId}`} className={styles.back} id="editor-back">
        ← Detail template
      </Link>
      <h1 className={styles.templateName} data-testid="editor-template-name" title={templateName}>
        {templateName}
      </h1>

      <div className={styles.toolGroup} role="group" aria-label="Riwayat">
        <button
          type="button"
          className={styles.toolButton}
          id="undo"
          data-testid="undo"
          disabled={!canUndo || readOnly}
          onClick={() => store.getState().undo()}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          className={styles.toolButton}
          id="redo"
          data-testid="redo"
          disabled={!canRedo || readOnly}
          onClick={() => store.getState().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>

      <div className={styles.toolGroup} role="group" aria-label="Zoom">
        <button
          type="button"
          className={styles.toolButton}
          data-testid="zoom-out"
          disabled={zoom <= MIN_ZOOM}
          aria-label="Perkecil"
          onClick={() => store.getState().zoomStep(-1)}
        >
          −
        </button>
        <span className={styles.zoomLabel} data-testid="zoom-label">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className={styles.toolButton}
          data-testid="zoom-in"
          disabled={zoom >= MAX_ZOOM}
          aria-label="Perbesar"
          onClick={() => store.getState().zoomStep(1)}
        >
          +
        </button>
        <button
          type="button"
          className={styles.toolButton}
          data-testid="zoom-fit"
          onClick={() => {
            const scroll = document.querySelector<HTMLElement>("[data-testid='artboard']");
            const width = scroll ? scroll.clientWidth - 48 : 390;
            store.getState().setZoom(fitZoom(width));
          }}
        >
          Fit
        </button>
      </div>

      <span className={styles.spacer} />

      {readOnly ? <span className={styles.badge}>Read-only</span> : null}
      <span
        className={styles.saveStatus}
        data-testid="save-status"
        data-status={status}
        role="status"
        aria-live="polite"
      >
        {STATUS_LABEL[status]}
      </span>

      <button
        type="button"
        className={styles.previewButton}
        data-testid="editor-preview-btn"
        id="editor-preview-btn"
        onClick={() => {
          try {
            const currentDoc = store.getState().history.present;
            localStorage.setItem(`dib_preview_doc_${templateId}`, JSON.stringify(currentDoc));
            localStorage.setItem(`dib_preview_time_${templateId}`, String(Date.now()));
          } catch {
            // ignore storage quota errors
          }

          if (status === "dirty") {
            void autosaver?.flush();
          }

          window.open(`/editor/${templateId}/preview`, "_blank");
        }}
        title="Buka pratinjau real template di tab baru"
      >
        <IconEye size={15} />
        <span>Preview</span>
      </button>

      {status === "error" ? (
        <div className={styles.banner} role="alert">
          <span>{saveError}</span>
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => void autosaver?.flush()}
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      {status === "conflict" ? (
        <div className={styles.banner} role="alert" data-testid="conflict-banner">
          <span>{saveError ?? "Template diubah di tempat lain."}</span>
          <button
            type="button"
            className={styles.smallButton}
            data-testid="conflict-reload"
            onClick={() => window.location.reload()}
          >
            Muat ulang
          </button>
          <button
            type="button"
            className={styles.smallButton}
            data-testid="conflict-overwrite"
            disabled={resolving}
            onClick={() => void overwrite()}
          >
            Timpa dengan versi saya
          </button>
        </div>
      ) : null}
    </header>
  );
}
