import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvitationImagePicker } from "@/features/invitations/components/InvitationImagePicker";

describe("InvitationImagePicker component", () => {
  const sampleOptions = [
    { id: "asset-1", label: "foto-pengantin.jpg" },
    { id: "asset-2", label: "background-bunga.png" },
  ];

  it("renders an empty dropzone trigger when no photo is selected", () => {
    render(
      <InvitationImagePicker
        id="v.media.photo"
        name="v.media.photo"
        label="Foto Utama"
        imageOptions={sampleOptions}
      />,
    );

    expect(screen.getByText("Pilih atau Unggah Foto")).toBeInTheDocument();
    expect(screen.getByTestId("open-image-modal-btn")).toBeInTheDocument();

    // Accessible select is present for FormData & form test compatibility
    const select = screen.getByLabelText("Foto Utama");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveValue("");
  });

  it("renders photo preview card when a photo is selected", () => {
    const { container } = render(
      <InvitationImagePicker
        id="v.media.photo"
        name="v.media.photo"
        label="Foto Utama"
        value="asset-1"
        imageOptions={sampleOptions}
      />,
    );

    const selectedCard = screen.getByTestId("selected-image-card");
    expect(selectedCard).toHaveTextContent("foto-pengantin.jpg");
    expect(screen.getByTestId("change-image-btn")).toBeInTheDocument();
    expect(screen.getByTestId("remove-image-btn")).toBeInTheDocument();

    const select = container.querySelector('select[name="v.media.photo"]');
    expect(select).toHaveValue("asset-1");
  });

  it("opens modal on click, shows gallery grid, and selects an image", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <form onChange={handleChange}>
        <InvitationImagePicker
          id="v.media.photo"
          name="v.media.photo"
          label="Foto Utama"
          imageOptions={sampleOptions}
        />
      </form>,
    );

    // Open modal
    fireEvent.click(screen.getByTestId("open-image-modal-btn"));
    expect(screen.getByRole("dialog", { name: /Pilih Foto/i })).toBeInTheDocument();

    // Assets appear in gallery
    expect(screen.getByTestId("gallery-card-asset-1")).toBeInTheDocument();
    expect(screen.getByTestId("gallery-card-asset-2")).toBeInTheDocument();

    // Select asset-2
    fireEvent.click(screen.getByTestId("gallery-card-asset-2"));

    // Modal closes
    expect(screen.queryByRole("dialog")).toBeNull();
    // Hidden select changed to asset-2
    const select = container.querySelector('select[name="v.media.photo"]');
    expect(select).toHaveValue("asset-2");
    expect(handleChange).toHaveBeenCalled();
  });

  it("filters gallery items when searching", () => {
    render(
      <InvitationImagePicker
        id="v.media.photo"
        name="v.media.photo"
        label="Foto Utama"
        imageOptions={sampleOptions}
      />,
    );

    fireEvent.click(screen.getByTestId("open-image-modal-btn"));
    const searchInput = screen.getByPlaceholderText(/Cari foto berdasarkan nama/i);
    fireEvent.change(searchInput, { target: { value: "bunga" } });

    expect(screen.queryByTestId("gallery-card-asset-1")).toBeNull();
    expect(screen.getByTestId("gallery-card-asset-2")).toBeInTheDocument();
  });

  it("removes selected photo when Hapus button is clicked", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <form onChange={handleChange}>
        <InvitationImagePicker
          id="v.media.photo"
          name="v.media.photo"
          label="Foto Utama"
          value="asset-1"
          imageOptions={sampleOptions}
        />
      </form>,
    );

    fireEvent.click(screen.getByTestId("remove-image-btn"));
    const select = container.querySelector('select[name="v.media.photo"]');
    expect(select).toHaveValue("");
    expect(handleChange).toHaveBeenCalled();
    expect(screen.getByText("Pilih atau Unggah Foto")).toBeInTheDocument();
  });
});
