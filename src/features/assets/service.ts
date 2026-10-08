/**
 * Asset service (server-only): upload init/finalize, validation, listing and
 * delivery (FR-AST-001..002, FR-EDT-008, NFR-SEC-002).
 *
 * Trust model: the client only declares filename/MIME/bytes. Finalize re-reads
 * the stored object and derives type, size and dimensions from the bytes; a
 * mismatch marks the asset `failed` and deletes the object.
 *
 * Authorization policy (mirrors templates): operations naming a workspace give
 * ForbiddenError to non-members; operations by asset id give AssetNotFoundError
 * to non-members so existence is not leaked across workspaces.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { findRole, requireCapability, type Actor } from "@/lib/auth/authorization";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  deleteAssetRow,
  findAssetById,
  getStorageAggregate,
  insertAsset,
  listAllWorkspaceAssets,
  listReadyAssets,
  markAssetFailed,
  markAssetReady,
} from "@/lib/db/repositories/assets";
import { formatBytes, getStorageLimitBytes } from "./config";
import type { AssetRow } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import {
  ASSET_LIMITS,
  EXTENSIONS_BY_MIME,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  assetUploadInitSchema,
  maxBytesForMime,
  type AllowedMimeType,
} from "@/lib/schema";
import { sniffImage } from "@/lib/storage/image-sniff";
import { sniffVideo } from "@/lib/storage/video-sniff";
import type { PresignedUpload, StorageDriver } from "@/lib/storage/types";
import { z } from "zod";
import { assetContentUrl } from "./urls";

export class AssetNotFoundError extends Error {
  constructor() {
    super("Aset tidak ditemukan.");
    this.name = "AssetNotFoundError";
  }
}

/** Input is invalid or the uploaded bytes are not an acceptable image. Message is user-safe. */
export class AssetRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetRejectedError";
  }
}

export interface AssetSummary {
  readonly id: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: Date;
}

export interface UploadInit {
  readonly assetId: string;
  readonly upload: PresignedUpload;
}

const idSchema = z.uuid();
const isImageMime = (mime: string): boolean =>
  (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
const isVideoMime = (mime: string): boolean =>
  (VIDEO_MIME_TYPES as readonly string[]).includes(mime);

function toSummary(row: AssetRow): AssetSummary {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt,
  };
}

async function loadAuthorized(
  db: Database,
  actor: Actor,
  assetId: string,
  capability: "asset:read" | "asset:write",
): Promise<AssetRow> {
  if (!idSchema.safeParse(assetId).success) throw new AssetNotFoundError();
  const row = await findAssetById(db, assetId);
  if (!row) throw new AssetNotFoundError();
  if (actor.systemRole === "owner") return row;
  if (!(await findRole(db, actor, row.workspaceId))) throw new AssetNotFoundError();
  await requireCapability(db, actor, row.workspaceId, capability);
  return row;
}

async function fail(
  db: Database,
  storage: StorageDriver,
  row: AssetRow,
  message: string,
): Promise<never> {
  await markAssetFailed(db, row.id);
  await storage.remove(row.storageKey).catch(() => undefined);
  throw new AssetRejectedError(message);
}

