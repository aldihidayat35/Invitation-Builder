import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PublicInvitationPage from "@/app/(public)/i/[slug]/page";

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
});
