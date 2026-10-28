import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TemplateDetailView, type PublicTemplateDetail } from "@/app/(dashboard)/templates/[slug]/TemplateDetailView";

afterEach(cleanup);

const mockTemplate: PublicTemplateDetail = {
  id: "tpl-123",
  name: "Classic Floral Botanical",
  slug: "classic-floral-botanical",
  category: "Pernikahan",
  description: "Desain undangan botanical dengan sentuhan floral lembut dan aksen sage green.",
  price: 89000,
  thumbnailUrl: "/images/template-botanical.jpg",
  previewUrl: "/i/demo-classic-floral",
  features: [
    "Musik Latar Romantis Autoplay & Kontrol Audio",
    "Buku Tamu & Konfirmasi Kehadiran (RSVP) Real-time",
    "Amplop Digital & Integrasi Transfer Bank / QRIS",
    "Peta Lokasi Google Maps Interaktif & Navigasi",
  ],
  palette: [
    { name: "Sage Green", hex: "#8A9A86" },
    { name: "Warm Ivory", hex: "#F4F1EA" },
  ],
};

const mockSettings = {
  id: "global",
  appName: "Undangan.id",
  appTagline: "Undangan Digital Lebih Berkesan",
  appLogo: null,
  companyName: "PT Undangan Digital",
  contactPhone: "+62 812-3456-7890",
  contactWhatsapp: "6281234567890",
  contactEmail: "cs@undangan.id",
  address: "Jakarta",
  footerDescription: "Platform undangan digital",
  heroBackgroundImage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Public Template Detail View & Order Form", () => {
  it("renders template information, price, features, and CTA buttons", () => {
    render(<TemplateDetailView template={mockTemplate} appSettings={mockSettings} />);

    expect(screen.getByRole("heading", { level: 1, name: /Classic Floral Botanical/i })).toBeDefined();
    expect(screen.getAllByText(/Pernikahan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Rp\s*89\.000/i)).toBeDefined();
    expect(screen.getByText(/Musik Latar Romantis/i)).toBeDefined();
    expect(screen.getByText(/Buku Tamu & Konfirmasi Kehadiran/i)).toBeDefined();

    const orderBtn = screen.getByRole("button", { name: /Pesan Sekarang/i });
    expect(orderBtn).toBeDefined();

    const livePreviewLink = screen.getByRole("link", { name: /Buka Live Preview/i });
    expect(livePreviewLink.getAttribute("href")).toBe("/i/demo-classic-floral");
  });

  it("opens the simple order modal when 'Pesan Sekarang' is clicked", () => {
    render(<TemplateDetailView template={mockTemplate} appSettings={mockSettings} />);

    expect(screen.queryByRole("dialog")).toBeNull();

    const orderBtn = screen.getByRole("button", { name: /Pesan Sekarang/i });
    fireEvent.click(orderBtn);

    const modal = screen.getByRole("dialog");
    expect(modal).toBeDefined();

    expect(screen.getByLabelText(/Nama Lengkap Anda/i)).toBeDefined();
    expect(screen.getByLabelText(/Nomor WhatsApp Aktif/i)).toBeDefined();
    expect(screen.getByLabelText(/Nama Kedua Mempelai/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Kirim Pesanan & Hubungi Admin WhatsApp/i })).toBeDefined();
  });

  it("automatically opens the order modal when autoOpenOrder is true", () => {
    render(<TemplateDetailView template={mockTemplate} appSettings={mockSettings} autoOpenOrder={true} />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Pesan Tema: Classic Floral Botanical/i)).toBeDefined();
  });

  it("allows selecting a color palette swatch and reflects it in the order form", () => {
    const { container } = render(
      <TemplateDetailView template={mockTemplate} appSettings={mockSettings} autoOpenOrder={true} />,
    );

    // Initial selected should be Sage Green
    expect(screen.getAllByText(/Sage Green/i).length).toBeGreaterThan(0);

    // Find Warm Ivory button and click it
    const warmIvoryBtns = screen.getAllByRole("button", { name: /Warm Ivory/i });
    expect(warmIvoryBtns.length).toBeGreaterThan(0);
    const targetBtn = warmIvoryBtns[0];
    expect(targetBtn).toBeDefined();
    if (targetBtn) {
      fireEvent.click(targetBtn);
    }

    // Selected indicator should update
    expect(screen.getByText(/Dipilih: Warm Ivory/i)).toBeDefined();

    // Check hidden input in order form
    const colorInput = container.querySelector('input[name="selectedColor"]') as HTMLInputElement;
    expect(colorInput).toBeDefined();
    expect(colorInput.value).toContain("Warm Ivory");
    expect(colorInput.value).toContain("#F4F1EA");
  });
});
