"use client";

import { useEffect, useMemo, useState } from "react";
import type { CanonicalDocument } from "@/lib/schema";
import { createAutosaver, type SaveResult } from "../core/autosave";
import { createEditorStore } from "../core/store";
import { isEditableTarget, isPanKey, resolveShortcut } from "../core/shortcuts";
import { Artboard } from "./Artboard";
import { EditorProvider, useAutosaver, useEditorStore } from "./EditorProvider";
import { Inspector } from "./Inspector";
import { LeftPanel } from "./LeftPanel";
import { TopBar } from "./TopBar";
import styles from "./editor.module.css";

export interface EditorShellProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly workspaceId: string;
  readonly document: CanonicalDocument;
  readonly revision: number;
  readonly readOnly: boolean;
  readonly save: (templateId: string, revision: number, document: unknown) => Promise<SaveResult>;
  readonly currentRevision: (templateId: string) => Promise<number | null>;
}

export function EditorShell(props: EditorShellProps) {
  const { templateId, save } = props;
  // Created once per mount; later prop changes (revalidation) must never reset local edits.
  const [store] = useState(() =>
    createEditorStore({
      document: props.document,
      revision: props.revision,
      readOnly: props.readOnly,
    }),
  );
  const autosaver = useMemo(
    () =>
      props.readOnly
        ? null
        : createAutosaver({
            store,
            save: (document, revision) => save(templateId, revision, document),
          }),
    [store, save, templateId, props.readOnly],
  );

  useEffect(() => () => autosaver?.dispose(), [autosaver]);

  return (
    <EditorProvider store={store} autosaver={autosaver} workspaceId={props.workspaceId}>
      <EditorFrame
        templateId={templateId}
        templateName={props.templateName}
        currentRevision={props.currentRevision}
      />
    </EditorProvider>
  );
}

function EditorFrame({
  templateId,
  templateName,
  currentRevision,
}: {
  templateId: string;
  templateName: string;
  currentRevision: (templateId: string) => Promise<number | null>;
}) {
  const store = useEditorStore();
  const autosaver = useAutosaver();

  // Keyboard shortcuts (PRD Lampiran A).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const state = store.getState();
      if (isPanKey(event)) {
        event.preventDefault();
        state.setPanMode(true);
        return;
      }
      const action = resolveShortcut(event);
      if (!action) return;
      event.preventDefault();
      switch (action.type) {
        case "undo":
          return state.undo();
        case "redo":
          return state.redo();
        case "copy":
          return state.copySelected();
        case "paste":
          return state.paste();
        case "duplicate":
          return state.duplicateSelected();
        case "delete":
          return state.deleteSelected();
        case "nudge":
          return state.nudgeSelected(action.dx, action.dy);
        case "escape":
          return state.clearSelection();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isPanKey(event)) store.getState().setPanMode(false);
    };
    const onBlur = () => store.getState().setPanMode(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [store]);

  // Do not lose edits: warn when dirty, flush when the tab is hidden or the editor unmounts.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const status = store.getState().saveStatus;
      if (
        status === "dirty" ||
        status === "saving" ||
        status === "error" ||
        status === "conflict"
      ) {
        event.preventDefault();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void autosaver?.flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      void autosaver?.flush();
    };
  }, [store, autosaver]);

  return (
    <div className={styles.shell}>
      <TopBar
        templateId={templateId}
        templateName={templateName}
        currentRevision={currentRevision}
      />
      <p className={styles.mobileNote}>Editor dioptimalkan untuk layar lebar. Gunakan desktop.</p>
      <div className={styles.body}>
        <LeftPanel />
        <Artboard />
        <div className={styles.inspectorWrap}>
          <Inspector />
        </div>
      </div>
    </div>
  );
}
