// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  listPublicTestimonials,
  listAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialActive,
  DEFAULT_TESTIMONIALS,
} from "@/lib/db/repositories/testimonials";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Testimonials Management Repository", () => {
  it("seeds default testimonials on clean database and lists public reviews", async () => {
    const list = await listPublicTestimonials(db());
    expect(list.length).toBeGreaterThanOrEqual(DEFAULT_TESTIMONIALS.length);
    expect(list[0]?.name).toBe(DEFAULT_TESTIMONIALS[0]?.name);
    expect(list[0]?.isActive).toBe(true);
  });

  it("creates a new custom testimonial", async () => {
    const created = await createTestimonial(db(), {
      name: "Budi Santoso & Maya",
      role: "Pengantin Bahagia",
      quote: "Sistem undangannya sangat modern, cepat, dan fiturnya lengkap!",
      rating: 5,
      initials: "BM",
      shade: "#e7c9b3",
      sortOrder: 99,
      isActive: true,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe("Budi Santoso & Maya");
    expect(created.rating).toBe(5);
  });

  it("updates and toggles active status of a testimonial", async () => {
    const all = await listAdminTestimonials(db());
    const target = all[0];
    expect(target).toBeDefined();

    const updated = await updateTestimonial(db(), target!.id, {
      role: "VIP Customer",
      rating: 4,
    });
    expect(updated?.role).toBe("VIP Customer");
    expect(updated?.rating).toBe(4);

    const toggled = await toggleTestimonialActive(db(), target!.id);
    expect(toggled?.isActive).toBe(false);

    // After deactivating, it should not appear in public testimonials
    const publicList = await listPublicTestimonials(db());
    expect(publicList.some((t) => t.id === target!.id)).toBe(false);
  });

  it("deletes a testimonial safely", async () => {
    const temp = await createTestimonial(db(), {
      name: "Temporary Reviewer",
      role: "Tester",
      quote: "Will be deleted immediately.",
      rating: 3,
      sortOrder: 100,
      isActive: true,
    });

    const deleted = await deleteTestimonial(db(), temp.id);
    expect(deleted).toBe(true);

    const all = await listAdminTestimonials(db());
    expect(all.some((t) => t.id === temp.id)).toBe(false);
  });
});
