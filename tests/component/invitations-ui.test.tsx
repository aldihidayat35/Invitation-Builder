/**
 * PRD refs: FR-INV-002 (Data Mode form), FR-INV-001 (slug), P-02.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { buildFormFields, groupFormFields } from "@/lib/engine";
import { slugifyTitle } from "@/features/invitations/schemas";
import { DataModeForm } from "@/features/invitations/components/DataModeForm";
import { VariableFields } from "@/features/invitations/components/VariableFields";
import { canonicalDocumentSchema } from "@/lib/schema";
import { fullDocument } from "../helpers/documents";

describe("slugifyTitle", () => {
  it("produces lowercase ascii url slugs", () => {
    expect(slugifyTitle("Pernikahan Anin & Raka")).toBe("pernikahan-anin-raka");
    expect(slugifyTitle("  Résepsi — Çiçek  ")).toBe("resepsi-cicek");
    expect(slugifyTitle("!!!")).toBe("undangan");
    expect(slugifyTitle("a".repeat(100)).length).toBeLessThanOrEqual(48);
  });
});

const groups = groupFormFields(
  buildFormFields(canonicalDocumentSchema.parse(fullDocument()).variables),
);

describe("VariableFields image picker", () => {
  it("renders a select of ready assets for image variables when options are given", () => {
    render(
      <VariableFields
        groups={groups}
        values={{}}
        imageOptions={[{ id: "11111111-1111-4111-8111-111111111111", label: "cover.png" }]}
      />,
    );
    const select = screen.getByLabelText("Foto cover");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "cover.png" })).toBeInTheDocument();
  });
});

describe("DataModeForm autosave (FR-INV-002)", () => {
  it("debounces edits and saves the typed values through the action", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, errors: {} });
    render(
      <DataModeForm
        invitationId="inv-1"
        groups={groups}
        values={{}}
        initialErrors={{}}
        save={save}
      />,
    );

    const field = screen.getByLabelText(/Nama lengkap mempelai wanita/);
    fireEvent.input(field, { target: { value: "Anindya" } });
    fireEvent.input(field, { target: { value: "Anindya Putri" } });
    expect(screen.getByRole("status")).toHaveTextContent("Menunggu");

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(save).toHaveBeenCalledWith(
      "inv-1",
      expect.objectContaining({ "couple.bride.fullName": "Anindya Putri" }),
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tersimpan"));
  });

  it("shows server validation messages next to the field without blocking", async () => {
    const save = vi.fn().mockResolvedValue({
      ok: true,
      errors: { "venue.name": '"Nama lokasi" wajib diisi' },
    });
    render(
      <DataModeForm
        invitationId="inv-1"
        groups={groups}
        values={{}}
        initialErrors={{}}
        save={save}
      />,
    );
    fireEvent.submit(screen.getByRole("form", { name: "Data undangan" }));
    expect(await screen.findByText('"Nama lokasi" wajib diisi')).toBeInTheDocument();
  });

  it("is read-only for users who cannot write", () => {
    render(
      <DataModeForm
        invitationId="inv-1"
        groups={groups}
        values={{}}
        initialErrors={{}}
        save={vi.fn()}
        readOnly
      />,
    );
    expect(screen.getByLabelText(/Nama lengkap mempelai wanita/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Simpan sekarang" })).toBeNull();
  });
});
