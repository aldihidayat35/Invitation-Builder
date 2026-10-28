import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TemplateMetadataForm } from "@/features/templates/components/TemplateMetadataForm";
import type { TemplateDetail } from "@/features/templates/types";

afterEach(cleanup);

const mockTemplate: TemplateDetail = {
  id: "tpl-palette-test",
  workspaceId: "ws-123",
  name: "Royal Heritage Template",
  status: "published",
  category: "wedding",
  style: "modern_minimalist",
  tier: "standard",
  price: 99000,
  isPublic: true,
  isFeatured: false,
  slug: "royal-heritage-template",
  description: "Desain mewah adat nusantara",
  thumbnailUrl: "/images/template-jawa.jpg",
  previewMockupUrl: "/images/template-jawa.jpg",
  tags: ["jawa", "royal"],
  useCount: 10,
  publishedVersionNo: 1,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  versions: [],
  document: {
    schemaVersion: 1,
    page: { width: 430, height: 932, background: "#ffffff" },
    sections: [],
  },
  metadata: {
    colorPalette: [
      { hex: "#D4AF37", name: "Gold Kencana", isPrimary: true },
      { hex: "#2C221E", name: "Dark Walnut" },
    ],
    supportedFeatures: ["rsvp", "google_maps"],
  },
};

describe("TemplateMetadataForm Color Palette Management", () => {
  it("renders existing color palette swatches from template metadata", () => {
    const { container } = render(
      <TemplateMetadataForm template={mockTemplate} action={async () => ({})} />,
    );

    expect(screen.getByText(/Palet Warna Tema Template/i)).toBeDefined();
    expect(screen.getByDisplayValue("Gold Kencana")).toBeDefined();
    expect(screen.getByDisplayValue("Dark Walnut")).toBeDefined();

    const jsonInput = container.querySelector('input[name="colorPaletteJson"]') as HTMLInputElement;
    expect(jsonInput).toBeDefined();
    expect(jsonInput.value).toContain("Gold Kencana");
    expect(jsonInput.value).toContain("#D4AF37");
  });

  it("applies a preset palette when clicking a preset button", () => {
    const { container } = render(
      <TemplateMetadataForm template={mockTemplate} action={async () => ({})} />,
    );

    const terracottaBtn = screen.getByRole("button", { name: /Terracotta Boho/i });
    fireEvent.click(terracottaBtn);

    expect(screen.getByDisplayValue("Terracotta")).toBeDefined();
    expect(screen.getByDisplayValue("Sand Cream")).toBeDefined();

    const jsonInput = container.querySelector('input[name="colorPaletteJson"]') as HTMLInputElement;
    expect(jsonInput.value).toContain("Terracotta");
    expect(jsonInput.value).toContain("#C86D51");
  });

  it("allows adding a custom swatch and deleting a swatch", () => {
    const { container } = render(
      <TemplateMetadataForm template={mockTemplate} action={async () => ({})} />,
    );

    const addBtn = screen.getByRole("button", { name: /Tambah Warna Kustom/i });
    fireEvent.click(addBtn);

    expect(screen.getByDisplayValue("Warna Aksen")).toBeDefined();

    const deleteBtns = screen.getAllByTitle(/Hapus swatch/i);
    expect(deleteBtns.length).toBe(3);
    const firstDeleteBtn = deleteBtns[0];
    expect(firstDeleteBtn).toBeDefined();
    if (firstDeleteBtn) {
      fireEvent.click(firstDeleteBtn);
    }

    const jsonInput = container.querySelector('input[name="colorPaletteJson"]') as HTMLInputElement;
    const parsed = JSON.parse(jsonInput.value);
    expect(parsed.length).toBe(2);
  });
});
