import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GiftAccountsControl } from "@/features/editor/components/GiftAccountsControl";
import { getWidgetStyleVariants } from "@/features/widgets";

afterEach(cleanup);

describe("GiftAccountsControl", () => {
  it("renders empty state and allows loading sample accounts", () => {
    const onChange = vi.fn();
    render(<GiftAccountsControl value={[]} disabled={false} onChange={onChange} />);

    expect(screen.getByText("Belum ada rekening")).toBeInTheDocument();
    const sampleBtn = screen.getByText("Gunakan Contoh Rekening");
    fireEvent.click(sampleBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ bank: "BCA", accountNumber: "1234567890" }),
      ]),
    );
  });

  it("adds a new bank account with preset chips", () => {
    const onChange = vi.fn();
    render(<GiftAccountsControl value={[]} disabled={false} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("gift-add-button"));
    expect(screen.getByTestId("gift-account-form")).toBeInTheDocument();

    const mandiriPreset = screen.getByRole("button", { name: "Mandiri" });
    fireEvent.click(mandiriPreset);

    const numberInput = screen.getByPlaceholderText("Contoh: 1234 5678 90");
    fireEvent.change(numberInput, { target: { value: "9876543210" } });

    const nameInput = screen.getByPlaceholderText("Contoh: Nama Pemilik");
    fireEvent.change(nameInput, { target: { value: "Budi Santoso" } });

    fireEvent.click(screen.getByTestId("gift-save-account-btn"));

    expect(onChange).toHaveBeenCalledWith([
      { bank: "Mandiri", accountNumber: "9876543210", accountName: "Budi Santoso" },
    ]);
  });

  it("edits, reorders, and deletes existing accounts", () => {
    const initial = [
      { bank: "BCA", accountNumber: "111111", accountName: "User 1" },
      { bank: "BRI", accountNumber: "222222", accountName: "User 2" },
    ];
    const onChange = vi.fn();
    render(<GiftAccountsControl value={initial} disabled={false} onChange={onChange} />);

    const items = screen.getAllByTestId("gift-editor-item");
    expect(items).toHaveLength(2);

    // Reorder: Move down account 1
    const moveDownBtn = screen.getByRole("button", { name: "Turunkan rekening 1" });
    fireEvent.click(moveDownBtn);
    expect(onChange).toHaveBeenCalledWith([initial[1], initial[0]]);

    // Delete account 2
    const deleteBtn = screen.getByRole("button", { name: "Hapus rekening 2" });
    fireEvent.click(deleteBtn);
    expect(onChange).toHaveBeenCalledWith([initial[0]]);
  });

  it("verifies 10 gift variants registered in style variants registry", () => {
    const variants = getWidgetStyleVariants("gift");
    expect(variants).toHaveLength(10);
    const ids = variants.map((v) => v.id);
    expect(ids).toContain("bank-card");
    expect(ids).toContain("stacked-slips");
    expect(ids).toContain("wallet-panel");
    expect(ids).toContain("compact-list");
    expect(ids).toContain("heritage-frame");
    expect(ids).toContain("minimalist-clean");
    expect(ids).toContain("envelope-tuck");
    expect(ids).toContain("glass-card");
    expect(ids).toContain("gold-ornament");
    expect(ids).toContain("qr-showcase");
  });
});
