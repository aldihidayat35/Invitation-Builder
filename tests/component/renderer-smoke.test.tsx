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
});
