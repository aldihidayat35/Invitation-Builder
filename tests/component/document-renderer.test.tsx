/**
 * PRD refs: FR-PRV-001, P-02, P-04, AC-02, AC-03, AC-06, NFR-A11Y-001.
 * Preview uses the same DOM renderer as the public runtime: no canvas.
 */
import { render, screen, within } from "@testing-library/react";
import { fullDocument } from "../helpers/documents";
import { DocumentRenderer } from "@/features/renderer";
import { resolveDocument } from "@/lib/engine";
import { canonicalDocumentSchema } from "@/lib/schema";

const template = canonicalDocumentSchema.parse(fullDocument());

const DATA_A = {
  "couple.bride.fullName": "Anindya Putri",
  "couple.bride.nickname": "Anin",
  "couple.groom.fullName": "Raka Pratama",
  "couple.groom.nickname": "Raka",
  "event.ceremony.startAt": { local: "2027-03-14T09:00", timeZone: "Asia/Jakarta" },
  "venue.name": "Gedung Serbaguna",
  "venue.address": "Jl. Melati No. 1",
};

const DATA_B = {
  ...DATA_A,
  "couple.bride.nickname": "Sekar",
  "couple.groom.nickname": "Bima",
  "venue.name": "Pendopo Agung",
};

function renderPreview(data: Record<string, unknown>, guest: { name?: string } = {}) {
  return render(
    <DocumentRenderer document={resolveDocument(template, data, guest)} runtimeMode="preview" />,
  );
}

describe("DocumentRenderer (FR-PRV-001)", () => {
  it("renders the resolved document as DOM inside the renderer root, never a canvas", () => {
    const { container } = renderPreview(DATA_A);
    const root = container.querySelector('[data-renderer="html"]');
    expect(root).toHaveAttribute("data-runtime-mode", "preview");
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelectorAll("section[data-section-id]")).toHaveLength(3);
  });

  it("renders bound text with accessible semantics (letter-by-letter title keeps its label)", () => {
    renderPreview(DATA_A);
    expect(screen.getByRole("text", { name: "Anin & Raka" })).toBeInTheDocument();
    expect(screen.getByText("GEDUNG SERBAGUNA")).toBeInTheDocument();
  });

  it("two datasets of one template render different content (AC-03)", () => {
    const a = renderPreview(DATA_A);
    const textA = a.container.textContent;
    a.unmount();
    const b = renderPreview(DATA_B);
    expect(screen.getByRole("text", { name: "Sekar & Bima" })).toBeInTheDocument();
    expect(b.container.textContent).not.toBe(textA);
    expect(b.container.textContent).toContain("PENDOPO AGUNG");
    expect(b.container.textContent).not.toContain("GEDUNG SERBAGUNA");
  });

  it("shows the guest name only from guest context (AC-06)", () => {
    const withAni = renderPreview(DATA_A, { name: "Wulan" });
    expect(within(withAni.container).getByText("Wulan")).toBeInTheDocument();
    withAni.unmount();

    const withBudi = renderPreview(DATA_A, { name: "Budi" });
    expect(within(withBudi.container).getByText("Budi")).toBeInTheDocument();
    expect(withBudi.container.textContent).not.toContain("Wulan");
    withBudi.unmount();

    const generic = renderPreview(DATA_A);
    expect(generic.container.textContent).toContain("Tamu Undangan");
  });

  it("positions elements by canonical frame with a center pivot", () => {
    const { container } = renderPreview(DATA_A);
    const title = container.querySelector<HTMLElement>('[data-element-id="el_title"]');
    expect(title).not.toBeNull();
    expect(title?.style.position).toBe("absolute");
    expect(title?.style.left).toBe("32px");
    expect(title?.style.top).toBe("460px");
    expect(title?.style.width).toBe("326px");
    expect(title?.style.transformOrigin).toBe("center center");
  });

  it("skips hidden elements and images without an asset", () => {
    const doc = resolveDocument(template, DATA_A);
    const { container } = render(<DocumentRenderer document={doc} runtimeMode="public" />);
    // media.coverPhoto is optional and empty -> no <img> is emitted
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-element-id="el_cover_photo"]')).not.toBeNull();
  });

  it("escapes text instead of interpreting markup", () => {
    const { container } = renderPreview({
      ...DATA_A,
      "venue.name": '<img src=x onerror="alert(1)">',
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<IMG SRC=X ONERROR");
  });
});
