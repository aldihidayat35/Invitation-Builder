import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WidgetPanel } from "@/features/editor/components/WidgetPanel";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import type { CanonicalDocument, Element } from "@/lib/schema";

type WidgetElement = Extract<Element, { type: "widget" }>;

describe("Map Widget Panel UI (Auto-bound & Clean)", () => {
  it("renders clean MapPropsControl without manual coordinate controls", () => {
    const mapElement: WidgetElement = {
      id: "widget_map_1",
      type: "widget",
      name: "map",
      frame: { x: 0, y: 0, w: 326, h: 220, rotation: 0 },
      visible: true,
      locked: false,
      style: { variant: "card", color: "#3b82f6" },
      widgetType: "map",
      widgetVersion: 1,
      props: {
        latitude: { bind: "event.location.lat" },
        longitude: { bind: "event.location.lng" },
        address: { bind: "event.location.address" },
        label: { bind: "event.location.address" },
        buttonText: "Buka Google Maps",
      },
    };

    const doc: CanonicalDocument = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: { colors: {}, fonts: {}, spacing: {} },
      },
      variables: [
        {
          key: "event.location.lat",
          type: "number",
          integer: false,
          required: true,
          label: "Latitude Lokasi",
          default: -6.175392,
        },
        {
          key: "event.location.lng",
          type: "number",
          integer: false,
          required: true,
          label: "Longitude Lokasi",
          default: 106.827153,
        },
        {
          key: "event.location.address",
          type: "text",
          required: true,
          label: "Alamat Lokasi",
          default: "Gedung Pernikahan Megah, Jakarta",
        },
      ],
      sections: [
        {
          id: "sec_1",
          name: "Section 1",
          baseHeight: 844,
          background: { color: "#ffffff", fit: "cover" },
          overflow: "hidden",
          visible: true,
          elements: [mapElement],
        },
      ],
    };

    const store = createEditorStore({
      document: doc,
      revision: 1,
    });

    const onOpenVariablesTab = vi.fn();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <WidgetPanel
          element={mapElement}
          readOnly={false}
          tokens={doc.design.tokens}
          onOpenVariablesTab={onOpenVariablesTab}
        />
      </EditorProvider>,
    );

    // 1. Memastikan MapPropsControl dirender
    expect(screen.getByTestId("map-props-controls")).toBeInTheDocument();
    expect(screen.getByText("Terhubung Otomatis ke Data Acara")).toBeInTheDocument();
    expect(screen.getByText(/Gedung Pernikahan Megah, Jakarta/)).toBeInTheDocument();
    expect(screen.getByText(/-6.175392/)).toBeInTheDocument();

    // 2. Memastikan kontrol koordinat manual statis SUDAH TIDAK ADA
    expect(screen.queryByText("Sumber data")).not.toBeInTheDocument();
    expect(screen.queryByText("+ Variabel baru")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitude")).not.toBeInTheDocument();

    // 3. Memastikan teks tombol Google Maps dapat diatur
    expect(screen.getByLabelText("Teks tombol Google Maps")).toHaveValue("Buka Google Maps");

    // 4. Tombol shortcut memicu onOpenVariablesTab
    const shortcutBtn = screen.getByRole("button", { name: /Ubah Lokasi di Data Undangan/i });
    fireEvent.click(shortcutBtn);
    expect(onOpenVariablesTab).toHaveBeenCalledTimes(1);
  });
});
