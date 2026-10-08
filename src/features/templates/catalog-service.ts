import { and, desc, asc, eq, sql, ilike, or } from "drizzle-orm";
import type { Database } from "@/lib/db/types";
import { templates } from "@/lib/db/schema";
import type {
  CatalogTemplateItem,
  TemplateCatalogMetadata,
  TemplateExtendedMetadata,
  UpdateTemplateMetadataInput,
} from "./types";
import { templateCatalogMetadataSchema } from "./schemas";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { ForbiddenError } from "@/lib/auth/errors";
import { requireCapability, type Actor } from "@/lib/auth/authorization";

export interface CatalogFilterOptions {
  category?: string;
  style?: string;
  tier?: string;
  search?: string;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "popular" | "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
  /** If specified, limits results to a specific workspace */
  workspaceId?: string;
}

export interface CatalogResult {
  items: CatalogTemplateItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function mapToCatalogItem(row: typeof templates.$inferSelect): CatalogTemplateItem {
  const meta = (row.metadata as TemplateExtendedMetadata) || {};
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: (row.category || "wedding") as any,
    style: (row.style || "modern_minimalist") as any,
    thumbnailUrl: row.thumbnailUrl,
    previewMockupUrl: row.previewMockupUrl,
    tier: (row.tier || "standard") as any,
    price: row.price ?? 0,
    isFeatured: row.isFeatured ?? false,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    colorPalette: Array.isArray(meta.colorPalette) ? meta.colorPalette : [],
    supportedFeatures: Array.isArray(meta.supportedFeatures) ? meta.supportedFeatures : [],
    demoInvitationSlug: meta.demoInvitationSlug,
    useCount: row.useCount ?? 0,
    viewCount: row.viewCount ?? 0,
  };
}

/**
 * Lists published templates formatted for catalog showcase, filtering, and search.
 */
export async function getPublicCatalogTemplates(
  db: Database,
  options: CatalogFilterOptions = {},
): Promise<CatalogResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 24));
  const offset = (page - 1) * limit;

  const conditions = [eq(templates.status, "published"), eq(templates.isPublic, true)];

  if (options.workspaceId) {
    conditions.push(eq(templates.workspaceId, options.workspaceId));
  }

  if (options.category && options.category !== "all") {
    conditions.push(eq(templates.category, options.category));
  }

  if (options.style && options.style !== "all") {
    conditions.push(eq(templates.style, options.style));
  }

  if (options.tier && options.tier !== "all") {
    conditions.push(eq(templates.tier, options.tier));
  }

  if (options.isFeatured !== undefined) {
    conditions.push(eq(templates.isFeatured, options.isFeatured));
  }

  if (options.minPrice !== undefined) {
    conditions.push(sql`${templates.price} >= ${options.minPrice}`);
  }

  if (options.maxPrice !== undefined) {
    conditions.push(sql`${templates.price} <= ${options.maxPrice}`);
  }

  if (options.search && options.search.trim().length > 0) {
    const q = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(templates.name, q),
        ilike(templates.description, q),
        ilike(templates.slug, q),
        sql`exists (select 1 from jsonb_array_elements_text(${templates.tags}) tag where tag ilike ${q})`,
      )!,
    );
  }

  const whereClause = and(...conditions);

  // Sorting
  let order;
  switch (options.sortBy) {
    case "price_asc":
      order = [asc(templates.price), desc(templates.createdAt)];
      break;
    case "price_desc":
      order = [desc(templates.price), desc(templates.createdAt)];
      break;
    case "newest":
      order = [desc(templates.createdAt)];
      break;
    case "popular":
    default:
      order = [
        desc(templates.isFeatured),
        desc(templates.useCount),
        desc(templates.viewCount),
        desc(templates.createdAt),
      ];
      break;
  }

  const [totalRows, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(templates)
      .where(whereClause),
    db
      .select()
      .from(templates)
      .where(whereClause)
      .orderBy(...order)
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalRows[0]?.count ?? 0;

  return {
    items: rows.map(mapToCatalogItem),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single template by its public slug for preview and metadata inspection.
 */
export async function getCatalogTemplateBySlug(
  db: Database,
  slug: string,
): Promise<CatalogTemplateItem | null> {
  const cleanSlug = slug.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.slug, cleanSlug), eq(templates.status, "published")))
    .limit(1);

  if (!row) return null;

  // Track view count increment
  await db
    .update(templates)
    .set({ viewCount: sql`${templates.viewCount} + 1` })
    .where(eq(templates.id, row.id))
    .catch(() => {});

  return mapToCatalogItem(row);
}

