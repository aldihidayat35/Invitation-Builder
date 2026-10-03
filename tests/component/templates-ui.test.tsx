import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBadge } from "@/features/templates/components/StatusBadge";
import { TemplateActions } from "@/features/templates/components/TemplateActions";
import { TemplateList } from "@/features/templates/components/TemplateList";
import { ValidationPanel } from "@/features/templates/components/ValidationPanel";
import type { TemplateSummary } from "@/features/templates/types";

// jsdom does not implement <dialog> modal APIs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

const summary = (over: Partial<TemplateSummary> = {}): TemplateSummary => ({
  id: "11111111-1111-4111-8111-111111111111",
  workspaceId: "22222222-2222-4222-8222-222222222222",
  name: "Elegant Rose",
  status: "draft",
  lifecycle: "draft",
  revision: 1,
  publishedVersionNo: null,
  hasUnpublishedChanges: false,
  updatedAt: new Date("2026-10-03T10:00:00Z"),
  ...over,
});

const noop = async () => ({});
const actions = { rename: noop, duplicate: noop, archive: noop };

describe("StatusBadge (Draft/Published indicator)", () => {
  it.each([
    ["draft", null, "Draft"],
    ["published", 3, "Published · v3"],
    ["published-with-changes", 2, "Published · ada perubahan · v2"],
    ["archived", 1, "Diarsipkan"],
  ] as const)("renders %s", (lifecycle, versionNo, text) => {
    render(<StatusBadge lifecycle={lifecycle} versionNo={versionNo} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent(text);
    expect(screen.getByTestId("status-badge")).toHaveAttribute("data-lifecycle", lifecycle);
  });
});

describe("TemplateList states", () => {
  it("shows the empty state", () => {
    render(
      <TemplateList
        templates={[]}
        canWrite
        canArchive
        actions={actions}
        emptyMessage="Belum ada template."
      />,
    );
    expect(screen.getByTestId("empty-state")).toHaveTextContent("Belum ada template.");
  });

  it("lists templates with link, indicator and actions according to permissions", () => {
    render(
      <TemplateList
        templates={[
          summary(),
          summary({
            id: "33333333-3333-4333-8333-333333333333",
            name: "B",
            lifecycle: "published",
            publishedVersionNo: 1,
            status: "published",
          }),
        ]}
        canWrite
        canArchive={false}
        actions={actions}
        emptyMessage=""
      />,
    );
    expect(screen.getAllByTestId("template-card")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Elegant Rose" })).toHaveAttribute(
      "href",
      "/dashboard/templates/11111111-1111-4111-8111-111111111111",
    );
    expect(screen.getAllByTestId("duplicate-button")).toHaveLength(2);
    expect(screen.queryByTestId("archive-button")).toBeNull(); // role without archive
  });

  it("renders archived templates read-only (no link, no actions)", () => {
    render(
      <TemplateList
        templates={[summary({ status: "archived", lifecycle: "archived" })]}
        canWrite
        canArchive
        actions={actions}
        emptyMessage=""
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByTestId("archive-button")).toBeNull();
  });
});

describe("archive confirmation (UI minimum)", () => {
  it("does nothing on cancel and calls the action only after confirming", async () => {
    const archive = vi.fn(async () => ({ ok: true }));
    const user = userEvent.setup();
    render(
      <TemplateActions
        templateId="11111111-1111-4111-8111-111111111111"
        templateName="Elegant Rose"
        canWrite
        canArchive
        rename={noop}
        duplicate={noop}
        archive={archive}
      />,
    );
    // jsdom lacks form.requestSubmit semantics for <dialog>-external forms; stub to submit the hidden form.
    HTMLFormElement.prototype.requestSubmit = function requestSubmit(this: HTMLFormElement) {
      this.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    };

    await user.click(screen.getByTestId("archive-button"));
    expect(screen.getByRole("dialog", { hidden: true })).toHaveTextContent("Arsipkan template?");
    await user.click(screen.getByRole("button", { name: "Batal", hidden: true }));
    expect(archive).not.toHaveBeenCalled();
  });

  it("calls the archive action once the dialog is confirmed", async () => {
    const archive = vi.fn(async () => ({ ok: true }));
    const user = userEvent.setup();
    render(
      <TemplateActions
        templateId="11111111-1111-4111-8111-111111111111"
        templateName="Elegant Rose"
        canWrite
        canArchive
        rename={noop}
        duplicate={noop}
        archive={archive}
      />,
    );
    HTMLFormElement.prototype.requestSubmit = function requestSubmit(this: HTMLFormElement) {
      this.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    };
    await user.click(screen.getByTestId("archive-button"));
    expect(archive).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("confirm-action"));
    await waitFor(() => expect(archive).toHaveBeenCalledTimes(1));
  });

  it("hides write actions when the role has no permissions", () => {
    const { container } = render(
      <TemplateActions
        templateId="x"
        templateName="x"
        canWrite={false}
        canArchive={false}
        rename={noop}
        duplicate={noop}
        archive={noop}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ValidationPanel", () => {
  it("shows loading then a valid result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ valid: true, schemaIssues: [], semanticIssues: [] })),
    );
    const user = userEvent.setup();
    render(<ValidationPanel templateId="abc" />);
    await user.click(screen.getByRole("button", { name: "Jalankan validasi" }));
    await waitFor(() =>
      expect(screen.getByTestId("validation-result")).toHaveTextContent("Draft valid"),
    );
    vi.unstubAllGlobals();
  });

  it("lists issues with their paths", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          valid: false,
          schemaIssues: [{ path: "sections.0.elements.1.frame.w", message: "Too small" }],
          semanticIssues: [{ path: ["sections", 0], message: "Unknown widget" }],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<ValidationPanel templateId="abc" />);
    await user.click(screen.getByRole("button", { name: "Jalankan validasi" }));
    await waitFor(() =>
      expect(screen.getByTestId("validation-result")).toHaveTextContent(
        "sections.0.elements.1.frame.w",
      ),
    );
    expect(screen.getByTestId("validation-result")).toHaveTextContent("Unknown widget");
    vi.unstubAllGlobals();
  });

  it("shows an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Belum login." }, { status: 401 })),
    );
    const user = userEvent.setup();
    render(<ValidationPanel templateId="abc" />);
    await user.click(screen.getByRole("button", { name: "Jalankan validasi" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Belum login.");
    vi.unstubAllGlobals();
  });
});
