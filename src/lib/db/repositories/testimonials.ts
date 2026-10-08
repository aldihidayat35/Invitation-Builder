import { asc, desc, eq, sql } from "drizzle-orm";
import { testimonials, type NewTestimonialRow, type TestimonialRow } from "../schema";
import type { Database } from "../types";

export const DEFAULT_TESTIMONIALS: Array<Omit<NewTestimonialRow, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "Nabila Putri",
    role: "Pelanggan Premium",
    quote: "Templatenya super cantik dan gampang diedit. Tamu-tamu juga suka banget!",
    rating: 5,
    initials: "NP",
    shade: "#e7c9b3",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Rizky Pratama",
    role: "Pelanggan Premium",
    quote: "Desainnya elegan, prosesnya cepat, hasilnya luar biasa. Highly recommended!",
    rating: 5,
    initials: "RP",
    shade: "#d5c5b2",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Anisa Rahma",
    role: "Pelanggan Premium",
    quote: "Banyak pilihan template yang unik dan modern. Suka banget!",
    rating: 5,
    initials: "AR",
    shade: "#e7cbc3",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Aisyah Fitri",
    role: "Pengguna Undangan",
    quote: "Saya menemukan tema yang cocok untuk keluarga. Tampilannya sangat rapi.",
    rating: 5,
    initials: "AF",
    shade: "#d9c9ac",
    sortOrder: 4,
    isActive: true,
  },
];

/**
 * Ensures table existence and seeds initial default testimonials if empty.
 */
export async function ensureTestimonialsTable(db: Database): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "testimonials" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "role" text DEFAULT 'Pelanggan Premium' NOT NULL,
        "quote" text NOT NULL,
        "rating" integer DEFAULT 5 NOT NULL,
        "avatar_url" text,
        "initials" text,
        "shade" text DEFAULT '#e7c9b3' NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "testimonials_sort_idx" ON "testimonials" ("is_active", "sort_order");
    `);

    // Check count and seed if empty
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonials);

    if ((countRow?.count ?? 0) === 0) {
      for (const item of DEFAULT_TESTIMONIALS) {
        await db.insert(testimonials).values(item).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("[ensureTestimonialsTable] notice:", err);
  }
}

/** Lists active testimonials for public landing page display. */
export async function listPublicTestimonials(db: Database): Promise<TestimonialRow[]> {
  await ensureTestimonialsTable(db);
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
}

/** Lists all testimonials (including inactive) for admin management. */
export async function listAdminTestimonials(db: Database): Promise<TestimonialRow[]> {
  await ensureTestimonialsTable(db);
  return db
    .select()
    .from(testimonials)
    .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
}

/** Finds a specific testimonial by ID. */
export async function findTestimonialById(
  db: Database,
  id: string,
): Promise<TestimonialRow | undefined> {
  await ensureTestimonialsTable(db);
  const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return row;
}

export interface CreateTestimonialInput {
  name: string;
  role?: string;
  quote: string;
  rating?: number;
  avatarUrl?: string | null;
  initials?: string;
  shade?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/** Creates a new customer testimonial. */
export async function createTestimonial(
  db: Database,
  input: CreateTestimonialInput,
): Promise<TestimonialRow> {
  await ensureTestimonialsTable(db);
  const name = input.name.trim();
  const initials =
    input.initials?.trim().toUpperCase() ||
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") ||
    "U";

  const [created] = await db
    .insert(testimonials)
    .values({
      name,
      role: input.role?.trim() || "Pelanggan Premium",
      quote: input.quote.trim(),
      rating: input.rating ?? 5,
      avatarUrl: input.avatarUrl || null,
      initials,
      shade: input.shade?.trim() || "#e7c9b3",
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    })
    .returning();

  if (!created) throw new Error("Failed to create testimonial");
  return created;
}

export interface UpdateTestimonialInput {
  name?: string;
  role?: string;
  quote?: string;
  rating?: number;
  avatarUrl?: string | null;
  initials?: string;
  shade?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/** Updates an existing customer testimonial. */
export async function updateTestimonial(
  db: Database,
  id: string,
  input: UpdateTestimonialInput,
): Promise<TestimonialRow> {
  await ensureTestimonialsTable(db);
  const patch: Partial<NewTestimonialRow> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    patch.name = input.name.trim();
    if (!input.initials) {
      patch.initials = patch.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("");
    }
  }
  if (input.role !== undefined) patch.role = input.role.trim();
  if (input.quote !== undefined) patch.quote = input.quote.trim();
  if (input.rating !== undefined) patch.rating = input.rating;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;
  if (input.initials !== undefined) patch.initials = input.initials.trim().toUpperCase();
  if (input.shade !== undefined) patch.shade = input.shade.trim();
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [updated] = await db
    .update(testimonials)
    .set(patch)
    .where(eq(testimonials.id, id))
    .returning();

  if (!updated) throw new Error(`Testimonial not found: ${id}`);
  return updated;
}

/** Deletes a testimonial by ID. */
export async function deleteTestimonial(db: Database, id: string): Promise<boolean> {
  await ensureTestimonialsTable(db);
  const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, id)).returning();
  return Boolean(deleted);
}

/** Toggles active status of a testimonial. If isActive is provided, sets to that value; otherwise inverts current status. */
export async function toggleTestimonialActive(
  db: Database,
  id: string,
  isActive?: boolean,
): Promise<TestimonialRow> {
  await ensureTestimonialsTable(db);
  let nextActive = isActive;
  if (nextActive === undefined) {
    const target = await findTestimonialById(db, id);
    if (!target) throw new Error(`Testimonial not found: ${id}`);
    nextActive = !target.isActive;
  }

  const [updated] = await db
    .update(testimonials)
    .set({ isActive: nextActive, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
    .returning();

  if (!updated) throw new Error(`Testimonial not found: ${id}`);
  return updated;
}
