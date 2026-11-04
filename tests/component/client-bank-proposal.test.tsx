import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientBankProposalCallout } from "@/features/invitations/components/ClientBankProposalCallout";
import { BankSelectField } from "@/features/invitations/components/BankSelectField";
import type { BankVerificationMeta } from "@/lib/engine";

describe("ClientBankProposalCallout", () => {
  const sampleMeta: BankVerificationMeta = {
    status: "pending_review",
    proposedPrimary: {
      bank: "DANA",
      accountNumber: "081234567890",
      accountName: "Siska Amelia",
      bankLogo: "/images/banks/dana.svg",
    },
    verifiedPrimary: {
      bank: "BCA",
      accountNumber: "123456789",
      accountName: "Siska & Partner",
      bankLogo: "/images/banks/bca.svg",
    },
    proposedAt: "2026-11-04T10:00:00.000Z",
    clientNote: "Mohon ganti ke DANA karena rekening BCA pasif",
  };

  it("does not render if there is no pending proposal", () => {
    const { container } = render(
      <ClientBankProposalCallout
        invitationId="inv-123"
        bankVerification={{ status: "verified" }}
        approveAction={vi.fn()}
        rejectAction={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders pending client proposal callout with old and proposed accounts", () => {
    render(
      <ClientBankProposalCallout
        invitationId="inv-123"
        bankVerification={sampleMeta}
        approveAction={vi.fn()}
        rejectAction={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Klien Mengajukan Perubahan Nomor Rekening (Client Portal)"),
    ).toBeInTheDocument();
    expect(screen.getByText("BCA")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
    expect(screen.getByText("DANA")).toBeInTheDocument();
    expect(screen.getByText("081234567890")).toBeInTheDocument();
    expect(screen.getByText("a/n Siska Amelia")).toBeInTheDocument();
    expect(screen.getByText(/Mohon ganti ke DANA karena rekening BCA pasif/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Setujui Rekening/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tolak Usulan/i })).toBeInTheDocument();
  });

  it("invokes approveAction when Approve button is clicked", async () => {
    const approveAction = vi.fn().mockResolvedValue({ ok: true, message: "Rekening disetujui!" });
    const rejectAction = vi.fn();

    render(
      <ClientBankProposalCallout
        invitationId="inv-123"
        bankVerification={sampleMeta}
        approveAction={approveAction}
        rejectAction={rejectAction}
      />,
    );

    const approveBtn = screen.getByRole("button", { name: /Setujui Rekening/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(approveAction).toHaveBeenCalledWith(
        "inv-123",
        expect.stringContaining("Disetujui langsung oleh Admin"),
      );
    });
  });

  it("invokes rejectAction when Reject button is clicked and confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const approveAction = vi.fn();
    const rejectAction = vi.fn().mockResolvedValue({ ok: true, message: "Usulan ditolak." });

    render(
      <ClientBankProposalCallout
        invitationId="inv-123"
        bankVerification={sampleMeta}
        approveAction={approveAction}
        rejectAction={rejectAction}
      />,
    );

    const rejectBtn = screen.getByRole("button", { name: /Tolak Usulan/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(rejectAction).toHaveBeenCalledWith("inv-123", expect.stringContaining("Ditolak"));
    });
  });
});

describe("BankSelectField interaction", () => {
  it("allows selecting DANA and updates hidden input smoothly", () => {
    render(
      <BankSelectField
        id="test-bank"
        bankKey="gift.bank"
        logoKey="gift.bankLogo"
        namePrefix="v."
        initialBank="BCA"
        initialLogo="/images/banks/bca.svg"
      />,
    );

    const select = screen.getByTestId("test-bank-select") as HTMLSelectElement;
    expect(select.value).toBe("bca");

    const hiddenBank = screen.getByTestId("test-bank-hidden-bank") as HTMLInputElement;
    expect(hiddenBank.value).toBe("BCA");

    // Select DANA
    fireEvent.change(select, { target: { value: "dana" } });
    expect(select.value).toBe("dana");
    expect(hiddenBank.value).toBe("DANA");
  });
});
