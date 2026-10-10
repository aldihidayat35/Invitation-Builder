import { describe, it, expect } from "vitest";
import {
  addSection,
  createElement,
  createImageElement,
  findElement,
  extractCopiedStyle,
  applyCopiedStyle,
} from "@/features/editor/core/ops";
import { createEditorStore, type EditorStore } from "@/features/editor/core/store";
import { resolveShortcut } from "@/features/editor/core/shortcuts";
import {
  canonicalDocumentSchema,
  createEmptyDocument,
  type CanonicalDocument,
  type TextElement,
  type ShapeElement,
} from "@/lib/schema";

const ASSET_ID = "3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10";

const assertValid = (doc: CanonicalDocument) => {
  const parsed = canonicalDocumentSchema.safeParse(doc);
  expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error?.issues)).toBe(true);
};

describe("Editor Copy Style and Paste Style (Format Painter)", () => {
  function createSetupDoc(): {
    doc: CanonicalDocument;
    sectionId: string;
    textId: string;
    shapeId: string;
    imageId: string;
  } {
    let doc = createEmptyDocument();
    const secRes = addSection(doc);
    doc = secRes.document;
    const secId = secRes.sectionId;

    const t = createElement(doc, secId, "text");
    doc = t.document;
    const s = createElement(doc, secId, "rectangle");
    doc = s.document;
    const img = createImageElement(doc, secId, {
      assetId: ASSET_ID,
      width: 100,
      height: 100,
    });
    doc = img.document;

    return {
      doc,
      sectionId: secId,
      textId: t.elementId!,
      shapeId: s.elementId!,
      imageId: img.elementId!,
    };
  }

  it("extracts and applies complete style between text elements (same type)", () => {
    const { doc, textId } = createSetupDoc();
    const sourceEl = findElement(doc, textId)!.element as TextElement;

    // Customize source text element
    const styledSource: TextElement = {
      ...sourceEl,
      style: {
        ...sourceEl.style,
        fontFamily: "Playfair Display",
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1.6,
        letterSpacing: 2,
        textAlign: "right",
        color: "#c8963c",
        opacity: 0.85,
        shadow: {
          color: "#000000",
          blur: 12,
          offsetX: 2,
          offsetY: 6,
          opacity: 0.5,
        },
      },
      animations: {
        enter: {
          presetId: "fade-up",
          trigger: "onEnterViewport",
          durationMs: 800,
          delayMs: 200,
          easing: "ease-out",
          repeat: 0,
          yoyo: false,
          staggerUnit: "none",
          staggerAmountMs: 0,
          once: true,
        },
      },
    };

    const copied = extractCopiedStyle(styledSource);
    expect(copied.sourceType).toBe("text");
    expect(copied.style.fontFamily).toBe("Playfair Display");
    expect(copied.style.fontSize).toBe(32);
    expect(copied.style.color).toBe("#c8963c");
    expect(copied.animations?.enter?.presetId).toBe("fade-up");

    // Target text element with default styles
    const targetEl: TextElement = {
      ...sourceEl,
      id: "el_text_target",
      style: {
        ...sourceEl.style,
        fontFamily: "Inter",
        fontSize: 16,
        color: "#111111",
      },
    };

    const result = applyCopiedStyle(targetEl, copied) as TextElement;
    expect(result.style.fontFamily).toBe("Playfair Display");
    expect(result.style.fontSize).toBe(32);
    expect(result.style.fontWeight).toBe(700);
    expect(result.style.textAlign).toBe("right");
    expect(result.style.color).toBe("#c8963c");
    expect(result.style.opacity).toBe(0.85);
    expect(result.style.shadow?.blur).toBe(12);
    expect(result.animations?.enter?.presetId).toBe("fade-up");
  });

  it("transfers variable binding when copying from a bound text element", () => {
    const { doc, textId } = createSetupDoc();
    const sourceEl = findElement(doc, textId)!.element as TextElement;

    const boundSource: TextElement = {
      ...sourceEl,
      content: {
        segments: [
          {
            bind: "guestName",
            fallback: "Tamu Undangan",
          },
        ],
      },
    };

    const copied = extractCopiedStyle(boundSource);
    expect(copied.primaryBindingKey).toBe("guestName");
    expect(copied.primaryBindingFallback).toBe("Tamu Undangan");

    const targetEl: TextElement = {
      ...sourceEl,
      id: "el_text_target2",
      content: {
        segments: [{ text: "Nama Penerima" }],
      },
    };

    const result = applyCopiedStyle(targetEl, copied) as TextElement;
    expect("bind" in result.content.segments[0]!).toBe(true);
    expect((result.content.segments[0] as { bind: string }).bind).toBe("guestName");
    expect((result.content.segments[0] as { fallback?: string }).fallback).toBe("Tamu Undangan");
  });

  it("transfers styles intelligently across different types (text -> shape)", () => {
    const { doc, textId, shapeId } = createSetupDoc();
    const textEl = findElement(doc, textId)!.element as TextElement;
    const shapeEl = findElement(doc, shapeId)!.element as ShapeElement;

    const styledText: TextElement = {
      ...textEl,
      style: {
        ...textEl.style,
        color: "#e63946",
        opacity: 0.75,
        shadow: {
          color: "#000000",
          blur: 15,
          offsetX: 0,
          offsetY: 8,
          opacity: 0.3,
        },
      },
      animations: {
        enter: {
          presetId: "zoom-in",
          trigger: "onEnterViewport",
          durationMs: 600,
          delayMs: 100,
          easing: "ease-out",
          repeat: 0,
          yoyo: false,
          staggerUnit: "none",
          staggerAmountMs: 0,
          once: true,
        },
      },
    };

    const copied = extractCopiedStyle(styledText);
    const result = applyCopiedStyle(shapeEl, copied) as ShapeElement;

    // Color maps to shape fill
    expect(result.style.fill).toBe("#e63946");
    expect(result.style.opacity).toBe(0.75);
    expect(result.style.shadow?.blur).toBe(15);
    expect(result.animations?.enter?.presetId).toBe("zoom-in");
  });

  it("transfers shape stroke, radius, and fill between shapes", () => {
    const { doc, shapeId } = createSetupDoc();
    const shapeEl = findElement(doc, shapeId)!.element as ShapeElement;

    const styledShape: ShapeElement = {
      ...shapeEl,
      style: {
        fill: "#2a9d8f",
        stroke: { color: "#264653", width: 4 },
        radius: 16,
        opacity: 0.9,
      },
    };

    const copied = extractCopiedStyle(styledShape);
    const targetShape: ShapeElement = {
      ...shapeEl,
      id: "el_rect_target",
      style: {
        ...shapeEl.style,
        fill: "#ffffff",
      },
    };

    const result = applyCopiedStyle(targetShape, copied) as ShapeElement;
    expect(result.style.fill).toBe("#2a9d8f");
    expect(result.style.stroke?.width).toBe(4);
    expect(result.style.radius).toBe(16);
    expect(result.style.opacity).toBe(0.9);
  });

  it("supports keyboard shortcuts Ctrl+Alt+C and Ctrl+Alt+V", () => {
    expect(resolveShortcut({ key: "c", ctrlKey: true, altKey: true })).toEqual({
      type: "copy-style",
    });
    expect(resolveShortcut({ key: "v", ctrlKey: true, altKey: true })).toEqual({
      type: "paste-style",
    });
    expect(resolveShortcut({ key: "c", metaKey: true, altKey: true })).toEqual({
      type: "copy-style",
    });
    expect(resolveShortcut({ key: "v", metaKey: true, altKey: true })).toEqual({
      type: "paste-style",
    });
  });

  it("performs copyStyleSelected and pasteStyleSelected via EditorStore", () => {
    const { doc, textId, shapeId } = createSetupDoc();
    const store: EditorStore = createEditorStore({ document: doc, revision: 1 });

    // Patch style on text element
    store.getState().patchStyle([textId], { color: "#ff5722", opacity: 0.7 });
    store.getState().selectElements([textId]);
    expect(store.getState().copiedStyle).toBeNull();

    // Copy style
    store.getState().copyStyleSelected();
    expect(store.getState().copiedStyle).not.toBeNull();
    expect(store.getState().copiedStyle?.style.color).toBe("#ff5722");

    // Select shape and paste style
    store.getState().selectElements([shapeId]);
    store.getState().pasteStyleSelected();

    const updatedDoc = store.getState().history.present;
    assertValid(updatedDoc);

    const updatedShape = findElement(updatedDoc, shapeId)!.element as ShapeElement;
    expect(updatedShape.style.fill).toBe("#ff5722");
    expect(updatedShape.style.opacity).toBe(0.7);
  });
});
