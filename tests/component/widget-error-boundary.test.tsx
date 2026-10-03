/**
 * PRD refs: NFR-REL-001, P-09. One failing widget must not take the page down.
 */
import { render, screen } from "@testing-library/react";
import { WidgetErrorBoundary } from "@/features/widgets/runtime/WidgetErrorBoundary";

function Boom(): never {
  throw new Error("secret internals");
}

describe("WidgetErrorBoundary", () => {
  it("swallows a throwing widget and keeps siblings rendered", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(
      <div>
        <WidgetErrorBoundary widgetType="map">
          <Boom />
        </WidgetErrorBoundary>
        <p>tetap tampil</p>
      </div>,
    );
    spy.mockRestore();
    expect(screen.getByText("tetap tampil")).toBeInTheDocument();
    expect(container.querySelector('[data-widget-error="map"]')).not.toBeNull();
    expect(container.textContent).not.toContain("secret internals");
  });

  it("renders children when nothing fails", () => {
    render(
      <WidgetErrorBoundary widgetType="map">
        <span>aman</span>
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText("aman")).toBeInTheDocument();
  });
});
