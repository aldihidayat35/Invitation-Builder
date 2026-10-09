import { asc, eq, sql } from "drizzle-orm";
import { templateCategories, templates, type NewTemplateCategoryRow, type TemplateCategoryRow } from "../schema";
import type { Database } from "../types";

export interface TemplateCategoryWithCount extends TemplateCategoryRow {
  templateCount: number;
}

export const DEFAULT_TEMPLATE_CATEGORIES: Array<
  Omit<NewTemplateCategoryRow, "id" | "createdAt" | "updatedAt">
> = [
  { slug: "wedding", name: "Pernikahan", icon: "rings", sortOrder: 1, description: "Undangan pernikahan elegan & sakral" },
  { slug: "engagement", name: "Tunangan", icon: "leaf", sortOrder: 2, description: "Momen lamaran dan pertunangan manis" },
  { slug: "birthday", name: "Ulang Tahun", icon: "cake", sortOrder: 3, description: "Perayaan ulang tahun spesial & meriah" },
  { slug: "aqiqah", name: "Aqiqah", icon: "moon", sortOrder: 4, description: "Tasyakuran kelahiran dan aqiqah buah hati" },
  { slug: "tasyakuran", name: "Tasyakuran", icon: "leaf", sortOrder: 5, description: "Acara doa syukur dan syukuran keluarga" },
  { slug: "event", name: "Event Lainnya", icon: "gift", sortOrder: 6, description: "Seminar, reuni, peresmian, dan event" },
];

/**
 * Ensures table existence and seeds default categories if empty.
 */
export async function ensureTemplateCategoriesTable(db: Database): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "template_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "description" text,
        "icon" text,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "template_categories_sort_idx" ON "template_categories" ("sort_order");
    `);

    // Check count and seed initial categories if table is empty
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(templateCategories);

    if ((countRow?.count ?? 0) === 0) {
      for (const item of DEFAULT_TEMPLATE_CATEGORIES) {
        await db.insert(templateCategories).values(item).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("[ensureTemplateCategoriesTable] notice:", err);
  }
}

export async function listTemplateCategories(db: Database): Promise<TemplateCategoryWithCount[]> {
  await ensureTemplateCategoriesTable(db);
  const rows = await db
    .select({
      id: templateCategories.id,
      slug: templateCategories.slug,
      name: templateCategories.name,
      description: templateCategories.description,
      icon: templateCategories.icon,
      sortOrder: templateCategories.sortOrder,
      createdAt: templateCategories.createdAt,
      updatedAt: templateCategories.updatedAt,
      templateCount: sql<number>`cast(count(${templates.id}) as integer)`,
    })
    .from(templateCategories)
    .leftJoin(templates, eq(templates.category, templateCategories.slug))
    .groupBy(
      templateCategories.id,
      templateCategories.slug,
      templateCategories.name,
      templateCategories.description,
      templateCategories.icon,
      templateCategories.sortOrder,
      templateCategories.createdAt,
      templateCategories.updatedAt,
    )
    .orderBy(asc(templateCategories.sortOrder), asc(templateCategories.name));

  return rows;
}

export async function findTemplateCategoryById(
  db: Database,
  id: string,
): Promise<TemplateCategoryRow | undefined> {
  await ensureTemplateCategoriesTable(db);
  const [row] = await db
    .select()
    .from(templateCategories)
    .where(eq(templateCategories.id, id))
    .limit(1);
  return row;
}

export async function findTemplateCategoryBySlug(
  db: Database,
  slug: string,
): Promise<TemplateCategoryRow | undefined> {
  await ensureTemplateCategoriesTable(db);
  const [row] = await db
    .select()
    .from(templateCategories)
    .where(eq(templateCategories.slug, slug))
    .limit(1);
  return row;
}

export async function insertTemplateCategory(
  db: Database,
  input: {
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
  },
): Promise<TemplateCategoryRow> {
  await ensureTemplateCategoriesTable(db);
  const [row] = await db
    .insert(templateCategories)
    .values({
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row!;
}

export async function updateTemplateCategory(
  db: Database,
  id: string,
  input: {
    slug?: string;
    name?: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
  },
): Promise<TemplateCategoryRow> {
  await ensureTemplateCategoriesTable(db);
  const values: Partial<NewTemplateCategoryRow> = {
    updatedAt: new Date(),
  };

  if (input.slug !== undefined) values.slug = input.slug.trim().toLowerCase();
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.description !== undefined) values.description = input.description?.trim() || null;
  if (input.icon !== undefined) values.icon = input.icon?.trim() || null;
  if (input.sortOrder !== undefined) values.sortOrder = input.sortOrder;

  const [row] = await db
    .update(templateCategories)
    .set(values)
    .where(eq(templateCategories.id, id))
    .returning();

  if (!row) throw new Error("Kategori template tidak ditemukan.");
  return row;
}

export async function countTemplatesUsingCategory(db: Database, slug: string): Promise<number> {
  const [res] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(templates)
    .where(eq(templates.category, slug));
  return res?.count ?? 0;
}

export async function deleteTemplateCategory(db: Database, id: string): Promise<TemplateCategoryRow> {
  const existing = await findTemplateCategoryById(db, id);
  if (!existing) {
    throw new Error("Kategori template tidak ditemukan.");
  }

  const usageCount = await countTemplatesUsingCategory(db, existing.slug);
  if (usageCount > 0) {
    throw new Error(
      `Kategori "${existing.name}" tidak dapat dihapus karena masih digunakan oleh ${usageCount} template. Ubah kategori template terlebih dahulu.`,
    );
  }

  const [deleted] = await db
    .delete(templateCategories)
    .where(eq(templateCategories.id, id))
    .returning();

  if (!deleted) throw new Error("Gagal menghapus kategori template.");
  return deleted;
}