/**
 * Updates catalog-facing metadata for a template.
 */
export async function updateTemplateCatalogMetadata(
  db: Database,
  actor: Actor,
  templateId: string,
  input: UpdateTemplateMetadataInput,
): Promise<CatalogTemplateItem> {
  const [existing] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);

  if (!existing) {
    throw new Error("Template tidak ditemukan.");
  }

  if (actor.systemRole !== "owner") {
    throw new ForbiddenError("Hanya Super Admin yang dapat mengubah metadata katalog.");
  }
  await requireCapability(db, actor, existing.workspaceId, "template:write");

  const validated = templateCatalogMetadataSchema.partial().parse(input);

  // If slug is provided and changed, ensure uniqueness
  if (validated.slug && validated.slug !== existing.slug) {
    const [conflict] = await db
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.slug, validated.slug), sql`${templates.id} != ${templateId}`))
      .limit(1);
    if (conflict) {
      throw new Error(`Slug "${validated.slug}" sudah digunakan oleh template lain.`);
    }
  }

  const existingMeta = (existing.metadata as TemplateExtendedMetadata) || {};
  const updatedExtendedMeta: TemplateExtendedMetadata = {
    ...existingMeta,
    ...(validated.galleryUrls ? { galleryUrls: validated.galleryUrls } : {}),
    ...(validated.colorPalette ? { colorPalette: validated.colorPalette } : {}),
    ...(validated.supportedFeatures ? { supportedFeatures: validated.supportedFeatures } : {}),
    ...(validated.demoInvitationSlug !== undefined
      ? { demoInvitationSlug: validated.demoInvitationSlug ?? undefined }
      : {}),
    ...(validated.previewVideoUrl !== undefined
      ? { previewVideoUrl: validated.previewVideoUrl ?? undefined }
      : {}),
    ...(validated.layoutFormat ? { layoutFormat: validated.layoutFormat } : {}),
  };

  const updateValues: Partial<typeof templates.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (validated.slug !== undefined) updateValues.slug = validated.slug;
  if (validated.description !== undefined) updateValues.description = validated.description;
  if (validated.category !== undefined) updateValues.category = validated.category;
  if (validated.style !== undefined) updateValues.style = validated.style;
  if (validated.thumbnailUrl !== undefined) updateValues.thumbnailUrl = validated.thumbnailUrl;
  if (validated.previewMockupUrl !== undefined)
    updateValues.previewMockupUrl = validated.previewMockupUrl;
  if (validated.tier !== undefined) updateValues.tier = validated.tier;
  if (validated.price !== undefined) updateValues.price = validated.price;
  if (validated.isPublic !== undefined) updateValues.isPublic = validated.isPublic;
  if (validated.isFeatured !== undefined) updateValues.isFeatured = validated.isFeatured;
  if (validated.tags !== undefined) updateValues.tags = validated.tags;
  updateValues.metadata = updatedExtendedMeta;

  const [updated] = await db
    .update(templates)
    .set(updateValues)
    .where(eq(templates.id, templateId))
    .returning();

  if (!updated) {
    throw new Error("Gagal memperbarui metadata template.");
  }

  await insertAuditLog(db, {
    workspaceId: existing.workspaceId,
    actorId: actor.userId,
    action: "template.update_metadata",
    entityType: "template",
    entityId: templateId,
  });

  return mapToCatalogItem(updated);
}
