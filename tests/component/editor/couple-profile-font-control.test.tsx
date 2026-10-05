import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WidgetPanel } from "@/features/editor/components/WidgetPanel";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import type { CanonicalDocument, Element } from "@/lib/schema";

type WidgetElement = Extract<Element, { type: "widget" }>;

describe("Couple Profile Font Control in WidgetPanel", () => {
  it("renders font selectors for nameFont and bodyFont and updates store", () => {
    const coupleElement: WidgetElement = {
      id: "widget_couple_1",
      type: "widget",
      name: "coupleProfile",
      frame: { x: 0, y: 0, w: 326, h: 560, rotation: 0 },
      visible: true,
      locked: false,
      style: { variant: "side-by-side", color: "#333333" },
      widgetType: "coupleProfile",
      widgetVersion: 1,
      props: {
        title: "Mempelai",
        nameFont: "Great Vibes",
        bodyFont: "Montserrat",
        groom: { name: "Rama" },
        bride: { name: "Alya" },
      },
    };

    const doc: CanonicalDocument = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: { colors: {}, fonts: {}, spacing: {} },
      },
      variables: [],
      sections: [
        {
          id: "sec_1",
          name: "Section 1",
          baseHeight: 844,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [coupleElement],
        },
      ],
    };

    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <WidgetPanel element={coupleElement} readOnly={false} tokens={doc.design.tokens} />
      </EditorProvider>,
    );

    // Verify nameFont selector is rendered with Great Vibes
    const nameFontSelect = screen.getByRole("combobox", {
      name: "Font Nama Mempelai",
    }) as HTMLSelectElement;
    expect(nameFontSelect).toBeInTheDocument();
    expect(nameFontSelect.value).toBe("Great Vibes");

    // Verify bodyFont selector is rendered with Montserrat
    const bodyFontSelect = screen.getByRole("combobox", {
      name: "Font Keterangan & Teks",
    }) as HTMLSelectElement;
    expect(bodyFontSelect).toBeInTheDocument();
    expect(bodyFontSelect.value).toBe("Montserrat");

    // Change nameFont to "Alex Brush"
    fireEvent.change(nameFontSelect, { target: { value: "Alex Brush" } });

    // Store is updated
    const updatedSection = store.getState().history.present.sections[0];
    expect(updatedSection).toBeDefined();
    const updatedProps = (updatedSection!.elements[0] as WidgetElement).props;
    expect(updatedProps.nameFont).toBe("Alex Brush");
  });
});
