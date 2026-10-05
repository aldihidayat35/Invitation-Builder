/**
 * PRD refs: FR-EDT-002/003/004/009, Lampiran A, Fase 4 acceptance gate
 * (3 sections, manipulation, undo/redo consistency, JSON stays valid).
 */
import { createAutosaver, type SaveFn } from "@/features/editor/core/autosave";
import { resolveShortcut, isPanKey } from "@/features/editor/core/shortcuts";
import { createEditorStore, isDirty, type EditorStore } from "@/features/editor/core/store";
import { findElement } from "@/features/editor/core/ops";
import { canonicalDocumentSchema, createEmptyDocument } from "@/lib/schema";

function newStore(readOnly = false): EditorStore {
  return createEditorStore({ document: createEmptyDocument(), revision: 1, readOnly });
}
const doc = (s: EditorStore) => s.getState().history.present;
const valid = (s: EditorStore) =>
  expect(canonicalDocumentSchema.safeParse(doc(s)).success).toBe(true);

describe("editor store", () => {
  it("acceptance: 3 sections, visual elements, manipulations, undo/redo all consistent", () => {
    const s = newStore();
    const st = () => s.getState();
    st().addSection();
    st().addSection();
    st().addSection();
    expect(doc(s).sections).toHaveLength(3);

    // Section 1: text + rectangle + circle
    st().setActiveSection("sec_1");
    st().addElement("text");
    st().addElement("rectangle");
    st().addElement("circle");
    st().setActiveSection("sec_2");
    st().addElement("line");
    st().addElement("decoration");
    const rect = doc(s).sections[0]!.elements[1]!.id;
    const circle = doc(s).sections[0]!.elements[2]!.id;

    st().commitFrames({ [rect]: { x: 50, y: 60, w: 120, h: 80, rotation: 45 } });
    st().selectElements([rect]);
    st().reorder("back");
    st().setLocked([circle], true);
    st().setVisible([circle], false);
    expect(findElement(doc(s), rect)!.element.frame).toEqual({
      x: 50,
      y: 60,
      w: 120,
      h: 80,
      rotation: 45,
    });
    expect(doc(s).sections[0]!.elements[0]!.id).toBe(rect);
    valid(s);

    const finalDoc = doc(s);
    // Undo everything, then redo everything: documents are structurally identical.
    let steps = 0;
    while (st().history.past.length > 0) {
      st().undo();
      steps++;
      valid(s);
    }
    expect(steps).toBeGreaterThan(10);
    expect(doc(s).sections).toHaveLength(0);
    while (st().history.future.length > 0) {
      st().redo();
      valid(s);
    }
    expect(doc(s)).toBe(finalDoc);
  });

  it("a finished drag is exactly one history entry", () => {
    const s = newStore();
    s.getState().addSection();
    s.getState().addElement("rectangle");
    const id = doc(s).sections[0]!.elements[0]!.id;
    const before = s.getState().history.past.length;
    // many pointer-move frames never reach the store; only the final commit does
    s.getState().commitFrames({ [id]: { x: 1, y: 2, w: 100, h: 50, rotation: 0 } });
    expect(s.getState().history.past.length).toBe(before + 1);
    s.getState().undo();
    expect(findElement(doc(s), id)!.element.frame.x).not.toBe(1);
  });

  it("keeps >= 50 undoable actions in a session", () => {
    const s = newStore();
    s.getState().addSection();
    for (let i = 0; i < 55; i++) s.getState().addElement("text");
    expect(doc(s).sections[0]!.elements).toHaveLength(55);
    for (let i = 0; i < 55; i++) s.getState().undo();
    expect(doc(s).sections[0]!.elements).toHaveLength(0);
  });

  it("coalesces repeated nudges and inspector edits into one undo step", () => {
    const s = newStore();
    s.getState().addSection();
    s.getState().addElement("rectangle");
    const id = doc(s).sections[0]!.elements[0]!.id;
    const x0 = findElement(doc(s), id)!.element.frame.x;
    for (let i = 0; i < 5; i++) s.getState().nudgeSelected(1, 0);
    expect(findElement(doc(s), id)!.element.frame.x).toBe(x0 + 5);
    s.getState().undo();
    expect(findElement(doc(s), id)!.element.frame.x).toBe(x0);

    for (const w of [101, 102, 103]) s.getState().patchFrame(id, { w });
    s.getState().undo();
    expect(findElement(doc(s), id)!.element.frame.w).toBe(160);
  });

  it("selection: single, multi (same section only), toggle, clear, pruning after delete/undo", () => {
    const s = newStore();
    const st = () => s.getState();
    st().addSection();
    st().addSection();
    st().setActiveSection("sec_1");
    st().addElement("text");
    st().addElement("circle");
    st().setActiveSection("sec_2");
    st().addElement("line");
    const [a, b] = doc(s).sections[0]!.elements.map((e) => e.id) as [string, string];
    const c = doc(s).sections[1]!.elements[0]!.id;

    st().selectElements([a, b, c]);
    expect(st().selectedIds).toEqual([a, b]); // c is in another section
    expect(st().activeSectionId).toBe("sec_1");
    st().toggleElement(a);
    expect(st().selectedIds).toEqual([b]);
    st().toggleElement(c); // different section replaces
    expect(st().selectedIds).toEqual([c]);
    expect(st().activeSectionId).toBe("sec_2");

    st().deleteSelected();
    expect(st().selectedIds).toEqual([]);
    st().selectElements([a]);
    st().deleteSelected();
    st().undo();
    expect(st().selectedIds).toEqual([]);
    st().clearSelection();
  });

  it("copy/paste and duplicate create new unique elements in the active section", () => {
    const s = newStore();
    const st = () => s.getState();
    st().addSection();
    st().addSection();
    st().setActiveSection("sec_1");
    st().addElement("text");
    const original = doc(s).sections[0]!.elements[0]!;
    st().selectElements([original.id]);
    st().copySelected();
    st().setActiveSection("sec_2");
    st().paste();
    st().paste();
    const pasted = doc(s).sections[1]!.elements;
    expect(pasted).toHaveLength(2);
    expect(pasted[0]!.frame.x).toBe(original.frame.x + 16);
    expect(pasted[1]!.frame.x).toBe(original.frame.x + 32);
    expect(new Set([original.id, ...pasted.map((e) => e.id)]).size).toBe(3);

    st().selectElements([original.id]);
    st().duplicateSelected();
    expect(doc(s).sections[0]!.elements).toHaveLength(2);
    expect(st().selectedIds).toHaveLength(1);
    valid(s);
  });

  it("copies and pastes with full settings fidelity, target positioning, and animation replay", () => {
    const s = newStore();
    const st = () => s.getState();
    st().addSection();
    st().addSection();
    st().setActiveSection("sec_1");
    st().addElement("text");

    const elemId = doc(s).sections[0]!.elements[0]!.id;
    // Add custom animation, style, and frame
    st().patchElement(elemId, (el) => {
      if (el.type !== "text") return el;
      return {
        ...el,
        frame: { ...el.frame, w: 180, h: 60, rotation: 10 },
        animations: {
          enter: {
            presetId: "zoom-in",
            trigger: "onEnterViewport",
            durationMs: 750,
            delayMs: 100,
            easing: "back.out",
            repeat: 0,
            yoyo: false,
            staggerUnit: "none",
            staggerAmountMs: 0,
            once: true,
          },
        },
        style: {
          ...el.style,
          color: "#10b981",
          fontSize: 28,
        },
      };
    });

    const sourceEl = doc(s).sections[0]!.elements[0]!;
    st().selectElements([elemId]);

    // Copy selected
    st().copySelected();
    expect(st().clipboard).toHaveLength(1);

    // Paste into sec_2 at target position
    st().paste({ position: { x: 55, y: 75 }, sectionId: "sec_2" });
    const pastedElements = doc(s).sections[1]!.elements;
    expect(pastedElements).toHaveLength(1);
    const pasted = pastedElements[0]!;

    expect(pasted.id).not.toBe(sourceEl.id);
    expect(pasted.frame.x).toBe(55);
    expect(pasted.frame.y).toBe(75);
    expect(pasted.frame.w).toBe(180);
    expect(pasted.frame.h).toBe(60);
    expect(pasted.frame.rotation).toBe(10);
    expect(pasted.animations).toEqual(sourceEl.animations);
    expect(pasted.style).toEqual(sourceEl.style);
    expect(st().selectedIds).toEqual([pasted.id]);
    valid(s);
  });

  it("section lifecycle: add, duplicate, reorder, delete, patch", () => {
    const s = newStore();
    const st = () => s.getState();
    st().addSection();
    st().addSection();
    st().addSection();
    st().moveSection("sec_3", -1);
    expect(doc(s).sections.map((x) => x.id)).toEqual(["sec_1", "sec_3", "sec_2"]);
    st().duplicateSection("sec_1");
    expect(doc(s).sections).toHaveLength(4);
    expect(st().activeSectionId).toBe(doc(s).sections[1]!.id);
    st().patchSection("sec_2", { baseHeight: 1000 });
    expect(doc(s).sections.find((x) => x.id === "sec_2")!.baseHeight).toBe(1000);
    st().deleteSection("sec_2");
    expect(doc(s).sections.find((x) => x.id === "sec_2")).toBeUndefined();
    valid(s);
  });

  it("hiding an element removes it from the selection", () => {
    const s = newStore();
    s.getState().addSection();
    s.getState().addElement("text");
    const id = doc(s).sections[0]!.elements[0]!.id;
    expect(s.getState().selectedIds).toEqual([id]);
    s.getState().setVisible([id], false);
    expect(s.getState().selectedIds).toEqual([]);
  });

  it("zoom stays within 25..200% and never touches the document", () => {
    const s = newStore();
    s.getState().addSection();
    const before = doc(s);
    for (let i = 0; i < 10; i++) s.getState().zoomStep(-1);
    expect(s.getState().zoom).toBe(0.25);
    for (let i = 0; i < 10; i++) s.getState().zoomStep(1);
    expect(s.getState().zoom).toBe(2);
    s.getState().setZoom(0.1);
    expect(s.getState().zoom).toBe(0.25);
    expect(doc(s)).toBe(before);
    expect(s.getState().history.past.length).toBe(1);
  });

  it("read-only mode blocks every edit", () => {
    const s = newStore(true);
    s.getState().addSection();
    s.getState().addElement("text");
    expect(doc(s).sections).toHaveLength(0);
    expect(s.getState().history.past).toHaveLength(0);
  });
});

