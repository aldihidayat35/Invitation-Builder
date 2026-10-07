/**
 * Editor store (zustand, vanilla): committed document + history + selection +
 * view state + save state.
 *
 * PERFORMANCE RULE (Fase 4): this store only ever sees COMMITTED changes.
 * Pointer drags/resizes live in the Konva nodes and are committed once at
 * pointer end via `commitFrames`; nothing here is serialized or posted per
 * drag frame.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  CanonicalDocument,
  DocumentBackground,
  Element,
  Frame,
} from "@/lib/schema";
import { clampZoom, DEFAULT_ZOOM, stepZoom } from "./geometry";
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo as redoHistory,
  undo as undoHistory,
  type CommitOptions,
  type History,
} from "./history";
import {
  addSection as addSectionOp,
  addVariable as addVariableOp,
  createElement,
  createImageElement,
  createWidgetElement,
  deleteElements,
  deleteSection as deleteSectionOp,
  duplicateElements,
  duplicateSection as duplicateSectionOp,
  findElement,
  findSection,
  insertElementCopies,
  moveElementInLayers,
  nudgeElements,
  renameElement as renameElementOp,
  reorderElements,
  setFrames,
  setLocked as setLockedOp,
  setVisible as setVisibleOp,
  shiftSection,
  toggleSectionOpening as toggleSectionOpeningOp,
  updateElement,
  updateElementFrame,
  updateElementStyle,
  updateSection as updateSectionOp,
  DEFAULT_DUPLICATE_OFFSET,
  type ElementKind,
  type ReorderMode,
  type SectionPatch,
} from "./ops";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";
export type ArtboardMode = "cards" | "seamless" | "grid";
export type EditorTheme = "light" | "dark";

export const ARTBOARD_MODE_STORAGE_KEY = "dib_artboard_mode";
export const EDITOR_THEME_STORAGE_KEY = "dib_editor_theme";

export function getStoredArtboardMode(): ArtboardMode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(ARTBOARD_MODE_STORAGE_KEY);
    if (saved === "cards" || saved === "seamless" || saved === "grid") return saved;
  } catch {
    // ignore
  }
  return null;
}

export function getInitialArtboardMode(): ArtboardMode {
  return getStoredArtboardMode() ?? "cards";
}

export function getStoredEditorTheme(): EditorTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(EDITOR_THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return null;
}

export function getInitialEditorTheme(): EditorTheme {
  return getStoredEditorTheme() ?? "light";
}

export interface MotionEditTarget {
  readonly sectionId: string;
  readonly elementId: string;
}

export interface EditorState {
  readonly history: History<CanonicalDocument>;
  readonly selectedIds: readonly string[];
  readonly activeSectionId: string | null;
  readonly zoom: number;
  readonly clipboard: readonly Element[];
  readonly pasteCount: number;
  readonly readOnly: boolean;
  /** Space is held: drag pans the artboard instead of manipulating elements. */
  readonly panMode: boolean;
  /** View layout mode for the artboard: separated cards, seamless phone flow, or responsive grid wrap. */
  readonly artboardMode: ArtboardMode;
  /** Color theme for editor: 'light' (clean) or 'dark' (Netflix Dark with neon accents). */
  readonly theme: EditorTheme;
  /** Focused motion path editing mode: locks canvas clicks and enables waypoint dragging (Flash/Animate style). */
  readonly editingMotion: MotionEditTarget | null;

  /** Last document known to be persisted on the server, and its revision. */
  readonly savedDocument: CanonicalDocument;
  readonly revision: number;
  readonly saveStatus: SaveStatus;
  readonly saveError: string | null;
  readonly savedAt: number | null;
}

