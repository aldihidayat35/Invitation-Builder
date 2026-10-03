/**
 * Debounced autosave with conflict detection (Fase 4 step 9, FR-TPL-002).
 *
 * Framework-free: works on any store with `getState`/`subscribe`, and a
 * `save` function that is injected (a server action in the app, a fake in
 * tests). Only COMMITTED document changes trigger saves (never per drag frame).
 *
 * Contract:
 *  - many commits inside `delayMs` collapse into ONE save;
 *  - saves never overlap; edits made while a save is in flight trigger a
 *    follow-up save using the revision returned by the previous one;
 *  - `conflict` stops autosave until the user resolves it (adoptRevision);
 *  - transient errors retry with a back-off; validation errors wait for the
 *    next edit.
 */
import type { CanonicalDocument } from "@/lib/schema";
import { isDirty, type EditorStore } from "./store";

export type SaveResult =
  | { readonly ok: true; readonly revision: number }
  | {
      readonly ok: false;
      readonly kind: "conflict" | "invalid" | "forbidden" | "error";
      readonly message: string;
    };

export type SaveFn = (document: CanonicalDocument, revision: number) => Promise<SaveResult>;

export interface AutosaverOptions {
  readonly store: EditorStore;
  readonly save: SaveFn;
  readonly delayMs?: number;
  readonly retryDelayMs?: number;
}

export interface Autosaver {
  /** Saves immediately (used on blur, before leaving the page, and by tests). */
  flush(): Promise<void>;
  dispose(): void;
}

export const AUTOSAVE_DELAY_MS = 1500;
export const AUTOSAVE_RETRY_MS = 5000;

export function createAutosaver(options: AutosaverOptions): Autosaver {
  const { store, save } = options;
  const delayMs = options.delayMs ?? AUTOSAVE_DELAY_MS;
  const retryDelayMs = options.retryDelayMs ?? AUTOSAVE_RETRY_MS;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let disposed = false;

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const schedule = (ms: number) => {
    clear();
    timer = setTimeout(() => void flush(), ms);
  };

  async function run(): Promise<void> {
    for (;;) {
      const state = store.getState();
      if (disposed || state.readOnly || state.saveStatus === "conflict" || !isDirty(state)) return;

      const document = state.history.present;
      state.markSaving();
      let result: SaveResult;
      try {
        result = await save(document, state.revision);
      } catch {
        result = { ok: false, kind: "error", message: "Tidak dapat menyimpan. Periksa koneksi." };
      }
      if (disposed) return;

      if (result.ok) {
        store.getState().markSaved(result.revision, document);
        // Edited during the request? loop and save the newer document.
        continue;
      }
      if (result.kind === "conflict") {
        store.getState().markConflict(result.message);
        return;
      }
      store.getState().markSaveError(result.message);
      if (result.kind === "error") schedule(retryDelayMs);
      return;
    }
  }

  function flush(): Promise<void> {
    clear();
    if (!inFlight) {
      inFlight = run().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.history.present === prev.history.present) return;
    if (state.readOnly || state.saveStatus === "conflict") return;
    if (!isDirty(state)) {
      // Undo/redo returned to exactly what is persisted.
      if (state.saveStatus === "dirty") store.setState({ saveStatus: "saved" });
      clear();
      return;
    }
    // Mark dirty immediately so the UI reflects pending changes during the debounce.
    if (state.saveStatus !== "saving" && state.saveStatus !== "dirty") {
      store.setState({ saveStatus: "dirty" });
    }
    // While a save is running, `run` picks the change up in its loop.
    if (!inFlight) schedule(delayMs);
  });

  return {
    flush,
    dispose() {
      disposed = true;
      clear();
      unsubscribe();
    },
  };
}
