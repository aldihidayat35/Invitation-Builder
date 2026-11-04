import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankSelectField, findMatchingMasterBank } from "@/features/invitations/components/BankSelectField";
import { DataModeForm } from "@/features/invitations/components/DataModeForm";
import { VariableFields } from "@/features/invitations/components/VariableFields";
import { DEFAULT_MASTER_BANKS } from "@/lib/db/repositories/master-banks";
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

  it("allows toggling custom logo controls and updating custom logo URL", () => {
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

    // Toggle button should be present
    const toggleBtn = screen.getByRole("button", { name: /kustomisasi \/ upload logo bank/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    // Custom logo URL input should be displayed
    const urlInput = screen.getByPlaceholderText(/https:\/\/... atau \/images\/banks\//i) as HTMLInputElement;
    expect(urlInput).toBeInTheDocument();

    // Type a custom logo URL
    fireEvent.change(urlInput, { target: { value: "https://example.com/custom-logo.png" } });

    const hiddenLogo = screen.getByTestId("var-gift-bank-hidden-logo") as HTMLInputElement;
    expect(hiddenLogo.value).toBe("https://example.com/custom-logo.png");

    const logoImg = screen.getByRole("img", { name: "BCA" });
    expect(logoImg).toHaveAttribute("src", "https://example.com/custom-logo.png");
  });

  it("allows changing bank from BCA to DANA inside DataModeForm without resetting", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, errors: {} });
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
      ],
    };

    render(
      <DataModeForm
        invitationId="inv-1"
        groups={[giftGroup]}
        values={{ "gift.bank": "BCA" }}
        initialErrors={{}}
        save={save}
      />,
    );

    const select = screen.getByTestId("var-gift.bank-select") as HTMLSelectElement;
    expect(select.value).toBe("bca");

    fireEvent.change(select, { target: { value: "dana" } });
    expect(select.value).toBe("dana");

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(save).toHaveBeenCalledWith(
      "inv-1",
      expect.objectContaining({ "gift.bank": "DANA", "gift.bankLogo": "/images/banks/dana.svg" }),
    );
  });

  it("does not snap back to initial bank when parent re-renders before save completes", () => {
    const { rerender } = render(
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

    // User changes combo box to DANA
    fireEvent.change(select, { target: { value: "dana" } });
    expect(select.value).toBe("dana");

    // Parent re-renders with the SAME initial props (before server revalidates)
    rerender(
      <BankSelectField
        id="var-gift-bank"
        bankKey="gift.bank"
        logoKey="gift.bankLogo"
        namePrefix="v."
        initialBank="BCA"
        initialLogo="/images/banks/bca.svg"
      />,
    );

    // Value must STILL be dana, not snap back to bca!
    expect(select.value).toBe("dana");
    const hiddenBank = screen.getByTestId("var-gift-bank-hidden-bank") as HTMLInputElement;
    expect(hiddenBank.value).toBe("DANA");
  });

  describe("findMatchingMasterBank", () => {
    const banks = DEFAULT_MASTER_BANKS;

    it("matches direct bank names and lowercase codes", () => {
      expect(findMatchingMasterBank(banks, "BCA")?.code).toBe("bca");
      expect(findMatchingMasterBank(banks, "bca")?.code).toBe("bca");
      expect(findMatchingMasterBank(banks, "dana")?.code).toBe("dana");
      expect(findMatchingMasterBank(banks, "DANA")?.code).toBe("dana");
    });

    it("matches prefixed bank names like 'Bank BCA' or 'PT Bank Central Asia'", () => {
      expect(findMatchingMasterBank(banks, "Bank BCA")?.code).toBe("bca");
      expect(findMatchingMasterBank(banks, "PT Bank Central Asia")?.code).toBe("bca");
      expect(findMatchingMasterBank(banks, "Bank Mandiri")?.code).toBe("mandiri");
      expect(findMatchingMasterBank(banks, "Bank Rakyat Indonesia")?.code).toBe("bri");
      expect(findMatchingMasterBank(banks, "Bank Jago")?.code).toBe("jago");
    });

    it("matches e-wallets and special names", () => {
      expect(findMatchingMasterBank(banks, "gopay")?.code).toBe("gopay");
      expect(findMatchingMasterBank(banks, "GoPay")?.code).toBe("gopay");
      expect(findMatchingMasterBank(banks, "SeaBank")?.code).toBe("seabank");
      expect(findMatchingMasterBank(banks, "ShopeePay")?.code).toBe("shopeepay");
      expect(findMatchingMasterBank(banks, "QRIS")?.code).toBe("qris");
    });

    it("returns undefined for non-preset custom banks", () => {
      expect(findMatchingMasterBank(banks, "Bank Sampoerna")).toBeUndefined();
      expect(findMatchingMasterBank(banks, "")).toBeUndefined();
      expect(findMatchingMasterBank(banks, null)).toBeUndefined();
    });
  });
});