export interface EditorActions {
  // selection
  selectElements(ids: readonly string[]): void;
  toggleElement(id: string): void;
  clearSelection(): void;
  setActiveSection(id: string | null): void;
  setEditingMotion(target: MotionEditTarget | null): void;
  // sections
  addSection(afterSectionId?: string): void;
  addOpeningSection(): void;
  deleteSection(id: string): void;
  duplicateSection(id: string): void;
  moveSection(id: string, direction: -1 | 1): void;
  patchSection(id: string, patch: SectionPatch): void;
  toggleSectionOpening(id: string): void;
  // document base background
  setBaseBackground(background: DocumentBackground | undefined): void;
  patchBaseBackground(patch: Partial<DocumentBackground>): void;
  // elements
  addElement(kind: ElementKind): void;
  /** Places an uploaded image asset or direct GIF URL into the active section (FR-EDT-008). */
  addImage(asset: {
    assetId?: string;
    url?: string;
    width: number;
    height: number;
    name?: string;
  }): void;
  /** Inserts a registered widget with its default frame/props (FR-WDG-001). */
  addWidget(
    widget: Parameters<typeof createWidgetElement>[2],
    initialProps?: Record<string, unknown>,
  ): void;
  addVariable(input: Parameters<typeof addVariableOp>[1]): void;
  deleteSelected(): void;
  duplicateSelected(): void;
  copySelected(): void;
  paste(options?: {
    readonly position?: { readonly x: number; readonly y: number };
    readonly sectionId?: string;
  }): void;
  nudgeSelected(dx: number, dy: number): void;
  /** Commit the final frames of a finished pointer gesture (one history entry). */
  commitFrames(frames: Readonly<Record<string, Frame>>): void;
  patchFrame(id: string, patch: Partial<Frame>): void;
  patchStyle(ids: readonly string[], patch: Record<string, unknown>): void;
  patchElement(id: string, fn: (element: Element) => Element, coalesceKey?: string): void;
  renameElement(id: string, name: string): void;
  setLocked(ids: readonly string[], locked: boolean): void;
  setVisible(ids: readonly string[], visible: boolean): void;
  reorder(mode: ReorderMode, ids?: readonly string[]): void;
  moveElementLayer(
    sectionId: string,
    sourceId: string,
    targetId: string,
    placement: "above" | "below",
  ): void;
  // history
  undo(): void;
  redo(): void;
  // view
  setZoom(zoom: number): void;
  zoomStep(direction: 1 | -1): void;
  setPanMode(active: boolean): void;
  setArtboardMode(mode: ArtboardMode): void;
  syncArtboardModeFromStorage(): void;
  setTheme(theme: EditorTheme): void;
  syncThemeFromStorage(): void;
  // persistence bookkeeping (driven by the autosaver)
  markSaving(): void;
  markSaved(revision: number, savedDocument: CanonicalDocument): void;
  markSaveError(message: string): void;
  markConflict(message: string): void;
  /** After the user chose to overwrite: adopt the server's current revision and save again. */
  adoptRevision(revision: number): void;
}

export type EditorStoreState = EditorState & EditorActions;
export type EditorStore = StoreApi<EditorStoreState>;

export interface EditorInit {
  readonly document: CanonicalDocument;
  readonly revision: number;
  readonly readOnly?: boolean;
  readonly artboardMode?: ArtboardMode;
  readonly theme?: EditorTheme;
}

export const isDirty = (s: Pick<EditorState, "history" | "savedDocument">): boolean =>
  s.history.present !== s.savedDocument;
export const selectDocument = (s: EditorState): CanonicalDocument => s.history.present;
export const selectCanUndo = (s: EditorState): boolean => canUndo(s.history);
export const selectCanRedo = (s: EditorState): boolean => canRedo(s.history);

