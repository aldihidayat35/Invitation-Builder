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
import type { CanonicalDocument, Element, Frame } from "@/lib/schema";
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
  nudgeElements,
  renameElement as renameElementOp,
  reorderElements,
  setFrames,
  setLocked as setLockedOp,
  setVisible as setVisibleOp,
  shiftSection,
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
  // sections
  addSection(afterSectionId?: string): void;
  deleteSection(id: string): void;
  duplicateSection(id: string): void;
  moveSection(id: string, direction: -1 | 1): void;
  patchSection(id: string, patch: SectionPatch): void;
  // elements
  addElement(kind: ElementKind): void;
  /** Places an uploaded image asset into the active section (FR-EDT-008). */
  addImage(asset: { assetId: string; width: number; height: number; name?: string }): void;
  /** Inserts a registered widget with its default frame/props (FR-WDG-001). */
  addWidget(widget: Parameters<typeof createWidgetElement>[2]): void;
  addVariable(input: Parameters<typeof addVariableOp>[1]): void;
  deleteSelected(): void;
  duplicateSelected(): void;
  copySelected(): void;
  paste(): void;
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
  // history
  undo(): void;
  redo(): void;
  // view
  setZoom(zoom: number): void;
  zoomStep(direction: 1 | -1): void;
  setPanMode(active: boolean): void;
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
  const same =
    selectedIds.length === state.selectedIds.length && activeSectionId === state.activeSectionId;
  return same ? {} : { selectedIds, activeSectionId };
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
      savedDocument: init.document,
      revision: init.revision,
      saveStatus: "idle",
      saveError: null,
      savedAt: null,

      // ------------------------------------------------------------ selection
      selectElements(ids) {
        const doc = get().history.present;
        const first = ids.map((id) => findElement(doc, id)).find(Boolean);
        if (!first) return set({ selectedIds: [] });
        const sectionId = first.section.id;
        const valid = ids.filter((id) => findElement(doc, id)?.section.id === sectionId);
        set({ selectedIds: valid, activeSectionId: sectionId });
      },
      toggleElement(id) {
        const state = get();
        const loc = findElement(state.history.present, id);
        if (!loc) return;
        if (sectionOfSelection(state) !== loc.section.id) {
          return set({ selectedIds: [id], activeSectionId: loc.section.id });
        }
        const has = state.selectedIds.includes(id);
        set({
          selectedIds: has ? state.selectedIds.filter((x) => x !== id) : [...state.selectedIds, id],
          activeSectionId: loc.section.id,
        });
      },
      clearSelection() {
        if (get().selectedIds.length > 0) set({ selectedIds: [] });
      },
      setActiveSection(id) {
        const state = get();
        if (id === state.activeSectionId) return;
        if (id && !findSection(state.history.present, id)) return;
        set({ activeSectionId: id, selectedIds: [] });
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
      addWidget(widget) {
        let created: string | null = null;
        edit(
          (doc, s) => {
            const sectionId = s.activeSectionId ?? doc.sections[0]?.id;
            if (!sectionId) return doc;
            const result = createWidgetElement(doc, sectionId, widget);
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
      },
      copySelected() {
        const state = get();
        const doc = state.history.present;
        const elements = state.selectedIds
          .map((id) => findElement(doc, id)?.element)
          .filter((e): e is Element => e !== undefined)
          .map((e) => structuredClone(e));
        if (elements.length > 0) set({ clipboard: elements, pasteCount: 0 });
      },
      paste() {
        const state = get();
        if (state.clipboard.length === 0) return;
        const offset = DEFAULT_DUPLICATE_OFFSET * (state.pasteCount + 1);
        let created: string[] = [];
        edit(
          (doc, s) => {
            const sectionId = s.activeSectionId ?? doc.sections[0]?.id;
            if (!sectionId) return doc;
            const result = insertElementCopies(doc, sectionId, s.clipboard, offset);
            created = result.ids;
            return result.document;
          },
          undefined,
          () => (created.length ? { selectedIds: created, pasteCount: state.pasteCount + 1 } : {}),
        );
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