/** Step 1: validate declared metadata, reserve the asset row and hand out an upload target. */
export async function initUpload(
  db: Database,
  storage: StorageDriver,
  actor: Actor,
  input: { workspaceId: string; filename: unknown; mimeType: unknown; bytes: unknown },
): Promise<UploadInit> {
  if (!idSchema.safeParse(input.workspaceId).success)
    throw new AssetRejectedError("Workspace tidak valid.");
  if (actor.systemRole !== "owner") {
    await requireCapability(db, actor, input.workspaceId, "asset:write");
  }

  const parsed = assetUploadInitSchema.safeParse({
    filename: input.filename,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });
  if (!parsed.success) {
    throw new AssetRejectedError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const upload = parsed.data;
  if (!isImageMime(upload.mimeType) && !isVideoMime(upload.mimeType)) {
    throw new AssetRejectedError("Hanya gambar (JPEG, PNG, WebP, AVIF, GIF) dan video (MP4, WebM, OGG, MOV) yang didukung saat ini.");
  }

  const limitBytes = getStorageLimitBytes();
  const stats = await getStorageAggregate(db);
  if (stats.totalBytes + upload.bytes > limitBytes) {
    throw new AssetRejectedError(
      `Penyimpanan penuh. Kapasitas maksimum ${formatBytes(limitBytes)} telah tercapai.`
    );
  }

  const id = randomUUID();
  const ext = EXTENSIONS_BY_MIME[upload.mimeType as AllowedMimeType][0]!;
  const storageKey = `ws/${input.workspaceId}/${id}.${ext}`;
  await insertAsset(db, {
    id,
    workspaceId: input.workspaceId,
    filename: upload.filename,
    mimeType: upload.mimeType,
    bytes: upload.bytes,
    storageKey,
    uploadedBy: actor.userId,
  });

  const presigned = await storage.presignPut(storageKey, upload.mimeType, upload.bytes);
  return {
    assetId: id,
    upload: presigned ?? {
      method: "PUT",
      url: assetContentUrl(id),
      headers: { "Content-Type": upload.mimeType },
    },
  };
}

/** Step 2 (local driver only): the app receives the bytes, enforcing the declared size. */
export async function receiveContent(
  db: Database,
  storage: StorageDriver,
  actor: Actor,
  assetId: string,
  data: Uint8Array,
): Promise<void> {
  const row = await loadAuthorized(db, actor, assetId, "asset:write");
  if (row.status !== "uploading") throw new AssetRejectedError("Aset sudah diproses.");
  const maxBytes = maxBytesForMime(row.mimeType as AllowedMimeType);
  if (data.byteLength > maxBytes || data.byteLength !== row.bytes) {
    await fail(db, storage, row, "Ukuran berkas tidak sesuai dengan yang dinyatakan.");
  }
  await storage.put(row.storageKey, data, row.mimeType);
}

/** Step 3: verify the stored object from its bytes, then mark the asset `ready`. */
export async function finalizeUpload(
  db: Database,
  storage: StorageDriver,
  actor: Actor,
  assetId: string,
): Promise<AssetSummary> {
  const row = await loadAuthorized(db, actor, assetId, "asset:write");
  if (row.status === "ready") return toSummary(row);
  if (row.status !== "uploading") throw new AssetRejectedError("Upload ini sudah ditolak.");

  const maxBytes = maxBytesForMime(row.mimeType as AllowedMimeType);
  const data = await storage.read(row.storageKey, maxBytes);
  if (!data) throw new AssetRejectedError("Berkas belum diunggah.");
  if (data.byteLength > maxBytes) {
    return fail(db, storage, row, "Berkas melebihi batas ukuran.");
  }
  if (data.byteLength !== row.bytes) {
    return fail(db, storage, row, "Ukuran berkas tidak sesuai dengan yang dinyatakan.");
  }

  if (isVideoMime(row.mimeType)) {
    const sniffed = sniffVideo(data);
    if (!sniffed) return fail(db, storage, row, "Berkas bukan video yang valid.");
    const match =
      sniffed.mime === row.mimeType ||
      (row.mimeType === "video/quicktime" && sniffed.mime === "video/mp4") ||
      (row.mimeType === "video/mp4" && sniffed.mime === "video/quicktime");
    if (!match) {
      return fail(db, storage, row, "Isi berkas tidak sesuai dengan tipe yang dinyatakan.");
    }
    const ready = await markAssetReady(db, row.id, {
      mimeType: row.mimeType,
      bytes: data.byteLength,
      width: sniffed.width,
      height: sniffed.height,
    });
    if (!ready) throw new AssetRejectedError("Aset sudah diproses.");
    await insertAuditLog(db, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "asset.upload",
      entityType: "asset",
      entityId: row.id,
      metadata: { filename: row.filename, bytes: ready.bytes },
    });
    return toSummary(ready);
  }

  const sniffed = sniffImage(data);
  if (!sniffed) return fail(db, storage, row, "Berkas bukan gambar yang valid.");
  if (sniffed.mime !== row.mimeType) {
    return fail(db, storage, row, "Isi berkas tidak sesuai dengan tipe yang dinyatakan.");
  }
  if (
    sniffed.width > ASSET_LIMITS.imageMaxDimension ||
    sniffed.height > ASSET_LIMITS.imageMaxDimension
  ) {
    return fail(db, storage, row, `Dimensi gambar maksimal ${ASSET_LIMITS.imageMaxDimension}px.`);
  }

  const ready = await markAssetReady(db, row.id, {
    mimeType: sniffed.mime,
    bytes: data.byteLength,
    width: sniffed.width,
    height: sniffed.height,
  });
  if (!ready) throw new AssetRejectedError("Aset sudah diproses.");
  await insertAuditLog(db, {
    workspaceId: row.workspaceId,
    actorId: actor.userId,
    action: "asset.upload",
    entityType: "asset",
    entityId: row.id,
    metadata: { filename: row.filename, bytes: ready.bytes },
  });
  return toSummary(ready);
}

