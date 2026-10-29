import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BanksManager } from "@/app/(dashboard)/dashboard/admin/banks/banks-manager";
import type { MasterBankItem } from "@/features/banks";

const mockBanks: MasterBankItem[] = [
  {
    id: "bank-1",
    name: "BCA",
    code: "bca",
    category: "bank",
    logoUrl: "/images/banks/bca.svg",
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "bank-2",
    name: "Mandiri",
    code: "mandiri",
    category: "bank",
    logoUrl: "/images/banks/mandiri.svg",
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock server actions
vi.mock("@/app/(dashboard)/dashboard/admin/banks/actions", () => ({
  createMasterBankAction: vi.fn(async () => ({ ok: true, message: "Bank berhasil ditambahkan." })),
  updateMasterBankAction: vi.fn(async () => ({ ok: true, message: "Bank berhasil diperbarui." })),
  toggleMasterBankAction: vi.fn(async () => ({ ok: true, message: "Status berhasil diubah." })),
  deleteMasterBankAction: vi.fn(async () => ({ ok: true, message: "Bank berhasil dihapus." })),
  resetMasterBanksAction: vi.fn(async () => ({ ok: true, message: "Reset berhasil." })),
  uploadBankLogoAction: vi.fn(async (formData: FormData) => {
    const file = formData.get("file") as File;
    if (!file || file.size === 0) return { ok: false, error: "File logo kosong." };
    if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Ukuran file logo maksimal 2MB." };
    return {
      ok: true,
      url: `/images/banks/uploads/custom-${file.name}`,
      filename: `custom-${file.name}`,
    };
  }),
}));

describe("BanksManager Logo Upload System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Add Modal with file upload dropzone, thumbnail preview, and presets", () => {
    render(<BanksManager initialBanks={mockBanks} />);

    // Click Add Bank button
    const addBtn = screen.getByText("+ Tambah Bank / Logo Baru");
    fireEvent.click(addBtn);

    // Modal is open
    expect(screen.getByText("Tambah Bank / E-Wallet Baru")).toBeInTheDocument();

    // Dropzone upload UI is present
    expect(screen.getByText("Unggah File Logo Baru")).toBeInTheDocument();
    expect(
      screen.getByText(/Klik untuk memilih file atau seret ke sini/i),
    ).toBeInTheDocument();

    // Preset buttons are present
    expect(screen.getByText("Atau Pilih Cepat dari Koleksi Preset Sistem:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BCA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mandiri" })).toBeInTheDocument();
  });

  it("switches logo URL when preset button is clicked", () => {
    render(<BanksManager initialBanks={mockBanks} />);

    fireEvent.click(screen.getByText("+ Tambah Bank / Logo Baru"));

    // Default logo is generic
    const previewImg = screen.getByAltText("Preview logo") as HTMLImageElement;
    expect(previewImg.src).toContain("/images/banks/generic.svg");

    // Click BNI preset
    const bniBtn = screen.getByRole("button", { name: "BNI" });
    fireEvent.click(bniBtn);

    expect(previewImg.src).toContain("/images/banks/bni.svg");
  });

  it("toggles manual URL input field when 'Gunakan URL Eksternal / CDN' is clicked", () => {
    render(<BanksManager initialBanks={mockBanks} />);

    fireEvent.click(screen.getByText("+ Tambah Bank / Logo Baru"));

    // Manual input is initially hidden
    expect(
      screen.queryByPlaceholderText("/images/banks/bca.svg atau https://..."),
    ).not.toBeInTheDocument();

    // Click toggle button
    const toggleBtn = screen.getByText("Gunakan URL Eksternal / CDN");
    fireEvent.click(toggleBtn);

    // Manual input appears
    const input = screen.getByPlaceholderText("/images/banks/bca.svg atau https://...");
    expect(input).toBeInTheDocument();

    // Type a custom URL
    fireEvent.change(input, { target: { value: "https://example.com/custom-logo.svg" } });
    const previewImg = screen.getByAltText("Preview logo") as HTMLImageElement;
    expect(previewImg.src).toContain("https://example.com/custom-logo.svg");

    // Click to close
    fireEvent.click(screen.getByText("Tutup Input URL Manual"));
    expect(
      screen.queryByPlaceholderText("/images/banks/bca.svg atau https://..."),
    ).not.toBeInTheDocument();
  });

  it("uploads image file and updates the preview logo URL automatically", async () => {
    render(<BanksManager initialBanks={mockBanks} />);

    fireEvent.click(screen.getByText("+ Tambah Bank / Logo Baru"));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Simulate file selection
    const mockFile = new File(["<svg></svg>"], "bank-syariah.svg", { type: "image/svg+xml" });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      const previewImg = screen.getByAltText("Preview logo") as HTMLImageElement;
      expect(previewImg.src).toContain("/images/banks/uploads/custom-bank-syariah.svg");
    });
  });

  it("shows error message when file exceeds 2MB limit", async () => {
    render(<BanksManager initialBanks={mockBanks} />);

    fireEvent.click(screen.getByText("+ Tambah Bank / Logo Baru"));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // File > 2MB
    const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], "heavy.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText("Ukuran file logo maksimal 2MB.")).toBeInTheDocument();
    });
  });

  it("opens edit modal with existing bank logo and allows replacing it via upload", async () => {
    render(<BanksManager initialBanks={mockBanks} />);

    // Click Edit on BCA
    const editBtns = screen.getAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]!);

    expect(screen.getByText("Edit Bank / E-Wallet: BCA")).toBeInTheDocument();
    const previewImg = screen.getByAltText("Preview logo") as HTMLImageElement;
    expect(previewImg.src).toContain("/images/banks/bca.svg");

    // Replace with new file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const newLogoFile = new File(["fake-png"], "new-bca.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [newLogoFile] } });

    await waitFor(() => {
      expect(previewImg.src).toContain("/images/banks/uploads/custom-new-bca.png");
    });
  });
});
