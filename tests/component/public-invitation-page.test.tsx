import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PublicInvitationPage, { generateMetadata } from "@/app/(public)/i/[slug]/page";

afterEach(cleanup);

describe("PublicInvitationPage (Live Preview Route)", () => {
  it("renders demo-royal-elegant live preview page without error", async () => {
    const pageJsx = await PublicInvitationPage({
      params: Promise.resolve({ slug: "demo-royal-elegant" }),
      searchParams: Promise.resolve({}),
    });

    render(pageJsx);

    expect(screen.getByTestId("public-invitation")).toBeInTheDocument();
    // Opening screen should be rendered
    expect(screen.getByTestId("opening-cover-canvas")).toBeInTheDocument();
  });

  it("personalizes guest greeting in live preview with query param ?to=", async () => {
    const pageJsx = await PublicInvitationPage({
      params: Promise.resolve({ slug: "demo-royal-elegant" }),
      searchParams: Promise.resolve({ to: "budi-santoso" }),
    });

    render(pageJsx);

    expect(screen.getByTestId("public-invitation")).toBeInTheDocument();
    expect(screen.getByTestId("greeting-name")).toHaveTextContent("Budi Santoso");
  });

  it("handles unknown slug by throwing notFound", async () => {
    await expect(
      PublicInvitationPage({
        params: Promise.resolve({ slug: "non-existent-slug-xyz" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();
  });

  it("generates rich Open Graph metadata for WhatsApp preview with title, date, and image", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "demo-royal-elegant" }),
      searchParams: Promise.resolve({ to: "Voni Anggelia & Keluarga" }),
    });

    expect(meta.title).toContain("Royal Elegant");
    // Open Graph title matches WhatsApp preview card format
    expect(meta.openGraph?.title).toMatch(/^The Wedding of/i);
    expect(meta.openGraph?.title).toContain("Danang & Sekar");

    // Open Graph description contains event date
    expect(meta.openGraph?.description).toBeDefined();
    expect(meta.openGraph?.description).toContain("2026");

    // Open Graph image is absolute URL
    expect(meta.openGraph?.images).toBeDefined();
    const images = Array.isArray(meta.openGraph?.images)
      ? meta.openGraph.images
      : [meta.openGraph?.images];
    expect(images.length).toBeGreaterThan(0);
    const firstImage = images[0] as { url: string; width?: number; height?: number };
    expect(firstImage.url).toMatch(/^https?:\/\//);
    expect(firstImage.width).toBe(1200);
    expect(firstImage.height).toBe(630);

    // Twitter card
    const twitter = meta.twitter as { card?: string; title?: string } | undefined;
    expect(twitter?.card).toBe("summary_large_image");
    expect(twitter?.title).toMatch(/^The Wedding of/i);

    // Canonical link contains guest parameter
    expect(meta.alternates?.canonical).toContain("to=Voni%20Anggelia%20%26%20Keluarga");
  });
});
