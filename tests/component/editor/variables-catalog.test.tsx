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

  it("renders specialized guest.name card with live preview simulation and quick chips", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("inspector-tab-variables"));

    // Guest card should be rendered
    const guestCard = screen.getByTestId("guest-name-variable-card");
    expect(guestCard).toBeDefined();
    expect(screen.getByText("Nama Penerima Tamu Undangan")).toBeDefined();
    expect(screen.getByText("guest.name")).toBeDefined();
    expect(screen.getByText("Integrasi Otomatis dengan Portal Klien")).toBeDefined();

    // Simulation input
    const simInput = screen.getByTestId("guest-preview-sim-input") as HTMLInputElement;
    expect(simInput).toBeDefined();

    // Typing simulation name
    fireEvent.change(simInput, { target: { value: "Bpk. Rahmat & Keluarga" } });
    expect(simInput.value).toBe("Bpk. Rahmat & Keluarga");

    // Click quick chip
    const chip = screen.getByTestId("quick-chip-Budi Santoso");
    fireEvent.click(chip);
    expect(simInput.value).toBe("Budi Santoso");

    // Reset button
    const resetBtn = screen.getByTestId("reset-guest-sim-btn");
    fireEvent.click(resetBtn);
    expect(simInput.value).toBe("");
  });

  it("allows inserting a new guest text element when not yet used", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("inspector-tab-variables"));

    // Since guest.name is not used yet, insert button is available
    const insertBtn = screen.getByTestId("insert-guest-element-btn");
    expect(insertBtn).toBeDefined();
    fireEvent.click(insertBtn);

    // Verify a new text element bound to guest.name is created in store
    const present = store.getState().history.present;
    const allElements = present.sections.flatMap((s) => s.elements);
    const guestEl = allElements.find(
      (el) =>
        el.type === "text" &&
        el.content.segments.some((s) => "bind" in s && s.bind === "guest.name"),
    );
    expect(guestEl).toBeDefined();
    expect(guestEl?.name).toBe("Nama Tamu Undangan");
  });

  it("allows connecting guest.name to currently selected text element", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });
    // Pre-select the existing text element
    store.getState().selectElements(["el_text_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    fireEvent.click(screen.getByTestId("inspector-tab-variables"));

    const connectBtn = screen.getByTestId("connect-guest-selected-btn");
    expect(connectBtn).toBeDefined();
    fireEvent.click(connectBtn);

    const updatedEl = store
      .getState()
      .history.present.sections[0]?.elements.find((e) => e.id === "el_text_1");
    expect(
      updatedEl?.type === "text" &&
        updatedEl.content.segments.some((s) => "bind" in s && s.bind === "guest.name"),
    ).toBe(true);
  });

  it("allows 1-click binding of regular text element to guest.name directly in Inspector text panel", () => {
    const doc = createTestDoc();
    const store = createEditorStore({ document: doc, revision: 1 });
    // Plain unbound text element
    store.getState().patchElement("el_text_1", (el) => {
      if (el.type !== "text") return el;
      return {
        ...el,
        content: { segments: [{ text: "Kepada Yth. Bapak/Ibu" }] },
      };
    });
    store.getState().selectElements(["el_text_1"]);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_test">
        <Inspector />
      </EditorProvider>,
    );

    // Inspector is in Properties tab; expand "Teks & tipografi" section
    const textSectionHeader = screen.getByText("Teks & tipografi");
    fireEvent.click(textSectionHeader);

    // Plain text now reveals the 1-click button
    const quickGuestBtn = screen.getByTestId("bind-guest-quick-btn-0");
    expect(quickGuestBtn).toBeDefined();

    // Click 1-click button
    fireEvent.click(quickGuestBtn);

    // Verify it is bound to guest.name with fallback preserved
    const updatedEl = store
      .getState()
      .history.present.sections[0]?.elements.find((e) => e.id === "el_text_1");
    expect(
      updatedEl?.type === "text" &&
        updatedEl.content.segments.some(
          (s) => "bind" in s && s.bind === "guest.name" && s.fallback === "Kepada Yth. Bapak/Ibu",
        ),
    ).toBe(true);

    // Verify guestBoundCard is shown
    const boundCard = screen.getByTestId("guest-bound-card-0");
    expect(boundCard).toBeDefined();
    expect(screen.getByText("Terhubung ke Nama Tamu Undangan")).toBeDefined();

    // Test unbind button returns it to regular text
    const unbindBtn = screen.getByTestId("unbind-guest-btn-0");
    fireEvent.click(unbindBtn);

    const revertedEl = store
      .getState()
      .history.present.sections[0]?.elements.find((e) => e.id === "el_text_1");
    expect(
      revertedEl?.type === "text" &&
        revertedEl.content.segments.every((s) => "text" in s),
    ).toBe(true);
  });
});

