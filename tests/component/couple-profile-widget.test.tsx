import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CoupleProfileWidget,
  parseCouplePerson,
} from "@/features/widgets/runtime/CoupleProfileWidget";

describe("CoupleProfileWidget", () => {
  it("renders default groom and bride profile cards with monogram fallback", () => {
    const { container } = render(
      <CoupleProfileWidget
        groom={{ name: "Raden", fullName: "Raden Arya Wijaya", parents: "Putra dari Bpk. Surya & Ibu Dian" }}
        bride={{ name: "Anindya", fullName: "Anindya Putri Kirana", parents: "Putri dari Bpk. Bambang & Ibu Ratna" }}
      />,
    );

    expect(container.querySelector('[data-widget="coupleProfile"]')).toBeInTheDocument();
    expect(screen.getByText("Raden")).toBeInTheDocument();
    expect(screen.getByText("Raden Arya Wijaya")).toBeInTheDocument();
    expect(screen.getByText("Anindya")).toBeInTheDocument();
    expect(screen.getByText("Anindya Putri Kirana")).toBeInTheDocument();
    expect(screen.getByText("&")).toBeInTheDocument();
  });

  it("renders photos when image URLs or objects are provided", () => {
    render(
      <CoupleProfileWidget
        groom={{ name: "Raden", photo: "https://example.com/groom.jpg" }}
        bride={{ name: "Anindya", photo: { url: "https://example.com/bride.jpg" } }}
      />,
    );

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "https://example.com/groom.jpg");
    expect(images[1]).toHaveAttribute("src", "https://example.com/bride.jpg");
  });

  it("respects bride-first ordering", () => {
    const { container } = render(
      <CoupleProfileWidget
        order="bride-first"
        groom={{ name: "Raden" }}
        bride={{ name: "Anindya" }}
      />,
    );

    const cards = container.querySelectorAll("[data-person]");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-person", "bride");
    expect(cards[1]).toHaveAttribute("data-person", "groom");
  });

  it("toggles instagram links and parent information based on flags", () => {
    const { rerender } = render(
      <CoupleProfileWidget
        showInstagram={false}
        showParents={false}
        groom={{ name: "Raden", parents: "Bpk. A & Ibu B", instagram: "@raden_arya" }}
        bride={{ name: "Anindya", parents: "Bpk. C & Ibu D", instagram: "anindya_pk" }}
      />,
    );

    expect(screen.queryByText("Bpk. A & Ibu B")).not.toBeInTheDocument();
    expect(screen.queryByText("@raden_arya")).not.toBeInTheDocument();

    rerender(
      <CoupleProfileWidget
        showInstagram={true}
        showParents={true}
        groom={{ name: "Raden", parents: "Bpk. A & Ibu B", instagram: "@raden_arya" }}
        bride={{ name: "Anindya", parents: "Bpk. C & Ibu D", instagram: "anindya_pk" }}
      />,
    );

    expect(screen.getByText("Bpk. A & Ibu B")).toBeInTheDocument();
    expect(screen.getByText("@raden_arya")).toBeInTheDocument();
    expect(screen.getByText("@anindya_pk")).toBeInTheDocument();
  });

  it("renders custom title, subtitle, and custom connector symbol", () => {
    render(
      <CoupleProfileWidget
        title="Mempelai"
        subtitle="Dengan memohon rahmat Allah SWT"
        connector="♥"
      />,
    );

    expect(screen.getByText("Mempelai")).toBeInTheDocument();
    expect(screen.getByText("Dengan memohon rahmat Allah SWT")).toBeInTheDocument();
    expect(screen.getByText("♥")).toBeInTheDocument();
  });

  it("parseCouplePerson handles various input structures safely", () => {
    expect(parseCouplePerson(null, "Default")).toEqual({ role: "Default" });
    expect(parseCouplePerson(undefined, "Default")).toEqual({ role: "Default" });
    expect(parseCouplePerson([], "Default")).toEqual({ role: "Default" });
    expect(parseCouplePerson([{ name: "Ali", role: "Groom" }])).toEqual({
      name: "Ali",
      fullName: undefined,
      role: "Groom",
      parents: undefined,
      instagram: undefined,
      photo: undefined,
    });
    expect(parseCouplePerson({ instagram: "@username" })).toMatchObject({
      instagram: "username",
    });
  });

  it("applies custom nameFont and bodyFont to headings and details", () => {
    render(
      <CoupleProfileWidget
        title="Pernikahan"
        subtitle="Mohon doa restu"
        nameFont="Great Vibes"
        bodyFont="Montserrat"
        groom={{ name: "Rama", fullName: "Rama Pratama", parents: "Bpk. Bambang" }}
        bride={{ name: "Alya", fullName: "Alya Putri", parents: "Bpk. Hendra" }}
      />,
    );

    const titleEl = screen.getByText("Pernikahan");
    expect(titleEl).toHaveStyle({ fontFamily: '"Great Vibes", sans-serif' });

    const groomNameEl = screen.getByText("Rama");
    expect(groomNameEl).toHaveStyle({ fontFamily: '"Great Vibes", sans-serif' });

    const subtitleEl = screen.getByText("Mohon doa restu");
    expect(subtitleEl).toHaveStyle({ fontFamily: '"Montserrat", sans-serif' });

    const groomFullNameEl = screen.getByText("Rama Pratama");
    expect(groomFullNameEl).toHaveStyle({ fontFamily: '"Montserrat", sans-serif' });
  });

  it("defaults heart-romance connector to ♥ when not explicitly overridden", () => {
    render(
      <CoupleProfileWidget
        style={{ variant: "heart-romance" }}
        groom={{ name: "Rama" }}
        bride={{ name: "Alya" }}
      />,
    );

    expect(screen.getByText("♥")).toBeInTheDocument();
  });
});
