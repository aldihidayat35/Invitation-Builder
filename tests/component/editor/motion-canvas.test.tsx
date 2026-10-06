/**
 * Component tests for Motion Path Canvas Editing & Floating Toolbar (Adobe Animate / Flash style).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Artboard } from "@/features/editor/components/Artboard";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { canonicalDocumentSchema, type CanonicalDocument, type Element } from "@/lib/schema";

function makeDocWithAnimatedElement(): {
  doc: CanonicalDocument;
  element: Element;
} {
  const element: Element = {
    id: "el_shape_motion",
    name: "Bintang 1",
    type: "shape",
    visible: true,
    locked: false,
    frame: { x: 50, y: 50, w: 100, h: 100, rotation: 0 },
    shapeType: "rectangle",
    style: { fill: "#6366f1", radius: 0, opacity: 1 },
    animations: {
      motion: {
        enabled: true,
        preset: "custom",
        pathShape: "curved",
        curviness: 1.0,
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
    },
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

describe("Artboard Motion Floating Toolbar (Adobe Animate Mode)", () => {
  it("renders floating motion bar when editingMotion is active", () => {
    const { doc } = makeDocWithAnimatedElement();
    const store = createEditorStore({ document: doc, revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Artboard />
      </EditorProvider>,
    );

    expect(screen.queryByTestId("motion-floating-bar")).not.toBeInTheDocument();

    // Activate motion edit mode
    act(() => {
      store.getState().setEditingMotion({ sectionId: "sec_1", elementId: "el_shape_motion" });
    });

    expect(screen.getByTestId("motion-floating-bar")).toBeInTheDocument();
    expect(screen.getByText("Bintang 1")).toBeInTheDocument();
  });

  it("adds waypoint, reverses path, and plays preview via floating bar actions", () => {
    const { doc } = makeDocWithAnimatedElement();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().setEditingMotion({ sectionId: "sec_1", elementId: "el_shape_motion" });

    const replayHandler = vi.fn();
    window.addEventListener("dib:replay-animation", replayHandler);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Artboard />
      </EditorProvider>,
    );

    // Add waypoint
    const addBtn = screen.getByTestId("artboard-motion-add-btn");
    fireEvent.click(addBtn);

    let updated = store.getState().history.present.sections[0]!.elements[0]!;
    expect(updated.animations?.motion?.points).toHaveLength(3);

    // Reverse direction
    const revBtn = screen.getByTestId("artboard-motion-reverse-btn");
    fireEvent.click(revBtn);

    updated = store.getState().history.present.sections[0]!.elements[0]!;
    expect(updated.animations?.motion?.points[0]!.x).toBe(100);
    expect(updated.animations?.motion?.points[2]!.x).toBe(0);
    expect(updated.animations?.motion?.points[2]!.y).toBe(0);

    // Replay preview
    const replayBtn = screen.getByTestId("artboard-motion-replay-btn");
    fireEvent.click(replayBtn);

    expect(replayHandler).toHaveBeenCalled();
    const detail = (replayHandler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.trackType).toBe("motion");
    expect(detail.elementId).toBe("el_shape_motion");

    window.removeEventListener("dib:replay-animation", replayHandler);
  });

  it("exits motion edit mode when clicking Selesai in floating bar", () => {
    const { doc } = makeDocWithAnimatedElement();
    const store = createEditorStore({ document: doc, revision: 1 });
    store.getState().setEditingMotion({ sectionId: "sec_1", elementId: "el_shape_motion" });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <Artboard />
      </EditorProvider>,
    );

    const doneBtn = screen.getByTestId("artboard-motion-done-btn");
    fireEvent.click(doneBtn);

    expect(store.getState().editingMotion).toBeNull();
    expect(screen.queryByTestId("motion-floating-bar")).not.toBeInTheDocument();
  });
});
