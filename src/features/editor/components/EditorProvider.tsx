"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStore } from "zustand";
import type { CanonicalDocument } from "@/lib/schema";
import type { Autosaver } from "../core/autosave";
import type { EditorStore, EditorStoreState } from "../core/store";

interface EditorContextValue {
  readonly store: EditorStore;
  readonly autosaver: Autosaver | null;
  readonly workspaceId: string;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  store,
  autosaver,
  workspaceId,
  children,
}: {
  store: EditorStore;
  autosaver: Autosaver | null;
  workspaceId: string;
  children: ReactNode;
}) {
  return (
    <EditorContext.Provider value={{ store, autosaver, workspaceId }}>
      {children}
    </EditorContext.Provider>
  );
}

function useContextValue(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error("Editor hooks must be used inside <EditorProvider>");
  return value;
}

/** Subscribe to a slice of editor state. */
export function useEditor<T>(selector: (state: EditorStoreState) => T): T {
  return useStore(useContextValue().store, selector);
}

/** Imperative access (actions, getState) without subscribing. */
export function useEditorStore(): EditorStore {
  return useContextValue().store;
}

/** Workspace that owns the template being edited (scopes the asset library). */
export function useWorkspaceId(): string {
  return useContextValue().workspaceId;
}

export function useAutosaver(): Autosaver | null {
  return useContextValue().autosaver;
}

export const selectDoc = (s: EditorStoreState): CanonicalDocument => s.history.present;
