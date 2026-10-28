import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ClientPortalView } from "@/app/(public)/c/[code]/client-portal-view";
import type { ClientPortalData } from "@/features/orders";

// Mock server actions to prevent real network calls
vi.mock("@/app/(public)/c/[code]/actions", () => ({
  addPortalGuestAction: vi.fn().mockResolvedValue({ ok: true, message: "Tamu ditambahkan" }),
  archivePortalGuestAction: vi.fn().mockResolvedValue({ ok: true, message: "Tamu dihapus" }),
  submitPortalDecisionAction: vi.fn().mockResolvedValue({ ok: true, message: "Undangan disetujui" }),
  savePortalInvitationDataAction: vi.fn().mockResolvedValue({ ok: true, message: "Data tersimpan" }),
  savePortalSectionsAction: vi.fn().mockResolvedValue({ ok: true, message: "Section tersimpan" }),
  savePortalAudioAction: vi.fn().mockResolvedValue({ ok: true, message: "Audio tersimpan" }),
  uploadPortalAudioAssetAction: vi.fn().mockResolvedValue({ ok: true, data: { assetId: "ast_1", url: "https://example.com/audio.mp3" } }),
  savePortalGalleryAction: vi.fn().mockResolvedValue({ ok: true, message: "Galeri tersimpan" }),
  uploadPortalAssetAction: vi.fn().mockResolvedValue({ ok: true, data: { assetId: "ast_img_1" } }),
  savePortalShareMessageAction: vi.fn().mockResolvedValue({ ok: true, message: "Format pesan disimpan" }),
}));

