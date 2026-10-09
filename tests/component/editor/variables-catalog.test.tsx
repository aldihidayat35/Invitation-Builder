import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createEditorStore } from "@/features/editor/core/store";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { Inspector } from "@/features/editor/components/Inspector";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

function createTestDoc(): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    variables: [
      {
        key: "couple.groom.nickname",
        label: "Nama Panggilan Pria",
        type: "text",
        default: "Danang",
        required: false,
      },
    ],
    design: {
      tokens: {
        colors: { primary: "#4f46e5" },
      },
    },
    sections: [
      {
        id: "sec_1",
        name: "Section 1",
        visible: true,
        baseHeight: 800,
        background: { color: "#ffffff" },
        overflow: "hidden",
        elements: [
          {
            id: "el_text_1",
            name: "Nama Pengantin",
            type: "text",
            visible: true,
            locked: false,
            frame: { x: 20, y: 30, w: 200, h: 40, rotation: 0 },
            style: { opacity: 1, color: "#000000", fontSize: 16 },
            content: {
              segments: [
                { bind: "couple.groom.nickname", fallback: "Danang" },
              ],
            },
          },
        ],
      },
    ],
  });
}

describe("VariablesCatalogPanel & Inspector Variables Tab", () => {
  it("renders dual tabs in Inspector and switches between Properties and Variables", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    // Initial state: properties tab active
    const propTab = screen.getByTestId("inspector-tab-properties");
    const varTab = screen.getByTestId("inspector-tab-variables");
    expect(propTab).toBeDefined();
    expect(varTab).toBeDefined();

    // Click Variabel Undangan tab
    fireEvent.click(varTab);

    // Should display Katalog Variabel Undangan title
    expect(screen.getByText("Katalog Variabel Undangan")).toBeDefined();
    expect(screen.getByText("Nama Panggilan Pria")).toBeDefined();

    // Usage badge indicates it is used on canvas
    expect(screen.getByText("Dipakai (1)")).toBeDefined();

    // Click back to Properti tab
    fireEvent.click(propTab);
    expect(screen.queryByText("Katalog Variabel Undangan")).toBeNull();
  });

  it("allows adding a preset variable to the document", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    // Switch to Variables tab
    fireEvent.click(screen.getByTestId("inspector-tab-variables"));

    // Open preset modal
    fireEvent.click(screen.getByTestId("open-preset-modal-btn"));
    expect(screen.getByText("Preset Variabel Siap Pakai")).toBeDefined();

    // Add "Nama Panggilan Wanita" preset
    const addBrideBtn = screen.getByTestId("add-preset-couple.bride.nickname");
    fireEvent.click(addBrideBtn);

    // Verify it is added to store
    const vars = store.getState().history.present.variables;
    expect(vars.some((v) => v.key === "couple.bride.nickname")).toBe(true);
  });

  it("allows creating a custom variable with auto-generated key", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    // Switch to Variables tab
    fireEvent.click(screen.getByTestId("inspector-tab-variables"));

    // Open custom modal
    fireEvent.click(screen.getByTestId("open-custom-modal-btn"));
    expect(screen.getByText("Buat Variabel Kustom Baru")).toBeDefined();

    // Fill label and default value
    const labelInput = screen.getByTestId("custom-var-label-input");
    fireEvent.change(labelInput, { target: { value: "Nomor Meja Tamu" } });

    const defaultInput = screen.getByTestId("custom-var-default-input");
    fireEvent.change(defaultInput, { target: { value: "Meja VIP 01" } });

    // Submit
    fireEvent.click(screen.getByTestId("submit-custom-var-btn"));

    // Verify variable created with slugified key custom.nomorMejaTamu
    const vars = store.getState().history.present.variables;
    const created = vars.find((v) => v.key === "custom.nomorMejaTamu");
    expect(created).toBeDefined();
    expect(created?.label).toBe("Nomor Meja Tamu");
    expect("default" in created! && created?.default).toBe("Meja VIP 01");
  });

  it("filters variables by search keyword", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("inspector-tab-variables"));

    const searchInput = screen.getByTestId("search-variables-input");
    fireEvent.change(searchInput, { target: { value: "Panggilan Pria" } });
    expect(screen.getByText("Nama Panggilan Pria")).toBeDefined();

    fireEvent.change(searchInput, { target: { value: "NonExistentWord123" } });
    expect(screen.getByText("Tidak ada variabel ditemukan")).toBeDefined();
  });
});
