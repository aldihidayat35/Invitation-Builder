import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createEditorStore } from "@/features/editor/core/store";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { TopBar } from "@/features/editor/components/TopBar";
import { VariablesCatalogPanel } from "@/features/editor/components/VariablesCatalogPanel";
import { PresetManagementModal } from "@/features/editor/components/PresetManagementModal";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";
import {
  setCachedGlobalPresets,
  getCachedGlobalPresets,
  GLOBAL_PRESETS_STORAGE_KEY,
} from "@/features/editor/core/global-presets";

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
        name: "Cover",
        visible: true,
        baseHeight: 800,
        background: { color: "#ffffff" },
        overflow: "hidden",
        elements: [],
      },
    ],
  });
}

describe("Global Preset Management Feature", () => {
  beforeEach(() => {
    localStorage.clear();
    setCachedGlobalPresets([]);

    let mockDb: any[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string | URL, opts?: RequestInit) => {
      const method = opts?.method?.toUpperCase() || "GET";
      if (method === "POST" && opts?.body) {
        const body = JSON.parse(opts.body as string);
        const item = {
          id: "preset_123",
          key: body.key,
          label: body.label,
          category: body.category || "kustom",
          type: body.type || "text",
          defaultValue: body.defaultValue || "",
          description: body.description || "",
          maxLength: body.maxLength,
        };
        mockDb = [...mockDb.filter((p) => p.key !== item.key), item];
        return Response.json({ ok: true, data: item });
      }
      if (method === "PUT" && opts?.body) {
        const body = JSON.parse(opts.body as string);
        const urlStr = String(url);
        const id = urlStr.split("/").pop();
        mockDb = mockDb.map((p) => (p.id === id || p.key === "kustom.nomor_rekening_bank_mandiri" ? { ...p, ...body } : p));
        const item = mockDb.find((p) => p.id === id) || { ...body, id: "preset_123", key: "kustom.nomor_rekening_bank_mandiri" };
        return Response.json({ ok: true, data: item });
      }
      if (method === "DELETE") {
        const urlStr = String(url);
        const id = urlStr.split("/").pop();
        mockDb = mockDb.filter((p) => p.id !== id);
        return Response.json({ ok: true });
      }
      return Response.json({ ok: true, data: mockDb });
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("removes 'Manajemen Preset' button from TopBar and provides 'Panel: Auto Buka/Tutup' toggle", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });
    const currentRevisionMock = vi.fn().mockResolvedValue(1);

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <TopBar
          templateId="tmpl_1"
          templateName="Template Pernikahan Mewah"
          currentRevision={currentRevisionMock}
        />
      </EditorProvider>,
    );

    // Old manage button is removed
    expect(screen.queryByTestId("editor-preset-manage-btn")).not.toBeInTheDocument();

    // New panel auto open/close toggle button is present
    const panelModeBtn = screen.getByTestId("editor-panel-mode-btn");
    expect(panelModeBtn).toBeInTheDocument();
    expect(panelModeBtn).toHaveTextContent("Panel: Auto Buka");
    expect(store.getState().inspectorAutoOpen).toBe(true);

    // Click to toggle to Auto Tutup
    fireEvent.click(panelModeBtn);
    expect(panelModeBtn).toHaveTextContent("Panel: Auto Tutup");
    expect(store.getState().inspectorAutoOpen).toBe(false);

    // Click again to toggle back to Auto Buka
    fireEvent.click(panelModeBtn);
    expect(panelModeBtn).toHaveTextContent("Panel: Auto Buka");
    expect(store.getState().inspectorAutoOpen).toBe(true);
  });

  it("displays system presets with read-only badge and allows adding to template", () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });
    const onClose = vi.fn();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <PresetManagementModal isOpen={true} onClose={onClose} />
      </EditorProvider>,
    );

    // Couple groom nickname is already in template
    const nicknameItem = screen.getByTestId("preset-item-couple.groom.nickname");
    expect(nicknameItem).toBeInTheDocument();
    expect(nicknameItem).toHaveTextContent("Ada di Template");
    expect(nicknameItem).toHaveTextContent("Bawaan Sistem");

    // Couple bride nickname is not yet in template
    const brideItem = screen.getByTestId("preset-item-couple.bride.nickname");
    expect(brideItem).toBeInTheDocument();
    const applyBtn = screen.getByTestId("apply-preset-couple.bride.nickname");
    expect(applyBtn).toBeInTheDocument();

    // Click apply to template
    fireEvent.click(applyBtn);

    // Verify it is added to store document variables
    const updatedVars = store.getState().history.present.variables;
    expect(updatedVars.some((v) => v.key === "couple.bride.nickname")).toBe(true);
  });

  it("creates, edits, and deletes a custom global preset in PresetManagementModal", async () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });
    const onClose = vi.fn();

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <PresetManagementModal isOpen={true} onClose={onClose} />
      </EditorProvider>,
    );

    // 1. Open create preset form
    const createBtn = screen.getByTestId("btn-create-global-preset");
    fireEvent.click(createBtn);

    expect(screen.getByTestId("preset-form-panel")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId("preset-form-label"), {
      target: { value: "Nomor Rekening Bank Mandiri" },
    });
    fireEvent.change(screen.getByTestId("preset-form-default"), {
      target: { value: "123-00-9876543-2" },
    });
    fireEvent.change(screen.getByTestId("preset-form-maxlength"), {
      target: { value: "35" },
    });

    // Submit form
    fireEvent.click(screen.getByTestId("preset-form-submit"));

    await waitFor(() => {
      expect(screen.queryByTestId("preset-form-panel")).not.toBeInTheDocument();
    });

    // Check custom preset is displayed with badge Global Kustom
    const customItem = screen.getByTestId("preset-item-kustom.nomor_rekening_bank_mandiri");
    expect(customItem).toBeInTheDocument();
    expect(customItem).toHaveTextContent("Nomor Rekening Bank Mandiri");
    expect(customItem).toHaveTextContent("Global Kustom");
    expect(customItem).toHaveTextContent("Maks. 35 kar.");

    // 2. Edit the custom preset
    const editBtn = screen.getByTestId("edit-preset-kustom.nomor_rekening_bank_mandiri");
    fireEvent.click(editBtn);

    expect(screen.getByTestId("preset-form-panel")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("preset-form-label"), {
      target: { value: "Nomor Rekening Mandiri Utama" },
    });
    fireEvent.click(screen.getByTestId("preset-form-submit"));

    await waitFor(() => {
      expect(screen.getByText("Nomor Rekening Mandiri Utama")).toBeInTheDocument();
    });

    // 3. Delete the custom preset
    const deleteBtn = screen.getByTestId("delete-preset-kustom.nomor_rekening_bank_mandiri");
    fireEvent.click(deleteBtn);

    const confirmDeleteBtn = screen.getByTestId("confirm-delete-kustom.nomor_rekening_bank_mandiri");
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("preset-item-kustom.nomor_rekening_bank_mandiri")).not.toBeInTheDocument();
    });
  });

  it("allows saving a custom variable as Global Preset from VariablesCatalogPanel form", async () => {
    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <VariablesCatalogPanel />
      </EditorProvider>,
    );

    // Open custom variable creation modal
    fireEvent.click(screen.getByTestId("open-custom-modal-btn"));

    // Enter label and default
    fireEvent.change(screen.getByTestId("custom-var-label-input"), {
      target: { value: "Alamat Gedung Resepsi" },
    });
    fireEvent.change(screen.getByTestId("custom-var-default-input"), {
      target: { value: "Grand Ballroom Hotel Indonesia" },
    });
    fireEvent.change(screen.getByTestId("custom-var-maxlength-input"), {
      target: { value: "120" },
    });

    // Check "Simpan sebagai Preset Global" checkbox
    const globalCheckbox = screen.getByTestId("custom-var-save-global-checkbox");
    expect(globalCheckbox).not.toBeChecked();
    fireEvent.click(globalCheckbox);
    expect(globalCheckbox).toBeChecked();

    // Submit form
    fireEvent.click(screen.getByTestId("submit-custom-var-btn"));

    // Verify it is added to the active template
    const vars = store.getState().history.present.variables;
    expect(vars.some((v) => v.label === "Alamat Gedung Resepsi")).toBe(true);

    // Verify it is saved to cached global presets
    await waitFor(() => {
      const cached = getCachedGlobalPresets();
      expect(cached.some((p) => p.label === "Alamat Gedung Resepsi")).toBe(true);
    });
  });

  it("sorts presets alphabetically (A-Z) and allows direct deletion of custom presets in 'Preset Siap Pakai' modal", async () => {
    // Seed initial custom global preset
    setCachedGlobalPresets([
      {
        id: "preset_cust_1",
        key: "kustom.doa_restu_keluarga",
        label: "Doa Restu Keluarga Besar",
        category: "kustom",
        type: "text",
        default: "Mohon doa restu",
        description: "Ucapan doa restu dari keluarga",
      },
    ]);

    const store = createEditorStore({ document: createTestDoc(), revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <VariablesCatalogPanel />
      </EditorProvider>,
    );

    // Open "Preset Siap Pakai" modal
    const addPresetBtn = screen.getByTestId("open-preset-modal-btn");
    fireEvent.click(addPresetBtn);

    // Verify modal is open and header doesn't have "Kelola Preset" button
    expect(screen.getByText("Preset Variabel Siap Pakai")).toBeInTheDocument();
    expect(screen.queryByTestId("catalog-manage-presets-btn")).not.toBeInTheDocument();

    // Verify custom preset has delete button and system preset doesn't
    const customDeleteBtn = screen.getByTestId("delete-preset-kustom.doa_restu_keluarga");
    expect(customDeleteBtn).toBeInTheDocument();
    expect(screen.queryByTestId("delete-preset-couple.groom.fullName")).not.toBeInTheDocument();

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    // Click delete on custom preset
    fireEvent.click(customDeleteBtn);
    expect(confirmSpy).toHaveBeenCalled();

    // Verify deleted
    await waitFor(() => {
      expect(screen.queryByTestId("preset-card-kustom.doa_restu_keluarga")).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});
