/**
 * Server-side facade for assets: binds the verified session user, DB and
 * storage so UI code, server actions and route handlers never forget authorization.
 */
import "server-only";
import { requireUser } from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/auth/errors";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import type { Actor } from "@/lib/auth/authorization";
import type { Database } from "@/lib/db/types";
import * as service from "./service";

async function context(): Promise<{ db: Database; actor: Actor }> {
  const user = await requireUser();
  return { db: await getDb(), actor: { userId: user.id } };
}

export async function beginUpload(
  workspaceId: string,
  file: { filename: unknown; mimeType: unknown; bytes: unknown },
) {
  const { db, actor } = await context();
  return service.initUpload(db, getStorage(), actor, { workspaceId, ...file });
}

export async function storeUploadContent(assetId: string, data: Uint8Array) {
  const { db, actor } = await context();
  return service.receiveContent(db, getStorage(), actor, assetId, data);
}

export async function completeUpload(assetId: string) {
  const { db, actor } = await context();
  return service.finalizeUpload(db, getStorage(), actor, assetId);
}

export async function searchAssets(workspaceId: string, search?: string) {
  const { db, actor } = await context();
  return service.listAssets(db, actor, workspaceId, search ? { search } : {});
}

/** Public delivery (capability URL): no session required. */
export async function readPublicAsset(assetId: string) {
  return service.getDeliverableAsset(await getDb(), getStorage(), assetId);
}

export { AssetNotFoundError, AssetRejectedError } from "./service";
export type { AssetSummary, UploadInit } from "./service";

/** Maps domain errors to messages that are safe to show; unknown errors are not leaked. */
export function describeAssetError(error: unknown): string {
  if (
    error instanceof service.AssetRejectedError ||
    error instanceof service.AssetNotFoundError ||
    error instanceof ForbiddenError
  ) {
    return error.message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}
