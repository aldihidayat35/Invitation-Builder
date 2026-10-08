import { asc, desc, eq, sql } from "drizzle-orm";
import { templateCategories, templates, type NewTemplateCategoryRow, type TemplateCategoryRow } from "../schema";
import type { Database } from "../types";

export interface TemplateCategoryWithCount extends TemplateCategoryRow {
  templateCount: number;
}

export async function listTemplateCategories(db: Database): Promise<TemplateCategoryWithCount[]> {
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
    .groupBy(templateCategories.id)
    .orderBy(asc(templateCategories.sortOrder), asc(templateCategories.name));

  return rows;
}

export async function findTemplateCategoryById(
  db: Database,
  id: string,
): Promise<TemplateCategoryRow | undefined> {
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
