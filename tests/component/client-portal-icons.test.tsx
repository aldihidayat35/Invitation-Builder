import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  LayersIcon,
  EyeIcon,
  UsersIcon,
  CheckSquareIcon,
  MessageSquareHeartIcon,
  SectionCategoryIcon,
  VariableGroupIcon,
} from "@/app/(public)/c/[code]/components/PortalIcons";
import { PortalSectionManager } from "@/app/(public)/c/[code]/components/PortalSectionManager";
import type { ClassifiedSection } from "@/features/invitations/sections-classifier";

// Mock server actions
vi.mock("@/app/(public)/c/[code]/actions", () => ({
  savePortalSectionsAction: vi.fn().mockResolvedValue({ ok: true, message: "Berhasil" }),
}));

describe("Portal Icons & SVG Components", () => {
  it("renders SVG icons with consistent stroke and viewBox", () => {
    const { container } = render(
      <div>
        <FileTextIcon data-testid="icon-file" size={24} />
        <ImageIcon data-testid="icon-image" />
        <MusicIcon data-testid="icon-music" />
        <LayersIcon data-testid="icon-layers" />
        <EyeIcon data-testid="icon-eye" />
        <UsersIcon data-testid="icon-users" />
        <CheckSquareIcon data-testid="icon-check" />
        <MessageSquareHeartIcon data-testid="icon-wishes" />
      </div>,
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(8);

    svgs.forEach((svg) => {
      expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg.getAttribute("fill")).toBe("none");
      expect(svg.getAttribute("stroke")).toBe("currentColor");
    });

    const fileIcon = screen.getByTestId("icon-file");
    expect(fileIcon.getAttribute("width")).toBe("24");
    expect(fileIcon.getAttribute("height")).toBe("24");
  });

  it("resolves SectionCategoryIcon correctly for all standard section types", () => {
    const { container: c1 } = render(<SectionCategoryIcon category="Cover" iconKey="cover" />);
    expect(c1.querySelector("svg")).not.toBeNull();

    const { container: c2 } = render(<SectionCategoryIcon category="Mempelai" iconKey="couple" />);
    expect(c2.querySelector("svg")).not.toBeNull();

    const { container: c3 } = render(<SectionCategoryIcon category="Acara" iconKey="event" />);
    expect(c3.querySelector("svg")).not.toBeNull();

    const { container: c4 } = render(<SectionCategoryIcon category="Galeri Foto" iconKey="gallery" />);
    expect(c4.querySelector("svg")).not.toBeNull();

    const { container: c5 } = render(<SectionCategoryIcon category="Love Story" iconKey="story" />);
    expect(c5.querySelector("svg")).not.toBeNull();

    const { container: c6 } = render(<SectionCategoryIcon category="Konfirmasi RSVP" iconKey="rsvp" />);
    expect(c6.querySelector("svg")).not.toBeNull();

    const { container: c7 } = render(<SectionCategoryIcon category="Doa & Ucapan" iconKey="wishes" />);
    expect(c7.querySelector("svg")).not.toBeNull();

    const { container: c8 } = render(<SectionCategoryIcon category="Kado Digital" iconKey="gift" />);
    expect(c8.querySelector("svg")).not.toBeNull();
  });

  it("resolves VariableGroupIcon correctly without rendering emojis", () => {
    const { container: c1 } = render(<VariableGroupIcon groupName="couple" label="Profil Mempelai" />);
    expect(c1.querySelector("svg")).not.toBeNull();

    const { container: c2 } = render(<VariableGroupIcon groupName="event" label="Jadwal Acara" />);
    expect(c2.querySelector("svg")).not.toBeNull();

    const { container: c3 } = render(<VariableGroupIcon groupName="bank" label="Rekening Hadiah" />);
    expect(c3.querySelector("svg")).not.toBeNull();
  });
});

describe("PortalSectionManager Zero-Emoji Verification", () => {
  const mockSections: ClassifiedSection[] = [
    {
      id: "sec_cover",
      name: "Cover Undangan",
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
      description: "Foto prewedding",
      isOpening: false,
      isMandatory: false,
      enabled: true,
    },
  ];

  it("renders section items with clean SVG icons and without emoji characters", () => {
    const { container } = render(
      <PortalSectionManager token="test-token" sections={mockSections} disabledSections={[]} />,
    );

    // Should contain SVGs for header icon, stat badges, and section items
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(4);

    // Text content should contain section names and no emojis
    const textContent = container.textContent || "";
    expect(textContent).toContain("Cover Undangan");
    expect(textContent).toContain("Galeri Foto");
    expect(textContent).toContain("2 Section Aktif");

    // Emoji regex check: ensuring 0 emoji characters exist in rendered text
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(textContent)).toBe(false);
  });
});
