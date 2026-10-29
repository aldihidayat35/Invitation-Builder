import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BankSelectField } from "@/features/invitations/components/BankSelectField";
import { VariableFields } from "@/features/invitations/components/VariableFields";
import type { FormGroup } from "@/lib/engine";

describe("BankSelectField and VariableFields Combo Box", () => {
  it("renders bank select combo box with logo preview and hidden inputs", () => {
    render(
      <BankSelectField
        id="var-gift-bank"
        bankKey="gift.bank"
        logoKey="gift.bankLogo"
        namePrefix="v."
        initialBank="BCA"
        initialLogo="/images/banks/bca.svg"
      />,
    );

    const select = screen.getByTestId("var-gift-bank-select") as HTMLSelectElement;
    expect(select.value).toBe("bca");

    const logoImg = screen.getByRole("img", { name: "BCA" });
    expect(logoImg).toHaveAttribute("src", "/images/banks/bca.svg");

    const hiddenBank = screen.getByTestId("var-gift-bank-hidden-bank") as HTMLInputElement;
    expect(hiddenBank.value).toBe("BCA");
    expect(hiddenBank.name).toBe("v.gift.bank");

    const hiddenLogo = screen.getByTestId("var-gift-bank-hidden-logo") as HTMLInputElement;
    expect(hiddenLogo.value).toBe("/images/banks/bca.svg");
    expect(hiddenLogo.name).toBe("v.gift.bankLogo");
  });

  it("updates bank name and bank logo when another bank is selected", () => {
    render(
      <BankSelectField
        id="var-gift-bank"
        bankKey="gift.bank"
        logoKey="gift.bankLogo"
        namePrefix="v."
        initialBank="BCA"
        initialLogo="/images/banks/bca.svg"
      />,
    );

    const select = screen.getByTestId("var-gift-bank-select") as HTMLSelectElement;

    // Switch to BNI
    fireEvent.change(select, { target: { value: "bni" } });

    const hiddenBank = screen.getByTestId("var-gift-bank-hidden-bank") as HTMLInputElement;
    expect(hiddenBank.value).toBe("BNI");

    const hiddenLogo = screen.getByTestId("var-gift-bank-hidden-logo") as HTMLInputElement;
    expect(hiddenLogo.value).toBe("/images/banks/bni.svg");

    const logoImg = screen.getByRole("img", { name: "BNI" });
    expect(logoImg).toHaveAttribute("src", "/images/banks/bni.svg");
  });

  it("shows custom bank input when '__custom__' option is chosen", () => {
    render(
      <BankSelectField
        id="var-gift-bank"
        bankKey="gift.bank"
        logoKey="gift.bankLogo"
        namePrefix="v."
        initialBank=""
        initialLogo=""
      />,
    );

    const select = screen.getByTestId("var-gift-bank-select") as HTMLSelectElement;

    // Choose custom
    fireEvent.change(select, { target: { value: "__custom__" } });

    const customInput = screen.getByTestId("var-gift-bank-custom-input") as HTMLInputElement;
    expect(customInput).toBeInTheDocument();

    fireEvent.change(customInput, { target: { value: "Bank BJB" } });

    const hiddenBank = screen.getByTestId("var-gift-bank-hidden-bank") as HTMLInputElement;
    expect(hiddenBank.value).toBe("Bank BJB");
  });

  it("hides manual text input for logo in VariableFields while displaying bank combo box", () => {
    const giftGroup: FormGroup = {
      group: "gift",
      label: "Gift",
      fields: [
        {
          key: "gift.bank",
          label: "Jenis Rekening / Bank (Utama)",
          type: "text",
          control: "text",
          required: true,
          group: "gift",
          needsTimeZone: false,
        },
        {
          key: "gift.accountNumber",
          label: "Nomor Rekening (Utama)",
          type: "text",
          control: "text",
          required: true,
          group: "gift",
          needsTimeZone: false,
        },
        {
          key: "gift.accountName",
          label: "Atas Nama Rekening (Utama)",
          type: "text",
          control: "text",
          required: true,
          group: "gift",
          needsTimeZone: false,
        },
        {
          key: "gift.bankLogo",
          label: "Logo Bank / E-Wallet (Utama)",
          type: "text",
          control: "text",
          required: false,
          group: "gift",
          needsTimeZone: false,
        },
      ],
    };

    const values = {
      "gift.bank": "Mandiri",
      "gift.accountNumber": "1234567890",
      "gift.accountName": "Budi Santoso",
      "gift.bankLogo": "/images/banks/mandiri.svg",
    };

    render(
      <VariableFields
        groups={[giftGroup]}
        values={values}
        namePrefix="v."
      />,
    );

    // Bank combo box should exist
    expect(screen.getByTestId("var-gift.bank-select")).toBeInTheDocument();

    // Nomor rekening and nama should be normal inputs
    expect(screen.getByLabelText(/Nomor Rekening \(Utama\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Atas Nama Rekening \(Utama\)/i)).toBeInTheDocument();

    // Manual logo text input should NOT be rendered!
    expect(screen.queryByLabelText(/Logo Bank \/ E-Wallet \(Utama\)/i)).not.toBeInTheDocument();

    // But hidden input for logo must exist to save automatically
    const hiddenLogo = screen.getByTestId("var-gift.bank-hidden-logo") as HTMLInputElement;
    expect(hiddenLogo.value).toBe("/images/banks/mandiri.svg");
    expect(hiddenLogo.name).toBe("v.gift.bankLogo");
  });
});
