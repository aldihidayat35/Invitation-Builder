import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEditorStore } from "@/features/editor/core/store";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { TopBar } from "@/features/editor/components/TopBar";
import { minimalDocument } from "../../helpers/documents";
import { snapToGuides } from "@/features/editor/core/geometry";

import { canonicalDocumentSchema } from "@/lib/schema";

describe("Snap to Guides (Perataan Otomatis) in Editor", () => {
  it("initializes with snapToGuides enabled by default in store", () => {
    const store = createEditorStore({
      document: canonicalDocumentSchema.parse(minimalDocument()),
      revision: 1,
    });
    expect(store.getState().snapToGuides).toBe(true);

    store.getState().toggleSnapToGuides();
    expect(store.getState().snapToGuides).toBe(false);

    store.getState().setSnapToGuides(true);
    expect(store.getState().snapToGuides).toBe(true);
  });

  it("renders the Snap to Guides toggle button in TopBar and updates on click", () => {
    const store = createEditorStore({
      document: canonicalDocumentSchema.parse(minimalDocument()),
      revision: 1,
    });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws-1">
        <TopBar
          templateId="tpl-1"
          templateName="Template Pernikahan"
          currentRevision={async () => 1}
        />
      </EditorProvider>,
    );

    const snapButton = screen.getByTestId("toggle-snap-guides");
    expect(snapButton).toBeInTheDocument();
    expect(snapButton).toHaveAttribute("data-active", "true");
    expect(snapButton).toHaveTextContent(/Snap Aktif/i);

    // Toggle off
    fireEvent.click(snapButton);
    expect(snapButton).toHaveAttribute("data-active", "false");
    expect(snapButton).toHaveTextContent(/Snap Mati/i);
    expect(store.getState().snapToGuides).toBe(false);

    // Toggle on again
    fireEvent.click(snapButton);
    expect(snapButton).toHaveAttribute("data-active", "true");
    expect(snapButton).toHaveTextContent(/Snap Aktif/i);
    expect(store.getState().snapToGuides).toBe(true);
  });

  it("computes alignments accurately for both section bounds and neighbour elements", () => {
    const section = { width: 390, height: 844 };
    const elements = [
      { x: 40, y: 120, w: 100, h: 50, rotation: 0 },
      { x: 200, y: 120, w: 100, h: 50, rotation: 0 },
    ];

    // Element dragged close to section horizontal center (195)
    const snapCenter = snapToGuides(
      { x: 147, y: 400, w: 100, h: 40, rotation: 0 },
      section,
      elements,
    );
    // Center is 147 + 50 = 197. Target section center is 195. dx = 195 - 197 = -2
    expect(snapCenter.dx).toBe(-2);
    expect(snapCenter.guides.vertical).toContain(195);

    // Element dragged close to existing neighbour Y top position (120)
    const snapNeighbourTop = snapToGuides(
      { x: 40, y: 122, w: 80, h: 40, rotation: 0 },
      section,
      elements,
    );
    // Top is 122, target is 120 (delta: -2, closer than center 142 to 145 which is delta: +3)
    expect(snapNeighbourTop.dy).toBe(-2);
    expect(snapNeighbourTop.guides.horizontal).toContain(120);
  });
});