describe("shortcuts (Lampiran A)", () => {
  it("maps the documented shortcuts", () => {
    expect(resolveShortcut({ key: "z", ctrlKey: true })).toEqual({ type: "undo" });
    expect(resolveShortcut({ key: "z", metaKey: true })).toEqual({ type: "undo" });
    expect(resolveShortcut({ key: "Z", ctrlKey: true, shiftKey: true })).toEqual({ type: "redo" });
    expect(resolveShortcut({ key: "y", ctrlKey: true })).toEqual({ type: "redo" });
    expect(resolveShortcut({ key: "c", ctrlKey: true })).toEqual({ type: "copy" });
    expect(resolveShortcut({ key: "v", metaKey: true })).toEqual({ type: "paste" });
    expect(resolveShortcut({ key: "d", ctrlKey: true })).toEqual({ type: "duplicate" });
    expect(resolveShortcut({ key: "Delete" })).toEqual({ type: "delete" });
    expect(resolveShortcut({ key: "Backspace" })).toEqual({ type: "delete" });
    expect(resolveShortcut({ key: "Escape" })).toEqual({ type: "escape" });
    expect(resolveShortcut({ key: "ArrowLeft" })).toEqual({ type: "nudge", dx: -1, dy: 0 });
    expect(resolveShortcut({ key: "ArrowDown", shiftKey: true })).toEqual({
      type: "nudge",
      dx: 0,
      dy: 10,
    });
    expect(resolveShortcut({ key: "a" })).toBeNull();
    expect(resolveShortcut({ key: "x", ctrlKey: true })).toBeNull();
    expect(isPanKey({ key: " " })).toBe(true);
  });
});

