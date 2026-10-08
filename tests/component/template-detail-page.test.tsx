import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import TemplateDetailPage from "@/app/(dashboard)/dashboard/templates/[id]/page";
import * as api from "@/features/templates/api";
import type { TemplateDetail } from "@/features/templates/types";
import { createEmptyDocument } from "@/lib/schema";
import { addSection, createElement } from "@/features/editor/core/ops";

afterEach(cleanup);

function mockTemplate(over: Partial<TemplateDetail> = {}): TemplateDetail {
  let doc = createEmptyDocument();
  const added = addSection(doc, { isOpening: true });
  doc = added.document;
  const secEl = createElement(doc, added.sectionId, "text");
  doc = secEl.document;

  return {
    id: "6c7eb2ae-991e-47d2-8ca4-c3aad582382c",
    workspaceId: "ws-1",
    name: "Undangan Rustik Elegan",
    status: "draft",
    lifecycle: "draft",
    revision: 2,
    publishedVersionNo: null,
    hasUnpublishedChanges: true,
    updatedAt: new Date("2026-10-08T09:00:00Z"),
    document: doc,
    versions: [
      {
        id: "v-1",
        versionNo: 1,
        schemaVersion: 1,
        note: "Rilis perdana tema floral",
        createdAt: new Date("2026-10-05T12:00:00Z"),
      },
    ],
    ...over,
  };
}

describe("TemplateDetailPage (Revamped Layout & Studio Editor Launchpad)", () => {
  it("renders the interactive hero card with prominent editor CTA button", async () => {
    const tpl = mockTemplate();
    vi.spyOn(api, "openTemplate").mockResolvedValue(tpl);
    vi.spyOn(api, "permissionsFor").mockResolvedValue({
      write: true,
      publish: true,
      archive: true,
    });

    const jsx = await TemplateDetailPage({
      params: Promise.resolve({ id: tpl.id }),
      searchParams: Promise.resolve({}),
    } as never);

    render(jsx);

    // Breadcrumb
    expect(screen.getByRole("link", { name: /Kembali ke Koleksi Template/i })).toHaveAttribute(
      "href",
      "/dashboard/templates",
    );

    // Title
    expect(screen.getByTestId("template-title")).toHaveTextContent("Undangan Rustik Elegan");

    // Status Badge
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Draft");

    // Prominent Open Editor button (Hero Launchpad)
    const openEditorBtn = screen.getByTestId("open-editor");
    expect(openEditorBtn).toBeInTheDocument();
    expect(openEditorBtn).toHaveAttribute("id", "open-editor");
    expect(openEditorBtn).toHaveAttribute("href", `/editor/${tpl.id}`);
    expect(openEditorBtn).toHaveTextContent("Buka Studio Editor");
    expect(openEditorBtn).toHaveTextContent("Mulai Desain & Kustomisasi Kanvas →");

    // Full screen preview button
    expect(screen.getByRole("link", { name: /Pratinjau Layar Penuh/i })).toHaveAttribute(
      "href",
      `/editor/${tpl.id}/preview`,
    );

    // Sections & Stats in Artboard Peek
    expect(screen.getAllByText("Opening").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1 Section/i)).toBeInTheDocument();

    // 3-step workflow guidance
    expect(screen.getByText("Rancang di Studio Editor")).toBeInTheDocument();
    expect(screen.getByText("Validasi Kualitas Draft")).toBeInTheDocument();
    expect(screen.getByText("Publikasikan Versi Resmi")).toBeInTheDocument();

    // Versions list
    expect(screen.getByTestId("version-list")).toHaveTextContent("v1");
    expect(screen.getByTestId("version-list")).toHaveTextContent("Rilis perdana tema floral");
  });

  it("handles archived templates with read-only badge and notice", async () => {
    const tpl = mockTemplate({
      status: "archived",
      lifecycle: "archived",
    });
    vi.spyOn(api, "openTemplate").mockResolvedValue(tpl);
    vi.spyOn(api, "permissionsFor").mockResolvedValue({
      write: false,
      publish: false,
      archive: false,
    });

    const jsx = await TemplateDetailPage({
      params: Promise.resolve({ id: tpl.id }),
      searchParams: Promise.resolve({}),
    } as never);

    render(jsx);

    expect(screen.getByTestId("archived-note")).toHaveTextContent(
      "Template ini diarsipkan dan bersifat read-only.",
    );
    expect(screen.getByTestId("open-editor")).toHaveTextContent("Lihat di Studio Editor");
    expect(screen.getByTestId("open-editor")).toHaveTextContent("Mode Pratinjau Read-Only");
  });
});