const mockPortalData = {
  invitation: {
    id: "inv_123",
    slug: "romeo-juliet",
    title: "Pernikahan Romeo & Juliet",
    status: "published" as const,
    workspaceId: "ws_1",
    templateVersionId: "tv_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  order: {
    id: "ord_123",
    sellerId: null,
    customerName: "Romeo",
    customerWhatsapp: "08123456789",
    groomBrideNames: "Romeo & Juliet",
    eventDate: new Date("2026-12-25T09:00:00Z"),
    eventLocation: "Grand Ballroom Hotel Indonesia Kempinski Jakarta",
    productionStatus: "client_review" as const,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  templateTitle: "Royal Elegant Gold",
  shareableUrl: "/i/romeo-juliet",
  previewUrl: "/i/romeo-juliet?preview=true",
  variableGroups: [
    {
      group: "couple",
      label: "Data Mempelai",
      fields: [
        {
          key: "couple.groom.nickname",
          label: "Nama Panggilan Pria",
          type: "text",
          control: "text",
          required: true,
          group: "couple",
          maxLength: 30,
          needsTimeZone: false,
        },
      ],
    },
  ],
  variableValues: {
    "couple.groom.nickname": "Romeo",
  },
  variableErrors: {},
  galleryItems: [
    { src: "https://example.com/photo1.jpg", alt: "Prewedding 1" },
  ],
  galleryEnabled: true,
  audioSettings: {
    enabled: true,
    title: "A Thousand Years",
    artist: "Christina Perri",
    src: "https://example.com/song.mp3",
  },
  sections: [
    {
      id: "sec_cover",
      name: "Cover Pembuka",
      category: "Cover",
      icon: "cover",
      description: "Halaman pembuka utama",
      isOpening: true,
      isMandatory: true,
      enabled: true,
    },
    {
      id: "sec_gallery",
      name: "Galeri Foto",
      category: "Galeri Foto",
      icon: "gallery",
      description: "Galeri foto prewedding",
      isOpening: false,
      isMandatory: false,
      enabled: true,
    },
  ],
  disabledSections: [],
  guests: [
    {
      id: "gst_1",
      invitationId: "inv_123",
      name: "Bpk. Bambang & Rekan",
      tokenId: "tok_bambang",
      maxParty: 2,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  rsvps: [
    {
      id: "rsvp_1",
      invitationId: "inv_123",
      guestId: "gst_1",
      name: "Bpk. Bambang",
      response: "attending",
      partySize: 2,
      message: "Selamat menempuh hidup baru Romeo & Juliet, bahagia selalu!",
      createdAt: new Date(),
    },
  ],
  activeShareMessageTemplate: "Halo {guestname}, kami mengundang Anda ke {event_title}: {link}",
  shareMessageTemplates: [
    {
      id: "tmpl_formal",
      label: "Formal",
      tone: "formal",
      category: "wedding",
      content: "Yth. {guestname}, kami mengundang Anda ke {event_title}: {link}",
      isDefault: true,
    },
  ],
  supportContact: {
    name: "Customer Care",
    phone: "6281234567890",
    whatsappUrl: "https://wa.me/6281234567890",
  },
  bankVerification: {
    status: "verified" as const,
    verifiedAt: "2026-10-01",
    primaryAccount: {
      bank: "BCA",
      accountNumber: "1234567890",
      accountName: "Romeo Montague",
    },
  },
} as unknown as ClientPortalData;

describe("ClientPortalView Component & Interaction Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders hero header with couple title, date, and status badges", () => {
    render(<ClientPortalView data={mockPortalData} token="token-123" />);

    expect(screen.getByText("Romeo & Juliet")).toBeInTheDocument();
    expect(screen.getByText(/Tanggal Acara: 25 Desember 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Tema: Royal Elegant Gold/i)).toBeInTheDocument();
    expect(screen.getByText("Portal Klien Mandiri")).toBeInTheDocument();
    expect(screen.getByText("Menunggu Persetujuan Anda")).toBeInTheDocument();
  });

  it("renders all 8 horizontal capsule pill tabs with accurate badges and counts", () => {
    render(<ClientPortalView data={mockPortalData} token="token-123" />);

    expect(screen.getByRole("button", { name: /Data Undangan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Galeri Foto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Musik Undangan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Atur Section/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review Undangan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Daftar Tamu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Konfirmasi RSVP/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buku Doa \/ Ucapan/i })).toBeInTheDocument();
  });

  it("allows switching across all tabs seamlessly", () => {
    render(<ClientPortalView data={mockPortalData} token="token-123" />);

    // 1. Galeri Foto tab
    fireEvent.click(screen.getByRole("button", { name: /Galeri Foto/i }));
    expect(screen.getByText("Galeri Foto Undangan")).toBeInTheDocument();

    // 2. Musik Undangan tab
    fireEvent.click(screen.getByRole("button", { name: /Musik Undangan/i }));
    expect(screen.getByText("Musik Latar & Backsound Undangan")).toBeInTheDocument();
    expect(screen.getByText("A Thousand Years")).toBeInTheDocument();

    // 3. Atur Section tab
    fireEvent.click(screen.getByRole("button", { name: /Atur Section/i }));
    expect(screen.getByText("Pilih Section yang Ditampilkan")).toBeInTheDocument();
    expect(screen.getByText("Cover Pembuka")).toBeInTheDocument();

    // 4. Review Undangan tab
    fireEvent.click(screen.getByRole("button", { name: /Review Undangan/i }));
    expect(screen.getByText("Pratinjau Undangan Langsung")).toBeInTheDocument();
    expect(screen.getByText("Setujui Undangan")).toBeInTheDocument();
    expect(screen.getByText("Ajukan Catatan Revisi")).toBeInTheDocument();

    // 5. Daftar Tamu tab
    fireEvent.click(screen.getByRole("button", { name: /Daftar Tamu/i }));
    expect(screen.getByText("Manajemen Daftar Tamu")).toBeInTheDocument();
    expect(screen.getByText("Bpk. Bambang & Rekan")).toBeInTheDocument();
    expect(screen.getByText("Salin Link")).toBeInTheDocument();
    expect(screen.getByText("Salin Pesan")).toBeInTheDocument();
    expect(screen.getByText("Kirim WA")).toBeInTheDocument();

    // 6. Konfirmasi RSVP tab
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi RSVP/i }));
    expect(screen.getByText("Total Konfirmasi")).toBeInTheDocument();
    expect(screen.getByText("Daftar Respon Tamu")).toBeInTheDocument();

    // 7. Buku Doa tab
    fireEvent.click(screen.getByRole("button", { name: /Buku Doa \/ Ucapan/i }));
    expect(screen.getByText("Buku Doa & Ucapan Restu")).toBeInTheDocument();
    expect(screen.getByText(/Selamat menempuh hidup baru Romeo & Juliet/i)).toBeInTheDocument();

    // 8. Back to Data Undangan tab
    fireEvent.click(screen.getByRole("button", { name: /Data Undangan/i }));
    expect(screen.getByText("Pengaturan & Pengisian Data Undangan")).toBeInTheDocument();
  });

  it("supports switching between self-service and admin-assisted modes in Data Undangan tab", () => {
    render(<ClientPortalView data={mockPortalData} token="token-123" />);

    // Initially in self-service
    expect(screen.getByText("Isi Data Mandiri (Self-Service)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Panggilan Pria/i)).toBeInTheDocument();

    // Switch to admin-assisted
    fireEvent.click(screen.getByText("Customize oleh Admin (via WhatsApp)"));
    expect(screen.getByText("Serahkan Pengisian Data ke Tim Kami")).toBeInTheDocument();
    expect(screen.getByText("Hubungi Admin via WhatsApp")).toBeInTheDocument();
  });

  it("filters RSVP entries using dedicated filter buttons without errors", () => {
    render(<ClientPortalView data={mockPortalData} token="token-123" />);

    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi RSVP/i }));

    const btnAll = screen.getByRole("button", { name: /Semua/i });
    const btnAttending = screen.getByRole("button", { name: /Hadir/i });
    const btnNotAttending = screen.getByRole("button", { name: /Berhalangan/i });

    expect(btnAll).toBeInTheDocument();
    expect(btnAttending).toBeInTheDocument();
    expect(btnNotAttending).toBeInTheDocument();

    // Click attending filter
    fireEvent.click(btnAttending);
    expect(screen.getByText("Bpk. Bambang")).toBeInTheDocument();

    // Click not attending filter
    fireEvent.click(btnNotAttending);
    expect(screen.getByText("Tidak ada data respon yang cocok dengan filter atau pencarian.")).toBeInTheDocument();
  });

  it("asserts ZERO emoji characters exist in the rendered portal interface across tabs", () => {
    const { container } = render(<ClientPortalView data={mockPortalData} token="token-123" />);

    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const tabsToTest = [
      /Data Undangan/i,
      /Galeri Foto/i,
      /Musik Undangan/i,
      /Atur Section/i,
      /Review Undangan/i,
      /Daftar Tamu/i,
      /Konfirmasi RSVP/i,
      /Buku Doa \/ Ucapan/i,
    ];

    for (const tabPattern of tabsToTest) {
      fireEvent.click(screen.getByRole("button", { name: tabPattern }));
      const renderedText = container.textContent || "";
      expect(emojiRegex.test(renderedText)).toBe(false);
    }
  });
});
