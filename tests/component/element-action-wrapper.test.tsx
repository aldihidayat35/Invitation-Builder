import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionElementWrapper } from "@/features/renderer/components/ActionElementWrapper";
import type { ElementAction } from "@/lib/schema";

afterEach(cleanup);

describe("ActionElementWrapper Runtime Component", () => {
  it("renders an anchor tag with safe URL and target for url action", () => {
    const action: ElementAction = {
      type: "url",
      url: "https://maps.google.com/?q=jakarta",
      target: "_blank",
      hoverEffect: "scale",
    };

    render(
      <ActionElementWrapper action={action}>
        <span>Klik Lokasi</span>
      </ActionElementWrapper>,
    );

    const link = screen.getByRole("link", { name: /Klik Lokasi/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("https://maps.google.com/?q=jakarta");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("renders a WhatsApp link with normalized 62 prefix and encoded message", () => {
    const action: ElementAction = {
      type: "whatsapp",
      phone: "081234567890",
      message: "Halo Admin, saya konfirmasi hadir",
      hoverEffect: "glow",
      target: "_blank",
    };

    render(
      <ActionElementWrapper action={action}>
        <span>Hubungi via WA</span>
      </ActionElementWrapper>,
    );

    const link = screen.getByRole("link", { name: /Hubungi via WA/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toContain("https://wa.me/6281234567890");
    expect(link.getAttribute("href")).toContain(encodeURIComponent("Halo Admin, saya konfirmasi hadir"));
  });

  it("renders a scroll button and calls scrollIntoView when clicked", () => {
    const action: ElementAction = {
      type: "scroll_to_section",
      sectionId: "sec-rsvp",
      hoverEffect: "opacity",
      target: "_blank",
    };

    const targetDiv = document.createElement("div");
    targetDiv.setAttribute("data-section-id", "sec-rsvp");
    const scrollMock = vi.fn();
    targetDiv.scrollIntoView = scrollMock;
    document.body.appendChild(targetDiv);

    render(
      <ActionElementWrapper action={action}>
        <span>Ke Buku Tamu</span>
      </ActionElementWrapper>,
    );

    const button = screen.getByRole("button", { name: /Ke Buku Tamu/i });
    expect(button).toBeDefined();
    fireEvent.click(button);

    expect(scrollMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    document.body.removeChild(targetDiv);
  });

  it("dispatches dib:open-invitation custom event when open_invitation action is clicked", () => {
    const action: ElementAction = {
      type: "open_invitation",
      hoverEffect: "scale",
      target: "_blank",
    };

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(
      <ActionElementWrapper action={action}>
        <span>Buka Undangan Kami</span>
      </ActionElementWrapper>,
    );

    const button = screen.getByRole("button", { name: /Buka Undangan Kami/i });
    fireEvent.click(button);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(
      ([callEvent]) => (callEvent as CustomEvent).type === "dib:open-invitation",
    );
    expect(event).toBeDefined();
    dispatchSpy.mockRestore();
  });
});

