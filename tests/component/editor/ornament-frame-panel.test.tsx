import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WidgetPanel } from "@/features/editor/components/WidgetPanel";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import type { CanonicalDocument, Element } from "@/lib/schema";

type WidgetElement = Extract<Element, { type: "widget" }>;

describe("OrnamentFrame Widget Panel UI (Clean, consistent, non-redundant)", () => {
  it("renders clean controls without duplicate Bentuk Bingkai or fake data-binding selectors", () => {
    const ornamentElement: WidgetElement = {
      id: "widget_ornament_1",
      type: "widget",
      name: "ornamentFrame",
      frame: { x: 0, y: 0, w: 326, h: 360, rotation: 0 },
      visible: true,
      locked: false,
      style: { variant: "arch-window", color: "#b4833e" },
      widgetType: "ornamentFrame",
      widgetVersion: 1,
      props: {
        shape: "arch-window",
        innerGap: 12,
        fillOpacity: 100,
        strokeWidth: 2,
        doubleBorder: true,
        animationMode: "once",
        animationSpeed: "normal",
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
          elements: [ornamentElement],
        },
      ],
    };

    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <WidgetPanel element={ornamentElement} readOnly={false} tokens={doc.design.tokens} />
      </EditorProvider>,
    );

    // 1. Pilihan Gaya (11 Variasi) is rendered
    expect(screen.getByText(/Pilihan Gaya \(11 Variasi\)/)).toBeInTheDocument();
    expect(screen.getByTestId("widget-variant-circle")).toBeInTheDocument();
    expect(screen.getByTestId("widget-variant-oval")).toBeInTheDocument();
    expect(screen.getByTestId("widget-variant-rectangle")).toBeInTheDocument();
    expect(screen.getByTestId("widget-variant-rounded-rect")).toBeInTheDocument();

    // 2. NO duplicate "Bentuk Bingkai" dropdown under Konten & Properti
    expect(screen.queryByRole("combobox", { name: "Bentuk Bingkai" })).not.toBeInTheDocument();

    // 3. NO fake "Sumber data: Nilai statis" under styling properties
    expect(screen.queryByLabelText("Sumber data")).not.toBeInTheDocument();

    // 4. Background Opacity Field is present with slider and percentage
    expect(screen.getByTestId("insp-widget-fillOpacity-widget_ornament_1-wrapper")).toBeInTheDocument();
    expect(screen.getByLabelText("Transparansi Background")).toHaveValue(100);

    // 5. Line thickness & double border
    expect(screen.getByLabelText("Ketebalan Garis (px)")).toHaveValue(2);
    expect(screen.getByRole("checkbox", { name: "Garis Ganda (Double Border)" })).toBeChecked();
    expect(screen.getByLabelText("Jarak Garis Dalam (px)")).toHaveValue(12);

    // 6. Animation Mode is rendered with "once" selected
    const animModeSelect = screen.getByLabelText("Mode Animasi Garis") as HTMLSelectElement;
    expect(animModeSelect.value).toBe("once");
    expect(screen.getByLabelText("Kecepatan Animasi")).toBeInTheDocument();

    // 7. No photo yet => Transparansi Foto is hidden
    expect(screen.queryByLabelText("Transparansi Foto")).not.toBeInTheDocument();

    // 8. Add a photo => Transparansi Foto appears
    fireEvent.click(screen.getByText(/\+ Masukkan link URL gambar/i));
    const urlInput = screen.getByPlaceholderText("https://example.com/foto.jpg");
    fireEvent.change(urlInput, { target: { value: "https://example.com/photo.jpg" } });
    fireEvent.click(screen.getByText("Pasang"));

    // Check that store is updated with image
    const updated = store.getState().history.present.sections[0]!.elements[0]! as WidgetElement;
    expect(updated.props.image).toBe("https://example.com/photo.jpg");
  });
});
