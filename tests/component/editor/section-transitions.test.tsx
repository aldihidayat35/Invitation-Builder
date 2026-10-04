/**
 * Component tests for Section Scroll Transitions.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SectionTransitionControl } from "@/features/editor/components/SectionTransitionControl";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { AnimatedSection } from "@/features/renderer/components/AnimatedSection";
import { SECTION_TRANSITIONS_CATALOG, getSectionTransitionStyles } from "@/features/animations/section-transitions";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema, type Section } from "@/lib/schema";
import type { ResolvedSection } from "@/lib/engine";

describe("Section Scroll Transitions", () => {
  function renderWithStore(section: Section) {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);
    const existing = doc.sections.find((s) => s.id === section.id);
    if (existing) {
      Object.assign(existing, section);
    } else {
      doc.sections.push(section);
    }

    const store = createEditorStore({ document: doc, revision: 1 });

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <SectionTransitionControl section={section} readOnly={false} />
      </EditorProvider>,
    );

    return { ...utils, store };
  }

  const baseSection: Section = {
    id: "sec_hero",
    name: "Hero Section",
    baseHeight: 844,
    background: { color: "#ffffff", fit: "cover" },
    overflow: "hidden",
    visible: true,
    elements: [],
    transition: {
      type: "none",
      durationMs: 800,
      delayMs: 0,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      once: false,
    },
  };

  it("provides at least 10 section transition modes (12 distinct + none = 13 presets)", () => {
    expect(SECTION_TRANSITIONS_CATALOG.length).toBeGreaterThanOrEqual(10);
    const presetIds = SECTION_TRANSITIONS_CATALOG.map((t) => t.id);
    expect(presetIds).toContain("fade");
    expect(presetIds).toContain("slideUp");
    expect(presetIds).toContain("slideDown");
    expect(presetIds).toContain("slideLeft");
    expect(presetIds).toContain("slideRight");
    expect(presetIds).toContain("zoomIn");
    expect(presetIds).toContain("zoomOut");
    expect(presetIds).toContain("flipUp");
    expect(presetIds).toContain("flipDown");
    expect(presetIds).toContain("curtain");
    expect(presetIds).toContain("blur");
    expect(presetIds).toContain("book");
  });

  it("renders category tabs and preset buttons in SectionTransitionControl", () => {
    renderWithStore(baseSection);

    // Categories tabs
    expect(screen.getByRole("tab", { name: "Semua" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Dasar" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Geser" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Zoom & 3D" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sinematik" })).toBeInTheDocument();

    // Default "none" notice
    expect(screen.getByText(/akan tampil normal tanpa efek transisi/i)).toBeInTheDocument();
  });

  it("updates store when a transition mode is selected", () => {
    const { store } = renderWithStore(baseSection);

    const slideUpBtn = screen.getByTestId("section-trans-slideUp");
    fireEvent.click(slideUpBtn);

    const updated = store.getState().history.present.sections.find((s) => s.id === "sec_hero");
    expect(updated?.transition?.type).toBe("slideUp");
  });

  it("allows tuning duration, delay, easing, and once repeat", () => {
    const sectionWithTrans: Section = {
      ...baseSection,
      transition: {
        type: "slideUp",
        durationMs: 800,
        delayMs: 100,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        once: false,
      },
    };

    const { store } = renderWithStore(sectionWithTrans);

    // Duration input
    const durationInput = screen.getByLabelText(/Durasi \(ms\)/i);
    fireEvent.change(durationInput, { target: { value: "1200" } });
    fireEvent.blur(durationInput);

    let updated = store.getState().history.present.sections.find((s) => s.id === "sec_hero");
    expect(updated?.transition?.durationMs).toBe(1200);

    // Delay input
    const delayInput = screen.getByLabelText(/Jeda \/ Delay \(ms\)/i);
    fireEvent.change(delayInput, { target: { value: "250" } });
    fireEvent.blur(delayInput);

    updated = store.getState().history.present.sections.find((s) => s.id === "sec_hero");
    expect(updated?.transition?.delayMs).toBe(250);

    // Repeat on re-scroll checkbox
    const repeatCheckbox = screen.getByRole("checkbox");
    fireEvent.click(repeatCheckbox);

    updated = store.getState().history.present.sections.find((s) => s.id === "sec_hero");
    expect(updated?.transition?.once).toBe(true);
  });

  it("dispatches dib:preview-section-transition event on button click", () => {
    const sectionWithTrans: Section = {
      ...baseSection,
      transition: {
        type: "flipUp",
        durationMs: 900,
        delayMs: 0,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        once: false,
      },
    };

    renderWithStore(sectionWithTrans);

    const eventListener = vi.fn();
    window.addEventListener("dib:preview-section-transition", eventListener);

    const previewBtn = screen.getByTestId("preview-section-trans-btn");
    fireEvent.click(previewBtn);

    expect(eventListener).toHaveBeenCalledTimes(1);
    const event = eventListener.mock.calls[0]?.[0] as CustomEvent<{ sectionId: string }> | undefined;
    expect(event?.detail.sectionId).toBe("sec_hero");

    window.removeEventListener("dib:preview-section-transition", eventListener);
  });

  it("calculates distinct CSS styles for visible and hidden states", () => {
    const trans = {
      type: "slideUp" as const,
      durationMs: 800,
      delayMs: 0,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      once: false,
    };

    const hiddenStyle = getSectionTransitionStyles(trans, false);
    expect(hiddenStyle.opacity).toBe(0);
    expect(hiddenStyle.transform).toBe("translateY(60px)");

    const visibleStyle = getSectionTransitionStyles(trans, true);
    expect(visibleStyle.opacity).toBe(1);
    expect(visibleStyle.transform).toBe("none");
  });

  it("renders AnimatedSection with correct transition data attributes", () => {
    const resolvedSection: ResolvedSection = {
      id: "sec_1",
      name: "Acara",
      baseHeight: 844,
      background: { color: "#ffffff", fit: "cover", image: null },
      overflow: "hidden",
      hidden: false,
      elements: [],
      transition: {
        type: "zoomIn",
        durationMs: 700,
        delayMs: 50,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        once: true,
      },
    };

    render(
      <AnimatedSection section={resolvedSection} first={false}>
        <div data-testid="section-content">Isi Acara</div>
      </AnimatedSection>,
    );

    const secEl = screen.getByRole("region", { name: "Acara" });
    expect(secEl).toHaveAttribute("data-section-transition", "zoomIn");
    expect(screen.getByTestId("section-content")).toBeInTheDocument();
  });
});