describe("autosave (debounce + conflict detection)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(save: SaveFn) {
    const store = newStore();
    const autosaver = createAutosaver({ store, save, delayMs: 1000, retryDelayMs: 3000 });
    return { store, autosaver };
  }

  it("collapses many commits into one save and does not save while idle", async () => {
    const save = vi.fn<SaveFn>().mockResolvedValue({ ok: true, revision: 2 });
    const { store } = setup(save);
    store.getState().addSection();
    for (let i = 0; i < 20; i++) store.getState().addElement("text");
    expect(store.getState().saveStatus).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![1]).toBe(1);
    expect(store.getState().saveStatus).toBe("saved");
    expect(store.getState().revision).toBe(2);
    expect(isDirty(store.getState())).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("saves edits made during an in-flight save with the new revision", async () => {
    let release: (() => void) | undefined;
    const save = vi
      .fn<SaveFn>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ ok: true, revision: 2 });
          }),
      )
      .mockResolvedValue({ ok: true, revision: 3 });
    const { store } = setup(save);
    store.getState().addSection();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.getState().saveStatus).toBe("saving");

    store.getState().addElement("circle"); // edit while saving
    release!();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]![1]).toBe(2);
    expect(store.getState().revision).toBe(3);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("stops on conflict, keeps the local document, and resumes after adoptRevision", async () => {
    const save = vi
      .fn<SaveFn>()
      .mockResolvedValueOnce({ ok: false, kind: "conflict", message: "Versi lebih baru" })
      .mockResolvedValue({ ok: true, revision: 8 });
    const { store, autosaver } = setup(save);
    store.getState().addSection();
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getState().saveStatus).toBe("conflict");
    expect(store.getState().saveError).toBe("Versi lebih baru");

    store.getState().addElement("text"); // more edits do not trigger saves while in conflict
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(doc(store).sections[0]!.elements).toHaveLength(1);

    store.getState().adoptRevision(7);
    await autosaver.flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]![1]).toBe(7);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("retries transient errors with back-off, but waits for an edit after validation errors", async () => {
    const save = vi
      .fn<SaveFn>()
      .mockResolvedValueOnce({ ok: false, kind: "error", message: "offline" })
      .mockResolvedValueOnce({ ok: false, kind: "invalid", message: "Dokumen tidak valid" })
      .mockResolvedValue({ ok: true, revision: 2 });
    const { store } = setup(save);
    store.getState().addSection();
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getState().saveStatus).toBe("error");
    await vi.advanceTimersByTimeAsync(3000); // retry -> invalid
    expect(save).toHaveBeenCalledTimes(2);
    expect(store.getState().saveError).toBe("Dokumen tidak valid");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(save).toHaveBeenCalledTimes(2); // no retry for invalid
    store.getState().addElement("text");
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(3);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("undo back to the persisted state clears the dirty flag without saving", async () => {
    const save = vi.fn<SaveFn>().mockResolvedValue({ ok: true, revision: 2 });
    const { store } = setup(save);
    store.getState().addSection();
    store.getState().undo();
    expect(isDirty(store.getState())).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("never saves in read-only mode", async () => {
    const save = vi.fn<SaveFn>().mockResolvedValue({ ok: true, revision: 2 });
    const store = newStore(true);
    createAutosaver({ store, save, delayMs: 10 });
    store.getState().addSection();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();
  });
});
