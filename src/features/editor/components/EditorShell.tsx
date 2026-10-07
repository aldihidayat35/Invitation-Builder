"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { CanonicalDocument } from "@/lib/schema";
import { createAutosaver, type SaveResult } from "../core/autosave";
import { panelLayoutStore } from "../core/panel-layout";
import { createPreviewBroadcaster } from "../core/preview-sync";
import { createEditorStore } from "../core/store";
import { isEditableTarget, isPanKey, resolveShortcut } from "../core/shortcuts";
import { Artboard } from "./Artboard";
import { EditorProvider, useAutosaver, useEditor, useEditorStore } from "./EditorProvider";
import { Inspector } from "./Inspector";
import { LeftPanel } from "./LeftPanel";
import { PanelResizer } from "./PanelResizer";
import { TopBar } from "./TopBar";
import { getAllCuratedGoogleFontsUrl, preloadEditorFonts } from "@/lib/fonts";
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
            resolveConflict: () => props.currentRevision(templateId),
          }),
    [store, save, templateId, props.readOnly, props.currentRevision],
  );

  useEffect(() => () => autosaver?.dispose(), [autosaver]);

  // Preload curated invitation fonts in the background
  useEffect(() => {
    preloadEditorFonts();
  }, []);

  // Synchronize stored artboard mode and theme after mount to prevent SSR hydration mismatch
  useEffect(() => {
    store.getState().syncArtboardModeFromStorage();
    store.getState().syncThemeFromStorage();
  }, [store]);

  // Realtime Live Preview Cross-Tab Broadcaster (120ms debounce)
  useEffect(() => {
    const broadcaster = createPreviewBroadcaster(
      templateId,
      () => store.getState().history.present,
      120,
    );

    // Initial broadcast so preview tabs immediately get current document
    broadcaster.broadcastNow();

    // Subscribe to store document changes
    let lastDoc = store.getState().history.present;
    const unsubscribe = store.subscribe((state) => {
      const nextDoc = state.history.present;
      if (nextDoc !== lastDoc) {
        lastDoc = nextDoc;
        broadcaster.broadcastDebounced();
      }
    });

    return () => {
      unsubscribe();
      broadcaster.dispose();
    };
  }, [store, templateId]);

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
  const theme = useEditor((s) => s.theme);
  const widths = useSyncExternalStore(
    panelLayoutStore.subscribe,
    panelLayoutStore.getSnapshot,
    panelLayoutStore.getServerSnapshot,
  );
  const bodyStyle = {
    "--left-w": `${widths.left}px`,
    "--right-w": `${widths.right}px`,
  } as CSSProperties;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-editor-theme", theme);
      document.body.setAttribute("data-editor-theme", theme);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-editor-theme");
        document.body.removeAttribute("data-editor-theme");
      }
    };
  }, [theme]);

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
    <div className={styles.shell} data-theme={theme} data-testid="editor-shell">
      <link rel="stylesheet" href={getAllCuratedGoogleFontsUrl()} />
      <TopBar
        templateId={templateId}
        templateName={templateName}
        currentRevision={currentRevision}
      />
      <p className={styles.mobileNote}>Editor dioptimalkan untuk layar lebar. Gunakan desktop.</p>
      <div className={styles.body} style={bodyStyle}>
        <LeftPanel />
        <PanelResizer side="left" width={widths.left} />
        <Artboard />
        <PanelResizer side="right" width={widths.right} />
        <div className={styles.inspectorWrap}>
          <Inspector />
        </div>
      </div>
    </div>
  );
}
