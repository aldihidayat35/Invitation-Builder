/**
 * Component test: AnimationPanel Inspector Controls (FR-ANM-005, FR-ANM-006, AC-07).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AnimationPanel } from "@/features/editor/components/AnimationPanel";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema, type Element, type Section } from "@/lib/schema";

describe("AnimationPanel Component (FR-ANM-005, FR-ANM-006, AC-07)", () => {
  function renderWithStore(element: Element, sectionId: string) {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);
    const targetSection = doc.sections.find((s) => s.id === sectionId);
    if (!targetSection) {
      const newSection: Section = {
        id: sectionId,
        name: "Test Section",
        baseHeight: 844,
        background: { color: "#ffffff", fit: "cover" },
        overflow: "hidden",
        visible: true,
        elements: [element],
      };
      doc.sections.push(newSection);
    } else {
      targetSection.elements.push(element);
    }

    const store = createEditorStore({ document: doc, revision: 1 });

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId={sectionId} />
      </EditorProvider>,
    );

    return { ...utils, store };
  }

  it("renders the animation inspector with 3 tabs and preset boxes", () => {
    const textElement: Element = {
      id: "el_text_1",
      type: "text",
      frame: { x: 10, y: 10, w: 200, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Romeo & Juliet" }] },
      style: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        opacity: 1,
      },
    };

    renderWithStore(textElement, "sec_1");
    expect(screen.getByTestId("animation-inspector")).toBeInTheDocument();
    expect(screen.getByTestId("anim-tab-enter")).toBeInTheDocument();
    expect(screen.getByTestId("anim-tab-exit")).toBeInTheDocument();
    expect(screen.getByTestId("anim-tab-attention")).toBeInTheDocument();
    expect(screen.getByTestId("preset-box-none")).toBeInTheDocument();
    expect(screen.getByTestId("preset-box-fadeIn")).toBeInTheDocument();
  });

  it("updates store when a preset box is chosen", () => {
    const textElement: Element = {
      id: "title_1",
      type: "text",
      frame: { x: 10, y: 10, w: 200, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Wedding" }] },
      style: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        opacity: 1,
      },
    };

    const { store } = renderWithStore(textElement, "sec_1");
    const charRiseBox = screen.getByTestId("preset-box-charRise");

    fireEvent.click(charRiseBox);

    const presentDoc = store.getState().history.present;
    const updatedEl = presentDoc.sections
      .flatMap((s) => s.elements)
      .find((e) => e.id === "title_1");

    expect(updatedEl?.animations?.enter?.presetId).toBe("charRise");
    expect(updatedEl?.animations?.enter?.staggerUnit).toBe("char");
  });

  it("switches tabs to exit and attention to configure respective tracks", () => {
    const textElement: Element = {
      id: "title_1",
      type: "text",
      frame: { x: 10, y: 10, w: 200, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Wedding" }] },
      style: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        opacity: 1,
      },
    };

    const { store } = renderWithStore(textElement, "sec_1");

    // Switch to Exit tab
    fireEvent.click(screen.getByTestId("anim-tab-exit"));
    expect(screen.getByTestId("preset-box-fadeOut")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("preset-box-fadeOut"));

    let updatedEl = store
      .getState()
      .history.present.sections.flatMap((s) => s.elements)
      .find((e) => e.id === "title_1");
    expect(updatedEl?.animations?.exit?.presetId).toBe("fadeOut");

    // Switch to Attention / Lain-lain tab
    fireEvent.click(screen.getByTestId("anim-tab-attention"));
    expect(screen.getByTestId("preset-box-pulseSoft")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("preset-box-pulseSoft"));

    updatedEl = store
      .getState()
      .history.present.sections.flatMap((s) => s.elements)
      .find((e) => e.id === "title_1");
    expect(updatedEl?.animations?.attention?.presetId).toBe("pulseSoft");
  });

  it("dispatches replay event when replay button is clicked", () => {
    const animatedElement: Element = {
      id: "title_1",
      type: "text",
      frame: { x: 10, y: 10, w: 200, h: 40, rotation: 0 },
      visible: true,
      locked: false,
      content: { segments: [{ text: "Wedding" }] },
      style: {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        opacity: 1,
      },
      animations: {
        enter: {
          presetId: "charRise",
          trigger: "onEnterViewport",
          durationMs: 600,
          delayMs: 0,
          easing: "back.out",
          repeat: 0,
          yoyo: false,
          staggerUnit: "char",
          staggerAmountMs: 45,
          once: true,
        },
      },
    };

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    renderWithStore(animatedElement, "sec_1");

    const replayBtn = screen.getByTestId("replay-element-btn");
    fireEvent.click(replayBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe("dib:replay-animation");
    expect(event.detail).toEqual({ elementId: "title_1", sectionId: "sec_1", trackType: "enter" });

    const replaySectionBtn = screen.getByTestId("replay-section-btn");
    fireEvent.click(replaySectionBtn);

    const sectionEvent = dispatchSpy.mock.calls[1]?.[0] as CustomEvent;
    expect(sectionEvent.type).toBe("dib:replay-animation");
    expect(sectionEvent.detail).toEqual({ sectionId: "sec_1", trackType: "enter" });
  });
});
