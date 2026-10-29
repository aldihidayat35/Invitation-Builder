import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GiftWidget, parseGiftAccounts } from "@/features/widgets/runtime/GiftWidget";

describe("Unified Gift & Rekening Widget (Standard Layout)", () => {
  it("enforces maximum 2 accounts even if more are supplied", () => {
    const rawAccounts = [
      { bank: "BNI", accountNumber: "2020127190", accountName: "Muhammad Ridhwan" },
      { bank: "BCA", accountNumber: "9876543210", accountName: "Siti Aminah" },
      { bank: "Mandiri", accountNumber: "1112223334", accountName: "Tambahan Ketiga" },
      { bank: "BRI", accountNumber: "5556667778", accountName: "Tambahan Keempat" },
    ];

    const parsed = parseGiftAccounts(rawAccounts);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.bank).toBe("BNI");
    expect(parsed[1]?.bank).toBe("BCA");
  });

  it("prioritizes auto-binding primary and secondary accounts", () => {
    const parsed = parseGiftAccounts([], {
      bank: "BCA",
      accountNumber: "1234567890",
      accountName: "Mempelai Pria",
      bank2: "BNI",
      accountNumber2: "2020127190",
      accountName2: "Mempelai Wanita",
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.accountNumber).toBe("1234567890");
    expect(parsed[0]?.accountName).toBe("Mempelai Pria");
    expect(parsed[1]?.accountNumber).toBe("2020127190");
    expect(parsed[1]?.accountName).toBe("Mempelai Wanita");
  });

  it("renders centered layout with logo, name, number, and copy button for 1 account", () => {
    render(
      <GiftWidget
        bank="BNI"
        accountNumber="2020127190"
        accountName="Muhammad Ridhwan"
        bankLogo="https://example.com/bni.png"
      />,
    );

    // Bank logo image
    const logo = screen.getByRole("img", { name: "BNI" });
    expect(logo).toHaveAttribute("src", "https://example.com/bni.png");

    // Account holder name
    expect(screen.getByText("Muhammad Ridhwan")).toBeInTheDocument();

    // Account number
    const number = screen.getByTestId("gift-number");
    expect(number).toHaveTextContent("2020127190");

    // Copy button
    const copyBtn = screen.getByRole("button", { name: /Salin nomor BNI 2020127190/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it("renders 2 accounts stacked vertically with independent copy actions", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(
      <GiftWidget
        bank="BNI"
        accountNumber="2020127190"
        accountName="Muhammad Ridhwan"
        bank2="BCA"
        accountNumber2="8888999900"
        accountName2="Siti Aminah"
      />,
    );

    const numbers = screen.getAllByTestId("gift-number");
    expect(numbers).toHaveLength(2);
    expect(numbers[0]).toHaveTextContent("2020127190");
    expect(numbers[1]).toHaveTextContent("8888999900");

    const copyBtns = screen.getAllByRole("button", { name: /Salin nomor/i });
    expect(copyBtns).toHaveLength(2);

    // Click second copy button
    fireEvent.click(copyBtns[1]!);
    await waitFor(() => expect(screen.getByTestId("gift-feedback")).toHaveTextContent("tersalin"));
    expect(writeText).toHaveBeenCalledWith("8888999900");
  });
});

