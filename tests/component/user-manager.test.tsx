import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { UserManager } from "@/features/admin/users/components/UserManager";
import type { UserListItem, UsersSummary, AvailableResellerOption } from "@/features/admin/users/types";

// Mock server actions
vi.mock("@/features/admin/users/actions", () => ({
  createUserAction: vi.fn().mockResolvedValue({ ok: true }),
  updateUserAction: vi.fn().mockResolvedValue({ ok: true }),
  deleteUserAction: vi.fn().mockResolvedValue({ ok: true }),
  toggleUserStatusAction: vi.fn().mockResolvedValue({ ok: true }),
  fetchUsersListAction: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

const mockSummary: UsersSummary = {
  total: 3,
  owners: 1,
  resellers: 1,
  clients: 1,
  active: 3,
  disabled: 0,
};

const mockUsers: UserListItem[] = [
  {
    id: "usr-admin-1",
    name: "Admin Utama",
    email: "admin@kencana.id",
    systemRole: "owner",
    status: "active",
    resellerId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "usr-seller-2",
    name: "Mitra Jakarta",
    email: "seller@jakarta.id",
    systemRole: "reseller",
    status: "active",
    resellerId: null,
    agencyName: "Jakarta Wedding Agency",
    agencySlug: "jakarta-wedding",
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-02"),
  },
  {
    id: "usr-client-3",
    name: "Budi Pengantin",
    email: "budi@pengantin.id",
    systemRole: "client",
    status: "active",
    resellerId: "usr-seller-2",
    resellerAgencyName: "Jakarta Wedding Agency",
    createdAt: new Date("2026-01-03"),
    updatedAt: new Date("2026-01-03"),
  },
];

const mockResellers: AvailableResellerOption[] = [
  {
    id: "usr-seller-2",
    name: "Mitra Jakarta",
    agencyName: "Jakarta Wedding Agency",
    agencySlug: "jakarta-wedding",
  },
];

describe("UserManager Component (Super Admin)", () => {
  it("renders page title, summary cards, and user directory table", () => {
    render(
      <UserManager
        initialUsers={mockUsers}
        initialSummary={mockSummary}
        availableResellers={mockResellers}
        currentUserId="usr-admin-1"
      />
    );

    expect(screen.getByText("Manajemen Pengguna")).toBeInTheDocument();
    expect(screen.getByText("Total Pengguna")).toBeInTheDocument();
    expect(screen.getByText("Admin Utama")).toBeInTheDocument();
    expect(screen.getByText("Mitra Jakarta")).toBeInTheDocument();
    expect(screen.getByText("Budi Pengantin")).toBeInTheDocument();
    expect(screen.getByText("Jakarta Wedding Agency")).toBeInTheDocument();
  });

  it("filters table results dynamically when searching by name or email", () => {
    render(
      <UserManager
        initialUsers={mockUsers}
        initialSummary={mockSummary}
        availableResellers={mockResellers}
        currentUserId="usr-admin-1"
      />
    );

    const searchInput = screen.getByPlaceholderText(/Cari nama, email, atau agensi toko/i);
    fireEvent.change(searchInput, { target: { value: "Budi" } });

    expect(screen.getByText("Budi Pengantin")).toBeInTheDocument();
    expect(screen.queryByText("Admin Utama")).not.toBeInTheDocument();
    expect(screen.queryByText("Mitra Jakarta")).not.toBeInTheDocument();
  });

  it("filters table results when selecting role tabs", () => {
    render(
      <UserManager
        initialUsers={mockUsers}
        initialSummary={mockSummary}
        availableResellers={mockResellers}
        currentUserId="usr-admin-1"
      />
    );

    // Click Mitra Seller tab
    const sellerTab = screen.getByText(/Mitra Seller/i, { selector: "button *" });
    fireEvent.click(sellerTab);

    expect(screen.getByText("Mitra Jakarta")).toBeInTheDocument();
    expect(screen.queryByText("Budi Pengantin")).not.toBeInTheDocument();
  });

  it("disables delete button on the active logged-in user to prevent self-deletion", () => {
    render(
      <UserManager
        initialUsers={mockUsers}
        initialSummary={mockSummary}
        availableResellers={mockResellers}
        currentUserId="usr-admin-1"
      />
    );

    // Look for the "Anda" tag next to Admin Utama
    expect(screen.getByText("Anda")).toBeInTheDocument();

    // The delete button for the current user (Admin Utama, 2026-01-01 -> row index 2) should be disabled
    const deleteButtons = screen.getAllByRole("button", { name: /Hapus/i });
    expect(deleteButtons[2]).toBeDisabled();
    expect(deleteButtons[0]).not.toBeDisabled();
  });

  it("opens create user modal when clicking Tambah Pengguna Baru button", () => {
    render(
      <UserManager
        initialUsers={mockUsers}
        initialSummary={mockSummary}
        availableResellers={mockResellers}
        currentUserId="usr-admin-1"
      />
    );

    const addButton = screen.getByRole("button", { name: /Tambah Pengguna Baru/i });
    fireEvent.click(addButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Lengkap/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alamat Email/i)).toBeInTheDocument();
  });

  it("opens edit modal with prefilled data when clicking edit button", () => {
    render(
      <UserManager
        initialUsers={mockUsers}
        initialSummary={mockSummary}
        availableResellers={mockResellers}
        currentUserId="usr-admin-1"
      />
    );

    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]!); // Click edit on Budi Pengantin (newest, row 0)

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Budi Pengantin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("budi@pengantin.id")).toBeInTheDocument();
  });
});
