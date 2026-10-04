/**
 * PRD refs: FR-WDG-002..004, AC-04..06, P-09. The runtime widgets are plain DOM:
 * rendered here in an HTML sandbox (jsdom) exactly as the public renderer would.
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetRuntime } from "@/features/widgets/runtime";
import { CountdownWidget } from "@/features/widgets/runtime/CountdownWidget";
import { PublicImage } from "@/features/renderer";

const target = { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" };
const targetMs = Date.UTC(2026, 11, 12, 1, 0, 0);

afterEach(() => vi.useRealTimers());

describe("map widget", () => {
  it("renders a safe external link to the coordinate", () => {
    render(
      <WidgetRuntime
        widgetType="map"
        props={{ coordinate: { lat: -7.8, lng: 110.36 }, label: "Gedung A", buttonText: "Peta" }}
      />,
    );
    const link = screen.getByTestId("map-link");
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=-7.8,110.36",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link).toHaveTextContent("Peta");
    expect(screen.getByText("Gedung A")).toBeInTheDocument();
  });

  it("degrades to a disabled button when the coordinate is missing or invalid", () => {
    render(<WidgetRuntime widgetType="map" props={{ coordinate: null }} />);
    expect(screen.queryByTestId("map-link")).toBeNull();
    expect(screen.getByTestId("map-link-disabled")).toHaveAttribute("aria-disabled", "true");
  });
});

describe("guest greeting widget", () => {
  it("shows the guest name, else the generic fallback (AC-06)", () => {
    const { rerender } = render(
      <WidgetRuntime widgetType="guestGreeting" props={{ guestName: "Budi" }} />,
    );
    expect(screen.getByTestId("greeting-name")).toHaveTextContent("Budi");
    expect(screen.getByTestId("greeting-name")).toHaveAttribute("data-fallback", "false");

    rerender(<WidgetRuntime widgetType="guestGreeting" props={{ guestName: null }} />);
    expect(screen.getByTestId("greeting-name")).toHaveTextContent("Tamu Undangan");
    expect(screen.getByTestId("greeting-name")).toHaveAttribute("data-fallback", "true");
    expect(document.body.textContent).not.toMatch(/null|undefined/);
  });
});

describe("countdown widget", () => {
  it("renders the remaining time for a fixed clock, per the target's timezone", () => {
    const now = targetMs - (((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1000;
    render(<CountdownWidget targetDateTime={target} nowMs={now} />);
    expect(screen.getByTestId("countdown-days")).toHaveTextContent("02");
    expect(screen.getByTestId("countdown-hours")).toHaveTextContent("03");
    expect(screen.getByTestId("countdown-minutes")).toHaveTextContent("04");
    expect(screen.getByTestId("countdown-seconds")).toHaveTextContent("05");

    // Same wall clock in UTC is seven hours later.
    const { unmount } = render(
      <CountdownWidget targetDateTime={{ local: target.local, timeZone: "UTC" }} nowMs={now} />,
    );
    expect(screen.getAllByTestId("countdown-hours")[1]).toHaveTextContent("10");
    unmount();
  });

  it("applies afterState: message or hide", () => {
    const { rerender, container } = render(
      <CountdownWidget
        targetDateTime={target}
        nowMs={targetMs + 1000}
        afterState="message"
        afterMessage="Selamat!"
      />,
    );
    expect(screen.getByTestId("countdown-after")).toHaveTextContent("Selamat!");
    rerender(<CountdownWidget targetDateTime={target} nowMs={targetMs + 1000} afterState="hide" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows placeholders for an invalid target instead of NaN", () => {
    render(<CountdownWidget targetDateTime={{ local: "x", timeZone: "Asia/Jakarta" }} nowMs={0} />);
    expect(screen.getByTestId("countdown")).toHaveAttribute("data-state", "invalid");
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("ticks with the shared timer and clears it on unmount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(targetMs - 10_000);
    const { unmount } = render(<CountdownWidget targetDateTime={target} />);
    expect(vi.getTimerCount()).toBe(1);
    expect(screen.getByTestId("countdown-seconds")).toHaveTextContent("10");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId("countdown-seconds")).toHaveTextContent("07");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("unknown widgets (P-09)", () => {
  it("renders nothing visible publicly, a note in preview, and never throws", () => {
    const { container, unmount } = render(<WidgetRuntime widgetType="mystery" props={{}} />);
    expect(container.querySelector("[data-widget-fallback='mystery']")).not.toBeNull();
    expect(container.textContent).toBe("");
    unmount();
    render(<WidgetRuntime widgetType="mystery" props={{}} showFallback />);
    expect(screen.getByTestId("widget-fallback")).toHaveTextContent("mystery");
  });
});

describe("PublicImage (FR-AST-002)", () => {
  it("renders an <img> through the asset url with lazy loading by default", () => {
    render(
      <PublicImage
        assetId="3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10"
        alt="Cover"
        width={300}
        height={200}
        fit="cover"
        focal={{ x: 0.25, y: 0.75 }}
        radius={12}
        opacity={0.5}
      />,
    );
    const img = screen.getByRole("img", { name: "Cover" });
    expect(img).toHaveAttribute("src", "/api/assets/3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10/file");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img.style.objectFit).toBe("cover");
    expect(img.style.objectPosition).toBe("25% 75%");
    expect(img.style.borderRadius).toBe("calc(var(--u, 1px) * 12)");
    expect(img.style.opacity).toBe("0.5");
  });

  it("applies flip transforms when flipH or flipV is set", () => {
    const { unmount } = render(
      <PublicImage assetId="a" alt="Flipped" width={100} height={100} flipH flipV />,
    );
    let img = screen.getByRole("img", { name: "Flipped" });
    expect(img.style.transform).toBe("scaleX(-1) scaleY(-1)");
    unmount();

    render(<PublicImage assetId="a" alt="Flip Horizontal Only" width={100} height={100} flipH />);
    img = screen.getByRole("img", { name: "Flip Horizontal Only" });
    expect(img.style.transform).toBe("scaleX(-1)");
  });
});
