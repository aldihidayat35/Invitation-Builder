import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));

import { getDemoInvitation } from "@/features/invitations/demo-catalog";

describe("Live Demo Invitations (Public Template Previews)", () => {
  it("resolves demo-royal-elegant with full sections and valid tokens", async () => {
    const demo = await getDemoInvitation("demo-royal-elegant");
    expect(demo).not.toBeNull();
    expect(demo?.slug).toBe("demo-royal-elegant");
    expect(demo?.title).toContain("Royal Elegant");
    expect(demo?.resolved).toBeDefined();
    expect(demo?.resolved.sections.length).toBeGreaterThanOrEqual(5);

    // Section 0 is the opening cover
    const opening = demo?.resolved.sections.find((s: { isOpening?: boolean }) => s.isOpening);
    expect(opening).toBeDefined();
    expect(opening?.name).toBe("Cover Pembuka");

    // Has wedding widgets
    const elementTypes = demo?.resolved.sections.flatMap((s: any) =>
      s.elements.map((e: any) => (e.type === "widget" ? (e.widgetType ?? e.type) : e.type)),
    );
    expect(elementTypes).toContain("countdown");
    expect(elementTypes).toContain("rsvp");
    expect(elementTypes).toContain("coupleProfile");
    expect(elementTypes).toContain("map");
    expect(elementTypes).toContain("music");
  });

  it("personalizes guest name from query token in demo invitations", async () => {
    const demo = await getDemoInvitation("demo-royal-elegant", "budi-santoso");
    expect(demo).not.toBeNull();
    expect(demo?.guestName).toBe("Budi Santoso");
    expect(demo?.hasGuest).toBe(true);
  });

  it("resolves other built-in demo templates", async () => {
    const floral = await getDemoInvitation("demo-classic-floral");
    expect(floral).not.toBeNull();
    expect(floral?.title).toContain("Classic Floral");

    const minimal = await getDemoInvitation("demo-modern-minimal");
    expect(minimal).not.toBeNull();
    expect(minimal?.title).toContain("Modern Minimal");
  });

  it("returns null for completely unrelated non-demo slugs", async () => {
    const unknown = await getDemoInvitation("random-non-existent-slug-xyz-123");
    expect(unknown).toBeNull();
  });

  it("resolves published v2 template from database when publishedVersionNo is 2", async () => {
    const { vi } = await import("vitest");
    const templatesRepo = await import("@/lib/db/repositories/templates");
    const spyFind = vi.spyOn(templatesRepo, "findTemplateForDemo").mockResolvedValueOnce({
      id: "tpl-123",
      workspaceId: "ws-1",
      name: "Modern Luxury Gold",
      slug: "modern-luxury-gold",
      status: "published",
      publishedVersionNo: 2,
      revision: 5,
      publishedRevision: 5,
      draftDocument: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const dummyV2Doc = {
      schemaVersion: 1,
      design: { baseWidth: 390 },
      variables: [],
      sections: [
        {
          id: "sec_v2",
          name: "Section Versi 2",
          baseHeight: 800,
          background: { color: "#ffffff" },
          elements: [],
        },
      ],
    };

    const spyVersion = vi.spyOn(templatesRepo, "findTemplateVersion").mockResolvedValueOnce({
      id: "ver-v2",
      templateId: "tpl-123",
      versionNo: 2,
      schemaVersion: 1,
      document: dummyV2Doc,
      createdAt: new Date(),
    } as any);

    const result = await getDemoInvitation("modern-luxury-gold");
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Modern Luxury Gold");
    expect(result?.revisionNo).toBe(2);
    expect(result?.resolved.sections[0]?.name).toBe("Section Versi 2");

    spyFind.mockRestore();
    spyVersion.mockRestore();
  });
});
