import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getGalleryPresentation,
  getWidgetStyleVariants,
  resolveWidgetStyleVariant,
} from "@/features/widgets";
import { WidgetRuntime } from "@/features/widgets/runtime";

afterEach(cleanup);

const propsByType: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  countdown: {
    targetDateTime: { local: "2030-01-01T10:00", timeZone: "Asia/Jakarta" },
  },
  map: {
    coordinate: { lat: -0.32149, lng: 100.397105 },
    label: "Gedung Acara",
    buttonText: "Buka peta",
  },
  guestGreeting: { prefix: "Kepada Yth.", guestName: "Tamu Undangan" },
  rsvp: { title: "Konfirmasi Kehadiran", enablePartySize: true, enableMessage: true },
  gift: {
    title: "Kirim Hadiah",
    accounts: [{ bank: "BCA", accountNumber: "123456789", accountName: "Alya" }],
  },
  music: { title: "Lagu Pilihan", src: "/music/example.mp3" },
  gallery: {
    title: "Galeri",
    layout: "grid",
    items: [
      { src: "https://example.test/a.jpg", alt: "Foto A" },
      { src: "https://example.test/b.jpg", alt: "Foto B" },
      { src: "https://example.test/c.jpg", alt: "Foto C" },
    ],
  },
};

describe("current widget style variants", () => {
  it("renders all current variants (including 10 gift variants) with their normalized data attribute", () => {
    for (const [widgetType, props] of Object.entries(propsByType)) {
      for (const variant of getWidgetStyleVariants(widgetType)) {
        const { container, unmount } = render(
          <WidgetRuntime
            widgetType={widgetType}
            props={props}
            style={{ variant: variant.id, color: "#7b2940", background: "#fff8fa" }}
          />,
        );
        const frame = container.querySelector(`[data-widget="${widgetType}"]`);
        expect(frame).not.toBeNull();
        expect(frame).toHaveAttribute("data-variant", variant.id);
        unmount();
      }
    }
  });

  it("keeps legacy ids, missing styles, and invalid ids on the safe legacy path", () => {
    const legacy = render(
      <WidgetRuntime widgetType="map" props={propsByType.map!} style={{ variant: "luxury" }} />,
    );
    expect(legacy.container.querySelector('[data-widget="map"]')).toHaveAttribute(
      "data-variant",
      "luxury",
    );
    legacy.unmount();

    const missing = render(<WidgetRuntime widgetType="map" props={propsByType.map!} />);
    expect(missing.container.querySelector('[data-widget="map"]')).toHaveAttribute(
      "data-variant",
      "default",
    );
    missing.unmount();

    const invalid = render(
      <WidgetRuntime
        widgetType="map"
        props={propsByType.map!}
        style={{ variant: "not-installed" }}
      />,
    );
    expect(invalid.container.querySelector('[data-widget="map"]')).toHaveAttribute(
      "data-variant",
      "default",
    );
  });

  it("lets current gallery variants control presentation while legacy styles honor layout", () => {
    expect(getGalleryPresentation("editorial-collage", "slider")).toBe("collage");
    expect(getGalleryPresentation("spotlight-slider", "grid")).toBe("slider");
    expect(getGalleryPresentation("arch-window", "grid")).toBe("arch-window");
    expect(getGalleryPresentation("glass-carousel", "grid")).toBe("glass-carousel");
    expect(getGalleryPresentation("slider-pill", "grid")).toBe("legacy-grid");
    expect(getGalleryPresentation("grid-rounded", "slider")).toBe("legacy-slider");

    const { container, rerender } = render(
      <WidgetRuntime
        widgetType="gallery"
        props={propsByType.gallery!}
        style={{ variant: "spotlight-slider" }}
      />,
    );
    expect(container.querySelector('[data-testid="gallery-slider"]')).not.toBeNull();

    rerender(
      <WidgetRuntime
        widgetType="gallery"
        props={{ ...propsByType.gallery, layout: "slider" }}
        style={{ variant: "editorial-collage" }}
      />,
    );
    expect(container.querySelector('[data-gallery-presentation="collage"]')).not.toBeNull();
  });

  it("exposes deterministic resolution metadata for the editor", () => {
    expect(resolveWidgetStyleVariant("music", "mini-player").kind).toBe("current");
    expect(resolveWidgetStyleVariant("music", "bar").kind).toBe("legacy");
    expect(resolveWidgetStyleVariant("music", "unknown").kind).toBe("fallback");
  });
});
