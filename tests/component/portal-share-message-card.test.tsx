import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { PortalShareMessageCard } from "@/app/(public)/c/[code]/components/PortalShareMessageCard";

vi.mock("@/app/(public)/c/[code]/actions", () => ({
  savePortalShareMessageAction: vi.fn().mockResolvedValue({
    ok: true,
    message: "Format pesan dan foto kartu WhatsApp berhasil disimpan.",
  }),
  uploadPortalAssetAction: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      assetId: "ast_share_1",
      url: "/api/assets/ast_share_1/file",
      filename: "custom-share.jpg",
    },
  }),
}));

describe("PortalShareMessageCard (WhatsApp Custom Photo & Message)", () => {
  it("renders collapsed header and toggles open to show upload dropzone and text editor", () => {
    render(
      <PortalShareMessageCard
        token="token_test"
        activeTemplate="Halo {guestname}, kami mengundang Anda ke acara {event_title}."
        onTemplateChange={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText("Format Teks & Foto Pesan WhatsApp")).toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByRole("button", { name: /Atur Format Pesan & Foto/i }));

    // Image upload section should now be visible
    expect(screen.getByText("Foto Kartu Preview WhatsApp (Thumbnail Kustom):")).toBeInTheDocument();
    expect(screen.getByText("Klik untuk Unggah Foto Kartu WhatsApp")).toBeInTheDocument();

    // Editor textarea should be visible
    expect(screen.getByPlaceholderText(/Tuliskan format pesan undangan Anda di sini/i)).toBeInTheDocument();

    // Simulation should be visible
    expect(screen.getByText("Simulasi Tampilan Pesan di WhatsApp Tamu")).toBeInTheDocument();
  });

  it("renders active image preview card when initialShareImageUrl is provided", () => {
    render(
      <PortalShareMessageCard
        token="token_test"
        activeTemplate="Pesan undangan untuk {guestname}"
        initialShareImageUrl="/api/assets/custom-card.jpg"
        eventDetails={{
          eventTitle: "Tasyakuran Aqiqah - Arash Shaquille Attaqi",
          eventDate: "7 November 2026",
        }}
        onTemplateChange={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    // Open card
    fireEvent.click(screen.getByRole("button", { name: /Atur Format Pesan & Foto/i }));

    // Custom photo badge and action buttons should be visible
    expect(screen.getByText("Foto Kustom Aktif")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ganti Foto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hapus Foto/i })).toBeInTheDocument();

    // Simulated card should display event details
    expect(screen.getByText("Tasyakuran Aqiqah - Arash Shaquille Attaqi")).toBeInTheDocument();
    expect(screen.getByText("7 November 2026")).toBeInTheDocument();
  });

  it("allows removing the image and saving the updated share message", async () => {
    const { savePortalShareMessageAction } = await import("@/app/(public)/c/[code]/actions");
    const onToast = vi.fn();
    const onImgChange = vi.fn();

    render(
      <PortalShareMessageCard
        token="token_test"
        activeTemplate="Pesan undangan untuk {guestname}"
        initialShareImageUrl="/api/assets/custom-card.jpg"
        onTemplateChange={vi.fn()}
        onShareImageChange={onImgChange}
        onShowToast={onToast}
      />,
    );

    // Open card
    fireEvent.click(screen.getByRole("button", { name: /Atur Format Pesan & Foto/i }));

    // Click Hapus Foto
    fireEvent.click(screen.getByRole("button", { name: /Hapus Foto/i }));
    expect(onImgChange).toHaveBeenCalledWith(null);

    // Click Simpan Format & Foto
    fireEvent.click(screen.getByRole("button", { name: /Simpan Format & Foto/i }));

    await waitFor(() => {
      expect(savePortalShareMessageAction).toHaveBeenCalledWith(
        "token_test",
        "Pesan undangan untuk {guestname}",
        null,
      );
    });
  });
});

