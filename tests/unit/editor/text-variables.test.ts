import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "@/lib/schema";
import {
  addSection,
  createElement,
  updateElement,
  bindTextSegmentToVariable,
  unbindTextSegmentToStatic,
  updateVariable,
  removeVariable,
  addVariable,
} from "@/features/editor/core/ops";
import { textPreview } from "@/features/editor/core/display";
import { createEditorStore } from "@/features/editor/core/store";

describe("text-variables operations", () => {
  function makeDocWithText() {
    let doc = createEmptyDocument();
    const addedSec = addSection(doc);
    doc = addedSec.document;
    const sectionId = addedSec.sectionId;

    const addedEl = createElement(doc, sectionId, "text");
    doc = addedEl.document;
    const elementId = addedEl.elementId!;

    doc = updateElement(doc, elementId, (el) => {
      if (el.type !== "text") return el;
      return {
        ...el,
        content: {
          segments: [{ text: "Halo " }, { text: "Teman-Teman" }],
        },
      };
    });

    return { doc, sectionId, elementId };
  }

  it("converts a static text segment into a variable binding", () => {
    let { doc } = makeDocWithText();
    const textEl = doc.sections[0]!.elements[0]!;

    doc = addVariable(doc, {
      key: "tamu.nama",
      label: "Nama Tamu",
      type: "text",
      default: "Aldi Hidayat",
    });

    const nextDoc = bindTextSegmentToVariable(doc, textEl.id, 1, "tamu.nama", "Tamu Undangan");
    const updatedEl = nextDoc.sections[0]!.elements[0]!;

    if (updatedEl.type !== "text") throw new Error("Expected text element");
    expect(updatedEl.content.segments).toHaveLength(2);
    expect(updatedEl.content.segments[0]).toEqual({ text: "Halo " });
    expect(updatedEl.content.segments[1]).toEqual({
      bind: "tamu.nama",
      fallback: "Tamu Undangan",
    });
  });

  it("unbinds a variable segment back to static text using fallback or variable default", () => {
    let { doc } = makeDocWithText();
    const textEl = doc.sections[0]!.elements[0]!;

    doc = addVariable(doc, {
      key: "custom.acara",
      label: "Nama Acara",
      type: "text",
      default: "Resepsi Pernikahan",
    });

    doc = bindTextSegmentToVariable(doc, textEl.id, 1, "custom.acara", "Akad Nikah");

    // Unbind with explicit fallbackText
    const staticDoc = unbindTextSegmentToStatic(doc, textEl.id, 1, "Acara Spesial");
    const staticEl = staticDoc.sections[0]!.elements[0]!;
    if (staticEl.type !== "text") throw new Error("Expected text element");
    expect(staticEl.content.segments[1]).toEqual({ text: "Acara Spesial" });

    // Unbind without explicit text (falls back to variable default)
    const staticDoc2 = unbindTextSegmentToStatic(doc, textEl.id, 1);
    const staticEl2 = staticDoc2.sections[0]!.elements[0]!;
    if (staticEl2.type !== "text") throw new Error("Expected text element");
    expect(staticEl2.content.segments[1]).toEqual({ text: "Resepsi Pernikahan" });
  });

  it("updates an existing variable default value and label", () => {
    let { doc } = makeDocWithText();
    doc = addVariable(doc, {
      key: "custom.pesan",
      label: "Pesan Sambutan",
      type: "text",
      default: "Selamat datang!",
    });

    const updated = updateVariable(doc, "custom.pesan", {
      label: "Pesan Utama",
      default: "Turut mengundang segenap keluarga",
    });

    const found = updated.variables.find((v) => v.key === "custom.pesan");
    expect(found).toBeDefined();
    expect(found?.label).toBe("Pesan Utama");
    if (found && "default" in found) {
      expect(found.default).toBe("Turut mengundang segenap keluarga");
    }
  });

  it("removes a variable from document", () => {
    let { doc } = makeDocWithText();
    doc = addVariable(doc, {
      key: "test.var",
      label: "Test",
      type: "text",
      default: "123",
    });
    expect(doc.variables.some((v) => v.key === "test.var")).toBe(true);

    const nextDoc = removeVariable(doc, "test.var");
    expect(nextDoc.variables.some((v) => v.key === "test.var")).toBe(false);
  });

  it("resolves dynamic variable text in textPreview live WYSIWYG", () => {
    let { doc } = makeDocWithText();
    const textEl = doc.sections[0]!.elements[0]!;
    if (textEl.type !== "text") throw new Error("Expected text element");

    doc = addVariable(doc, {
      key: "tamu.nama",
      label: "Nama Tamu",
      type: "text",
      default: "Budi Santoso",
    });

    const boundDoc = bindTextSegmentToVariable(doc, textEl.id, 1, "tamu.nama", "Sdr(i)");
    const boundEl = boundDoc.sections[0]!.elements[0]!;
    if (boundEl.type !== "text") throw new Error("Expected text element");

    // Preview with variables passed resolves variable's default value
    const previewWithVars = textPreview(boundEl, boundDoc.variables);
    expect(previewWithVars).toBe("Halo Budi Santoso");

    // Preview without variables resolves fallback
    const previewFallback = textPreview(boundEl, []);
    expect(previewFallback).toBe("Halo Sdr(i)");

    // Guest context variable preview
    const guestDoc = bindTextSegmentToVariable(doc, textEl.id, 1, "guest.name");
    const guestEl = guestDoc.sections[0]!.elements[0]!;
    if (guestEl.type !== "text") throw new Error("Expected text element");
    expect(textPreview(guestEl)).toBe("Halo Bapak/Ibu/Saudara(i)");
    expect(textPreview(guestEl, [], "Dr. H. Ahmad Dahlan, S.T.")).toBe("Halo Dr. H. Ahmad Dahlan, S.T.");
  });

  it("integrates with EditorStore actions and undo/redo", () => {
    const { doc } = makeDocWithText();
    const store = createEditorStore({ document: doc, revision: 1 });
    const textEl = doc.sections[0]!.elements[0]!;

    store.getState().addVariable({
      key: "mempelai.pria",
      label: "Pengantin Pria",
      type: "text",
      default: "Romeo",
    });

    store.getState().bindTextSegment(textEl.id, 1, "mempelai.pria", "Romeo");

    let state = store.getState().history.present;
    let el = state.sections[0]!.elements[0]!;
    if (el.type !== "text") throw new Error("Expected text element");
    expect(el.content.segments[1]).toEqual({
      bind: "mempelai.pria",
      fallback: "Romeo",
    });

    // Update dynamic variable data
    store.getState().updateVariable("mempelai.pria", { default: "Romeo Montague" });
    state = store.getState().history.present;
    const v = state.variables.find((item) => item.key === "mempelai.pria");
    expect(v && "default" in v ? v.default : "").toBe("Romeo Montague");

    // Unbind back to static text
    store.getState().unbindTextSegment(textEl.id, 1, "Romeo Montague");
    state = store.getState().history.present;
    el = state.sections[0]!.elements[0]!;
    if (el.type !== "text") throw new Error("Expected text element");
    expect(el.content.segments[1]).toEqual({ text: "Romeo Montague" });

    // Test Undo
    store.getState().undo();
    state = store.getState().history.present;
    el = state.sections[0]!.elements[0]!;
    if (el.type !== "text") throw new Error("Expected text element");
    expect("bind" in el.content.segments[1]!).toBe(true);
  });
});
