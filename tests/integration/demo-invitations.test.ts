import { describe, expect, it } from "vitest";
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
    const opening = demo?.resolved.sections.find((s) => s.isOpening);
    expect(opening).toBeDefined();
    expect(opening?.name).toBe("Cover Pembuka");

    // Has wedding widgets
    const elementTypes = demo?.resolved.sections.flatMap((s) =>
      s.elements.map((e) => (e.type === "widget" ? (e as { widgetType: string }).widgetType : e.type)),
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
});