export async function listAssets(
  db: Database,
  actor: Actor,
  workspaceId: string,
  options: { search?: string } = {},
): Promise<AssetSummary[]> {
  if (!idSchema.safeParse(workspaceId).success)
    throw new AssetRejectedError("Workspace tidak valid.");
  await requireCapability(db, actor, workspaceId, "asset:read");
  const rows = await listReadyAssets(db, workspaceId, {
    ...(options.search ? { search: options.search.slice(0, 100) } : {}),
  });
  return rows.map(toSummary);
}

export interface DeliverableAsset {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

/**
 * Public delivery by capability URL: ids are unguessable UUIDs and only `ready`
 * images are served. Published invitations reference assets this way (F9).
 */
export async function getDeliverableAsset(
  db: Database,
  storage: StorageDriver,
  assetId: string,
): Promise<DeliverableAsset | null> {
  if (!idSchema.safeParse(assetId).success) return null;
  const row = await findAssetById(db, assetId);
  if (!row || row.status !== "ready") return null;
  if (!isImageMime(row.mimeType) && !isVideoMime(row.mimeType)) return null;
  const maxBytes = maxBytesForMime(row.mimeType as AllowedMimeType);
  const bytes = await storage.read(row.storageKey, maxBytes);
  if (!bytes) return null;
  return { bytes, mimeType: row.mimeType };
}

export async function deleteAsset(
  db: Database,
  storage: StorageDriver,
  actor: Actor,
  assetId: string,
): Promise<{ success: boolean; id: string }> {
  const row = await loadAuthorized(db, actor, assetId, "asset:write");
  await storage.remove(row.storageKey).catch(() => undefined);
  await deleteAssetRow(db, row.id);
  await insertAuditLog(db, {
    workspaceId: row.workspaceId,
    actorId: actor.userId,
    action: "asset.delete",
    entityType: "asset",
    entityId: row.id,
    metadata: { filename: row.filename, bytes: row.bytes },
  });
  return { success: true, id: row.id };
}

export interface StorageOverview {
  readonly totalBytes: number;
  readonly limitBytes: number;
  readonly usagePercent: number;
  readonly fileCount: number;
  readonly imageCount: number;
  readonly videoCount: number;
  readonly otherCount: number;
  readonly formattedUsed: string;
  readonly formattedLimit: string;
}

export async function getStorageOverview(
  db: Database,
  actor: Actor,
  workspaceId?: string,
): Promise<StorageOverview> {
  const isSuperAdmin = actor.systemRole === "owner";
  const targetWsId = workspaceId;
  if (targetWsId && !isSuperAdmin) {
    await requireCapability(db, actor, targetWsId, "asset:read");
  }

  const stats = await getStorageAggregate(db, targetWsId);
  const limitBytes = getStorageLimitBytes();
  const usagePercent =
    limitBytes > 0 ? Math.min(100, Math.round((stats.totalBytes / limitBytes) * 100)) : 0;

  return {
    totalBytes: stats.totalBytes,
    limitBytes,
    usagePercent,
    fileCount: stats.totalCount,
    imageCount: stats.imageCount,
    videoCount: stats.videoCount,
    otherCount: stats.otherCount,
    formattedUsed: formatBytes(stats.totalBytes),
    formattedLimit: formatBytes(limitBytes),
  };
}

export interface StorageAssetItem extends AssetSummary {
  readonly workspaceId: string;
  readonly storageKey: string;
  readonly url: string;
  readonly status: string;
}

export async function listAllStorageAssets(
  db: Database,
  actor: Actor,
  options: {
    workspaceId?: string;
    search?: string;
    type?: "all" | "image" | "video";
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: StorageAssetItem[]; total: number }> {
  const isSuperAdmin = actor.systemRole === "owner";
  const wsId = options.workspaceId;
  if (wsId && !isSuperAdmin) {
    await requireCapability(db, actor, wsId, "asset:read");
  }

  const rows = await listAllWorkspaceAssets(db, {
    workspaceId: wsId,
    search: options.search?.slice(0, 100),
    type: options.type,
    limit: options.limit ?? 200,
    offset: options.offset ?? 0,
  });

  const items: StorageAssetItem[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mimeType: r.mimeType,
    bytes: r.bytes,
    width: r.width,
    height: r.height,
    createdAt: r.createdAt,
    workspaceId: r.workspaceId,
    storageKey: r.storageKey,
    url: assetContentUrl(r.id),
    status: r.status,
  }));

  return { items, total: items.length };
}
