/**
 * PRD refs: P-04, AC-11 (groundwork). The public smoke route renders DOM text,
 * never a canvas.
 */
import { render, screen } from "@testing-library/react";
import RendererSmokePage from "@/app/(public)/smoke/renderer/page";

describe("public renderer smoke (P-04)", () => {
  it("renders semantic HTML text inside the renderer root", () => {
    const { container } = render(<RendererSmokePage />);

    expect(screen.getByRole("heading", { level: 1, name: "HTML Renderer OK" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("data-testid", "renderer-smoke");

    const rootEl = container.querySelector('[data-renderer="html"]');
    expect(rootEl).not.toBeNull();
    expect(rootEl).toHaveAttribute("data-runtime-mode", "smoke");
    expect(rootEl).toHaveAttribute("data-base-width", "390");
  });

  it("does not render any canvas element", () => {
    const { container } = render(<RendererSmokePage />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders animated text with accessible role and char spans (FR-ANM-004, AC-07)", () => {
    const { container } = render(<RendererSmokePage />);

    // Accessible text is intact for screen readers
    const coupleText = screen.getByRole("text", { name: "Romeo & Juliet" });
    expect(coupleText).toBeInTheDocument();

    // Characters are staggered across individual visual spans
    const chars = container.querySelectorAll("[data-anim-char]");
    expect(chars).toHaveLength(12);

    // Parent animated wrapper holds element metadata
    const animatedWrapper = screen.getByTestId("smoke-animated-text");
    expect(animatedWrapper).toHaveAttribute("data-animation-preset", "charRise");
  });
});
