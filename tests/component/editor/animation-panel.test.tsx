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

  it("renders the animation inspector heading and preset select", () => {
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
    expect(screen.getByRole("combobox", { name: "Preset" })).toBeInTheDocument();
  });

  it("updates store when a preset is chosen", () => {
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
    const presetSelect = screen.getByRole("combobox", { name: "Preset" });

    fireEvent.change(presetSelect, { target: { value: "charRise" } });

    const presentDoc = store.getState().history.present;
    const updatedEl = presentDoc.sections
      .flatMap((s) => s.elements)
      .find((e) => e.id === "title_1");

    expect(updatedEl?.animations?.enter?.presetId).toBe("charRise");
    expect(updatedEl?.animations?.enter?.staggerUnit).toBe("char");
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
    expect(event.detail).toEqual({ elementId: "title_1", sectionId: "sec_1" });

    const replaySectionBtn = screen.getByTestId("replay-section-btn");
    fireEvent.click(replaySectionBtn);

    const sectionEvent = dispatchSpy.mock.calls[1]?.[0] as CustomEvent;
    expect(sectionEvent.type).toBe("dib:replay-animation");
    expect(sectionEvent.detail).toEqual({ sectionId: "sec_1" });
  });
});
