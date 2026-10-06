/**
 * Component tests for Motion Path Animation Panel in Inspector.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnimationPanel } from "@/features/editor/components/AnimationPanel";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";

function makeDocWithElement(animations?: Element["animations"]): {
  doc: CanonicalDocument;
  element: Element;
} {
  const element: Element = {
    id: "el_shape_1",
    name: "Kotak 1",
    type: "shape",
    visible: true,
    locked: false,
    frame: { x: 50, y: 50, w: 100, h: 100, rotation: 0 },
    shapeType: "rectangle",
    style: { fill: "#6366f1", radius: 0, opacity: 1 },
    animations,
  };

  const doc = canonicalDocumentSchema.parse({
    schemaVersion: 1,
    variables: [],
    design: {
      tokens: { colors: {}, fonts: {}, spacing: {} },
    },
    sections: [
      {
        id: "sec_1",
        name: "Cover",
        baseHeight: 800,
        visible: true,
        background: { color: "#ffffff" },
        overflow: "hidden",
        elements: [element],
      },
    ],
  });

  return { doc, element };
}

describe("AnimationPanel Motion Feature", () => {
  it("renders Gerakan (Motion) tab and switches view on click", () => {
    const { doc, element } = makeDocWithElement();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().selectElements(["el_shape_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId="sec_1" />
      </EditorProvider>,
    );

    const motionTab = screen.getByTestId("anim-tab-motion");
    expect(motionTab).toBeInTheDocument();

    fireEvent.click(motionTab);
    expect(screen.getByTestId("motion-tab-content")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-custom-motion-btn")).toBeInTheDocument();
  });

  it("enables custom motion and enters canvas editing mode on click", () => {
    const { doc, element } = makeDocWithElement();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().selectElements(["el_shape_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId="sec_1" />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("anim-tab-motion"));

    // Click "Aktifkan"
    const toggleBtn = screen.getByTestId("toggle-custom-motion-btn");
    fireEvent.click(toggleBtn);

    const updated = store.getState().history.present.sections[0]!.elements[0]!;
    expect(updated.animations?.motion).toBeDefined();
    expect(updated.animations?.motion?.enabled).toBe(true);
    expect(store.getState().editingMotion).toEqual({
      sectionId: "sec_1",
      elementId: "el_shape_1",
    });
  });

  it("allows adjusting curvature (melengkung) via slider", () => {
    const { doc, element } = makeDocWithElement({
      motion: {
        enabled: true,
        preset: "arcUp",
        pathShape: "arcUp",
        curviness: 1.2,
        points: [
          { x: -100, y: 0 },
          { x: 100, y: 0 },
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
    });

    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().selectElements(["el_shape_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId="sec_1" />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("anim-tab-motion"));

    const slider = screen.getByTestId("motion-curviness-slider");
    expect(slider).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "1.8" } });

    const updated = store.getState().history.present.sections[0]!.elements[0]!;
    expect(updated.animations?.motion?.curviness).toBe(1.8);
  });

  it("allows adding waypoints and reversing motion direction", () => {
    const { doc, element } = makeDocWithElement({
      motion: {
        enabled: true,
        preset: "leftToRight",
        pathShape: "linear",
        curviness: 0,
        points: [
          { x: -100, y: 0 },
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
    });

    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().selectElements(["el_shape_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId="sec_1" />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("anim-tab-motion"));

    // Add waypoint
    const addBtn = screen.getByTestId("motion-add-point-btn");
    fireEvent.click(addBtn);

    let updated = store.getState().history.present.sections[0]!.elements[0]!;
    expect(updated.animations?.motion?.points).toHaveLength(3);

    // Reverse points
    const reverseBtn = screen.getByTestId("motion-reverse-btn");
    fireEvent.click(reverseBtn);

    updated = store.getState().history.present.sections[0]!.elements[0]!;
    expect(updated.animations?.motion?.points[0]!.x).toBe(100);
    expect(updated.animations?.motion?.points[2]!.x).toBe(0);
    expect(updated.animations?.motion?.points[2]!.y).toBe(0);
  });

  it("dispatches replay event on clicking Putar Preview Gerakan", () => {
    const { doc, element } = makeDocWithElement({
      motion: {
        enabled: true,
        preset: "waveHorizontal",
        pathShape: "wave",
        curviness: 1.4,
        points: [
          { x: -120, y: 0 },
          { x: 120, y: 0 },
        ],
        durationMs: 2500,
        delayMs: 0,
        easing: "ease-in-out",
        repeat: 0,
        yoyo: false,
        autoRotate: true,
        trigger: "onEnterViewport",
        once: true,
      },
    });

    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().selectElements(["el_shape_1"]);

    const replayHandler = vi.fn();
    window.addEventListener("dib:replay-animation", replayHandler);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId="sec_1" />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("anim-tab-motion"));

    const replayBtn = screen.getByTestId("replay-motion-btn");
    fireEvent.click(replayBtn);

    expect(replayHandler).toHaveBeenCalled();
    const detail = (replayHandler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.trackType).toBe("motion");
    expect(detail.elementId).toBe("el_shape_1");

    window.removeEventListener("dib:replay-animation", replayHandler);
  });

  it("locks the end waypoint to the object center (0, 0) and prevents manual coordinate edit", () => {
    const { doc, element } = makeDocWithElement({
      motion: {
        enabled: true,
        preset: "custom",
        pathShape: "curved",
        curviness: 1,
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
    });

    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().selectElements(["el_shape_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <AnimationPanel element={element} readOnly={false} sectionId="sec_1" />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("anim-tab-motion"));

    expect(screen.getByText("Titik Akhir (Tengah Objek)")).toBeInTheDocument();
    expect(screen.getByText(/Terkunci di pusat objek/i)).toBeInTheDocument();
    // Start waypoint has editable inputs
    expect(screen.getByLabelText("Geser X (px)")).toBeInTheDocument();
    // End waypoint does not render coordinate input fields
    expect(screen.queryByTestId("motion-pt-1-x")).not.toBeInTheDocument();
    expect(screen.queryByTestId("motion-remove-point-1")).not.toBeInTheDocument();
  });
});
