import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GalleryWidget } from "@/features/widgets/runtime/GalleryWidget";
import {
  getWidgetStyleVariants,
  getGalleryPresentation,
} from "@/features/widgets/widget-styles";

const mockPhotos12 = Array.from({ length: 12 }, (_, i) => ({
  src: `https://example.com/photo-${i + 1}.jpg`,
  alt: `Foto Momen ${i + 1}`,
}));

describe("Gallery Widget Unlimited Photos (10+ Photos) & New Variants", () => {
  it("exposes the 3 modern unlimited-photo variants for gallery", () => {
    const variants = getWidgetStyleVariants("gallery");
    expect(variants.map((v) => v.id)).toEqual([
      "masonry-flow",
      "carousel-slider",
      "square-grid",
    ]);
  });

  it("resolves gallery presentations correctly for both new and legacy variants", () => {
    expect(getGalleryPresentation("masonry-flow", "grid")).toBe("masonry-flow");
    expect(getGalleryPresentation("carousel-slider", "grid")).toBe("carousel-slider");
    expect(getGalleryPresentation("square-grid", "slider")).toBe("square-grid");

    // Legacy fallback mapping
    expect(getGalleryPresentation("editorial-collage", "grid")).toBe("legacy-grid");
    expect(getGalleryPresentation("spotlight-slider", "slider")).toBe("legacy-slider");
    expect(getGalleryPresentation("masonry-cascade", "grid")).toBe("legacy-grid");
  });

  it("renders Masonry Flow with 12 photos, showing initial 6 items with expand toggle button", () => {
    render(
      <GalleryWidget
        items={mockPhotos12}
        style={{ variant: "masonry-flow" }}
      />,
    );

    // Initial 6 items shown
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(6);

    // Expand button is present
    const expandBtn = screen.getByTestId("gallery-expand-btn");
    expect(expandBtn).toHaveTextContent("Lihat Semua Foto (12 Foto)");

    // Click expand button to show all 12 photos
    fireEvent.click(expandBtn);
    const allImages = screen.getAllByRole("img");
    expect(allImages.length).toBe(12);
    expect(expandBtn).toHaveTextContent("Tampilkan Lebih Sedikit");

    // Click collapse button
    fireEvent.click(expandBtn);
    expect(screen.getAllByRole("img").length).toBe(6);
  });

  it("opens fullscreen Lightbox modal on photo click with navigation and close action", () => {
    render(
      <GalleryWidget
        items={mockPhotos12}
        style={{ variant: "square-grid" }}
      />,
    );

    expect(screen.queryByTestId("gallery-lightbox")).toBeNull();

    // Click first photo
    const firstPhoto = screen.getByAltText("Foto Momen 1");
    fireEvent.click(firstPhoto.closest("li")!);

    // Lightbox opens
    const lightbox = screen.getByTestId("gallery-lightbox");
    expect(lightbox).toBeInTheDocument();
    expect(lightbox).toHaveTextContent("1 / 12");

    // Click next photo inside lightbox
    const nextBtn = screen.getByLabelText("Foto selanjutnya");
    fireEvent.click(nextBtn);
    expect(lightbox).toHaveTextContent("2 / 12");

    // Click close button
    const closeBtn = screen.getByTestId("gallery-lightbox-close");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("gallery-lightbox")).toBeNull();
  });

  it("renders Carousel Slider with main hero photo and bottom thumbnail navigation", () => {
    render(
      <GalleryWidget
        items={mockPhotos12}
        style={{ variant: "carousel-slider" }}
      />,
    );

    expect(screen.getByTestId("gallery-slider")).toBeInTheDocument();
    expect(screen.getByTestId("gallery-position")).toHaveTextContent("1 / 12");

    // Click next slide in hero
    const nextBtn = screen.getByLabelText("Foto berikutnya");
    fireEvent.click(nextBtn);
    expect(screen.getByTestId("gallery-position")).toHaveTextContent("2 / 12");

    // Click thumbnail 5 to jump directly
    const thumb5 = screen.getByLabelText("Tampilkan foto 5");
    fireEvent.click(thumb5);
    expect(screen.getByTestId("gallery-position")).toHaveTextContent("5 / 12");

    // Clicking hero opens Lightbox at photo 5
    const hero = screen.getByTitle("Klik untuk melihat layar penuh");
    fireEvent.click(hero);
    expect(screen.getByTestId("gallery-lightbox")).toHaveTextContent("5 / 12");
  });
});
