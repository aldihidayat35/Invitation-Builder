import { and, desc, eq, ilike } from "drizzle-orm";
import { assets, type AssetRow } from "../schema";
import type { Database } from "../types";

/**
 * Asset persistence. Lookups by id are unscoped on purpose: the service resolves
 * the owning workspace and then authorizes membership (never expose to UI code).
 */
export async function insertAsset(
  db: Database,
  input: {
    id: string;
    workspaceId: string;
    filename: string;
    mimeType: string;
    bytes: number;
    storageKey: string;
    uploadedBy?: string;
  },
): Promise<AssetRow> {
  const [row] = await db.insert(assets).values(input).returning();
  if (!row) throw new Error("insertAsset returned no row");
  return row;
}

export async function findAssetById(db: Database, id: string): Promise<AssetRow | undefined> {
  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return row;
}

export async function markAssetReady(
  db: Database,
  id: string,
  input: { mimeType: string; bytes: number; width?: number | null; height?: number | null },
): Promise<AssetRow | undefined> {
  const [row] = await db
    .update(assets)
    .set({ status: "ready", ...input })
    .where(and(eq(assets.id, id), eq(assets.status, "uploading")))
    .returning();
  return row;
}

export async function markAssetFailed(db: Database, id: string): Promise<void> {
  await db
    .update(assets)
    .set({ status: "failed" })
    .where(and(eq(assets.id, id), eq(assets.status, "uploading")));
}

/** `%` and `_` in the user's search text must not act as LIKE wildcards. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listReadyAssets(
  db: Database,
  workspaceId: string,
  options: { search?: string; limit?: number } = {},
): Promise<AssetRow[]> {
  const conditions = [eq(assets.workspaceId, workspaceId), eq(assets.status, "ready")];
  const search = options.search?.trim();
  if (search) conditions.push(ilike(assets.filename, `%${escapeLike(search)}%`));
  return db
    .select()
    .from(assets)
    .where(and(...conditions))
    .orderBy(desc(assets.createdAt))
    .limit(Math.min(options.limit ?? 60, 200));
}