/** Drops ids that no longer exist and repairs the active section. */
function reconcile(state: EditorState, doc: CanonicalDocument): Partial<EditorState> {
  const selectedIds = state.selectedIds.filter((id) => findElement(doc, id));
  let activeSectionId = state.activeSectionId;
  if (activeSectionId && !findSection(doc, activeSectionId)) activeSectionId = null;
  if (selectedIds.length > 0) {
    activeSectionId = findElement(doc, selectedIds[0]!)!.section.id;
  }
  if (!activeSectionId) activeSectionId = doc.sections[0]?.id ?? null;
  let editingMotion = state.editingMotion;
  if (editingMotion && !findElement(doc, editingMotion.elementId)) {
    editingMotion = null;
  }
  const same =
    selectedIds.length === state.selectedIds.length &&
    activeSectionId === state.activeSectionId &&
    editingMotion === state.editingMotion;
  return same ? {} : { selectedIds, activeSectionId, editingMotion };
}

export function createEditorStore(init: EditorInit): EditorStore {
  return createStore<EditorStoreState>()((set, get) => {
    const edit = (
      producer: (doc: CanonicalDocument, state: EditorStoreState) => CanonicalDocument,
      options?: CommitOptions,
      after?: (nextDoc: CanonicalDocument, state: EditorStoreState) => Partial<EditorState>,
    ) => {
      const state = get();
      if (state.readOnly) return;
      const next = producer(state.history.present, state);
      if (next === state.history.present) return;
      const history = commit(state.history, next, options);
      const patch = after ? after(next, state) : {};
      const merged = { ...state, ...patch, history };
      set({ ...patch, history, ...reconcile(merged, next) });
    };

    const sectionOfSelection = (state: EditorState): string | null =>
      state.selectedIds.length > 0
        ? (findElement(state.history.present, state.selectedIds[0]!)?.section.id ?? null)
        : null;

    return {
      history: createHistory(init.document),
      selectedIds: [],
      activeSectionId: init.document.sections[0]?.id ?? null,
      zoom: DEFAULT_ZOOM,
      clipboard: [],
      pasteCount: 0,
      readOnly: init.readOnly ?? false,
      panMode: false,
      artboardMode: init.artboardMode ?? "cards",
      theme: init.theme ?? getInitialEditorTheme(),
      editingMotion: null,
      savedDocument: init.document,
      revision: init.revision,
      saveStatus: "idle",
      saveError: null,
      savedAt: null,

      // ------------------------------------------------------------ selection
      selectElements(ids) {
        const doc = get().history.present;
        const first = ids.map((id) => findElement(doc, id)).find(Boolean);
        if (!first) {
          return set({ selectedIds: [], editingMotion: null });
        }
        const sectionId = first.section.id;
        const valid = ids.filter((id) => findElement(doc, id)?.section.id === sectionId);
        const currentMotion = get().editingMotion;
        const keepMotion = currentMotion && valid.includes(currentMotion.elementId);
        set({
          selectedIds: valid,
          activeSectionId: sectionId,
          editingMotion: keepMotion ? currentMotion : null,
        });
      },
      toggleElement(id) {
        const state = get();
        const loc = findElement(state.history.present, id);
        if (!loc) return;
        if (sectionOfSelection(state) !== loc.section.id) {
          return set({ selectedIds: [id], activeSectionId: loc.section.id, editingMotion: null });
        }
        const has = state.selectedIds.includes(id);
        set({
          selectedIds: has ? state.selectedIds.filter((x) => x !== id) : [...state.selectedIds, id],
          activeSectionId: loc.section.id,
          editingMotion: null,
        });
      },
      clearSelection() {
        if (get().selectedIds.length > 0 || get().editingMotion !== null) {
          set({ selectedIds: [], editingMotion: null });
        }
      },
      setActiveSection(id) {
        const state = get();
        if (id === state.activeSectionId) return;
        if (id && !findSection(state.history.present, id)) return;
        set({ activeSectionId: id, selectedIds: [], editingMotion: null });
      },
      setEditingMotion(target) {
        if (!target) {
          set({ editingMotion: null });
          return;
        }
        const doc = get().history.present;
        const loc = findElement(doc, target.elementId);
        if (!loc) {
          set({ editingMotion: null });
          return;
        }
        // Auto-initialize custom motion track if missing or disabled
        if (!loc.element.animations?.motion?.enabled) {
          get().patchElement(target.elementId, (el) => ({
            ...el,
            animations: {
              ...el.animations,
              motion: {
                enabled: true,
                preset: "custom",
                pathShape: "curved",
                curviness: 1.0,
                points: [
                  { x: -160, y: 0 },
                  { x: 0, y: 0 },
                ],
                durationMs: 2000,
                delayMs: 0,
                easing: "ease-in-out",
                repeat: 0,
                yoyo: false,
                autoRotate: false,
                trigger: "onEnterViewport",
                once: true,
              },
            },
          }));
        }
        set({
          editingMotion: target,
          selectedIds: [target.elementId],
          activeSectionId: target.sectionId,
        });
      },

      // ------------------------------------------------------------- sections
      addSection(afterSectionId) {
        let created: string | null = null;
        edit(
          (doc, s) => {
            const result = addSectionOp(doc, {
              afterSectionId: afterSectionId ?? s.activeSectionId ?? undefined,
            });
            created = result.sectionId;
            return result.document;
          },
          undefined,
          () => ({ activeSectionId: created, selectedIds: [] }),
        );
      },
      addOpeningSection() {
        let created: string | null = null;
        edit(
          (doc) => {
            const result = addSectionOp(doc, { isOpening: true });
            created = result.sectionId;
            return result.document;
          },
          undefined,
          () => ({ activeSectionId: created, selectedIds: [] }),
        );
      },
      deleteSection(id) {
        edit(
          (doc) => deleteSectionOp(doc, id),
          undefined,
          (_doc, s) => (s.activeSectionId === id ? { activeSectionId: null, selectedIds: [] } : {}),
        );
      },
      duplicateSection(id) {
        let created: string | null = null;
        edit(
          (doc) => {
            const result = duplicateSectionOp(doc, id);
            created = result.sectionId;
            return result.document;
          },
          undefined,
          () => ({ activeSectionId: created, selectedIds: [] }),
        );
      },
      moveSection(id, direction) {
        edit((doc) => shiftSection(doc, id, direction));
      },
      patchSection(id, patch) {
        edit((doc) => updateSectionOp(doc, id, patch), {
          coalesceKey: `section:${id}:${Object.keys(patch).join(",")}`,
        });
      },
      toggleSectionOpening(id) {
        edit((doc) => toggleSectionOpeningOp(doc, id));
      },
      setBaseBackground(background) {
        edit(
          (doc) => ({
            ...doc,
            design: {
              ...doc.design,
              background,
            },
          }),
          { coalesceKey: "doc:background" },
        );
      },
      patchBaseBackground(patch) {
        edit(
          (doc) => {
            const current = doc.design.background ?? {
              fit: "cover",
              overlayOpacity: 0,
            };
            return {
              ...doc,
              design: {
                ...doc.design,
                background: {
                  ...current,
                  ...patch,
                },
              },
            };
          },
          { coalesceKey: "doc:background" },
        );
      },

      // ------------------------------------------------------------- elements
      addElement(kind) {
        let created: string | null = null;
        edit(
          (doc, s) => {
            const sectionId = s.activeSectionId ?? doc.sections[0]?.id;
            if (!sectionId) return doc;
            const result = createElement(doc, sectionId, kind);
            created = result.elementId;
            return result.document;
          },
          undefined,
          () => (created ? { selectedIds: [created] } : {}),
        );
      },
      addImage(asset) {
        let created: string | null = null;
        edit(
          (doc, s) => {
            const sectionId = s.activeSectionId ?? doc.sections[0]?.id;
            if (!sectionId) return doc;
            const result = createImageElement(doc, sectionId, asset);
            created = result.elementId;
            return result.document;
          },
          undefined,
          () => (created ? { selectedIds: [created] } : {}),
        );
      },
      addWidget(widget, initialProps) {
        let created: string | null = null;
        edit(
          (doc, s) => {
            const sectionId = s.activeSectionId ?? doc.sections[0]?.id;
            if (!sectionId) return doc;
            const result = createWidgetElement(doc, sectionId, widget, initialProps);
            created = result.elementId;
            return result.document;
          },
          undefined,
          () => (created ? { selectedIds: [created] } : {}),
        );
      },
      addVariable(input) {
        edit((doc) => addVariableOp(doc, input));
      },
      deleteSelected() {
        const ids = get().selectedIds;
        if (ids.length === 0) return;
        edit(
          (doc) => deleteElements(doc, ids),
          undefined,
          () => ({ selectedIds: [] }),
        );
      },
      duplicateSelected() {
        const ids = get().selectedIds;
        if (ids.length === 0) return;
        let created: string[] = [];
        edit(
          (doc) => {
            const result = duplicateElements(doc, ids);
            created = result.ids;
            return result.document;
          },
          undefined,
          () => (created.length ? { selectedIds: created } : {}),
        );
        if (typeof window !== "undefined" && created.length > 0) {
          requestAnimationFrame(() => {
            for (const id of created) {
              window.dispatchEvent(
                new CustomEvent("dib:replay-animation", { detail: { elementId: id } }),
              );
            }
          });
        }
      },
      copySelected() {
        const state = get();
        const doc = state.history.present;
        const elements = state.selectedIds
          .map((id) => findElement(doc, id)?.element)
          .filter((e): e is Element => e !== undefined)
          .map((e) => structuredClone(e));
        if (elements.length > 0) {
          set({ clipboard: elements, pasteCount: 0 });
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("undangan_clipboard", JSON.stringify(elements));
            } catch {
              // Ignore storage errors
            }
          }
        }
      },
      paste(options) {
        const state = get();
        let clipboard = state.clipboard;
        if (clipboard.length === 0 && typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("undangan_clipboard");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                clipboard = parsed;
              }
            }
          } catch {
            // Ignore storage errors
          }
        }
        if (clipboard.length === 0) return;
        const offset = options?.position ? 0 : DEFAULT_DUPLICATE_OFFSET * (state.pasteCount + 1);
        let created: string[] = [];
        let targetSectionId = options?.sectionId ?? state.activeSectionId;
        edit(
          (doc, s) => {
            const sectionId = targetSectionId ?? s.activeSectionId ?? doc.sections[0]?.id;
            if (!sectionId) return doc;
            targetSectionId = sectionId;
            const result = insertElementCopies(doc, sectionId, clipboard, {
              offset,
              position: options?.position,
            });
            created = result.ids;
            return result.document;
          },
          undefined,
          () =>
            created.length
              ? {
                  selectedIds: created,
                  pasteCount: state.pasteCount + 1,
                  activeSectionId: targetSectionId,
                }
              : {},
        );
        if (typeof window !== "undefined" && created.length > 0) {
          requestAnimationFrame(() => {
            for (const id of created) {
              window.dispatchEvent(
                new CustomEvent("dib:replay-animation", { detail: { elementId: id } }),
              );
            }
          });
        }
      },
      nudgeSelected(dx, dy) {
        const ids = get().selectedIds;
        if (ids.length === 0) return;
        edit((doc) => nudgeElements(doc, ids, dx, dy), { coalesceKey: `nudge:${ids.join(",")}` });
      },
      commitFrames(frames) {
        edit((doc) => setFrames(doc, frames));
      },
      patchFrame(id, patch) {
        edit((doc) => updateElementFrame(doc, id, patch), {
          coalesceKey: `frame:${id}:${Object.keys(patch).join(",")}`,
        });
      },
      patchStyle(ids, patch) {
        edit((doc) => ids.reduce((acc, id) => updateElementStyle(acc, id, patch), doc), {
          coalesceKey: `style:${ids.join(",")}:${Object.keys(patch).join(",")}`,
        });
      },
      patchElement(id, fn, coalesceKey) {
        edit(
          (doc) => updateElement(doc, id, fn),
          coalesceKey ? { coalesceKey: `${coalesceKey}:${id}` } : undefined,
        );
      },
      renameElement(id, name) {
        edit((doc) => renameElementOp(doc, id, name), { coalesceKey: `rename:${id}` });
      },
      setLocked(ids, locked) {
        edit((doc) => setLockedOp(doc, ids, locked));
      },
      setVisible(ids, visible) {
        edit(
          (doc) => setVisibleOp(doc, ids, visible),
          undefined,
          // A hidden element cannot stay selected on the canvas.
          () =>
            visible ? {} : { selectedIds: get().selectedIds.filter((id) => !ids.includes(id)) },
        );
      },
      reorder(mode, ids) {
        const state = get();
        const target = ids ?? state.selectedIds;
        const sectionId = sectionOfSelection({ ...state, selectedIds: target });
        if (!sectionId) return;
        edit((doc) => reorderElements(doc, sectionId, target, mode));
      },
      moveElementLayer(sectionId, sourceId, targetId, placement) {
        const state = get();
        if (state.readOnly) return;
        edit((doc) => moveElementInLayers(doc, sectionId, sourceId, targetId, placement));
      },

      // -------------------------------------------------------------- history
      undo() {
        const state = get();
        if (state.readOnly) return;
        const history = undoHistory(state.history);
        if (history === state.history) return;
        set({ history, ...reconcile(state, history.present) });
      },
      redo() {
        const state = get();
        if (state.readOnly) return;
        const history = redoHistory(state.history);
        if (history === state.history) return;
        set({ history, ...reconcile(state, history.present) });
      },

      // ----------------------------------------------------------------- view
      setZoom(zoom) {
        set({ zoom: clampZoom(zoom) });
      },
      zoomStep(direction) {
        set({ zoom: stepZoom(get().zoom, direction) });
      },
      setPanMode(active) {
        if (get().panMode !== active) set({ panMode: active });
      },
      setArtboardMode(mode) {
        if (get().artboardMode !== mode) {
          set({ artboardMode: mode });
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(ARTBOARD_MODE_STORAGE_KEY, mode);
            } catch {
              // ignore
            }
          }
        }
      },
      syncArtboardModeFromStorage() {
        const saved = getStoredArtboardMode();
        if (saved && saved !== get().artboardMode) {
          set({ artboardMode: saved });
        }
      },
      setTheme(theme) {
        if (get().theme !== theme) {
          set({ theme });
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(EDITOR_THEME_STORAGE_KEY, theme);
              document.documentElement.setAttribute("data-editor-theme", theme);
              document.body.setAttribute("data-editor-theme", theme);
            } catch {
              // ignore
            }
          }
        }
      },
      syncThemeFromStorage() {
        const saved = getStoredEditorTheme();
        if (saved && saved !== get().theme) {
          set({ theme: saved });
          if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-editor-theme", saved);
            document.body.setAttribute("data-editor-theme", saved);
          }
        }
      },

      // ---------------------------------------------------------- persistence
      markSaving() {
        set({ saveStatus: "saving", saveError: null });
      },
      markSaved(revision, savedDocument) {
        const state = get();
        set({
          revision,
          savedDocument,
          savedAt: Date.now(),
          saveError: null,
          saveStatus: state.history.present === savedDocument ? "saved" : "dirty",
        });
      },
      markSaveError(message) {
        set({ saveStatus: "error", saveError: message });
      },
      markConflict(message) {
        set({ saveStatus: "conflict", saveError: message });
      },
      adoptRevision(revision) {
        set({ revision, saveStatus: "dirty", saveError: null });
      },
    };
  });
}
