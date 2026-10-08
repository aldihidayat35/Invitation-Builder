"use server";

import { z } from "zod";
import {
  beginUpload,
  completeUpload,
  describeAssetError,
  fetchAllStorageAssets,
  fetchStorageOverview,
  removeAsset,
  searchAssets,
  type AssetSummary,
  type StorageAssetItem,
  type StorageOverview,
  type UploadInit,
} from "./api";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const idSchema = z.uuid();

function failure(error: unknown): { ok: false; error: string } {
  const known = error instanceof Error && error.name !== "Error";
  if (!known && process.env.NODE_ENV !== "test") console.error("asset action failed", error);
  return { ok: false, error: describeAssetError(error) };
}

export async function initUploadAction(
  workspaceId: string,
  file: { filename: string; mimeType: string; bytes: number },
): Promise<ActionResult<UploadInit>> {
  try {
    return { ok: true, data: await beginUpload(workspaceId, file) };
  } catch (error) {
    return failure(error);
  }
}

export async function finalizeUploadAction(assetId: string): Promise<ActionResult<AssetSummary>> {
  if (!idSchema.safeParse(assetId).success) return { ok: false, error: "Aset tidak valid." };
  try {
    return { ok: true, data: await completeUpload(assetId) };
  } catch (error) {
    return failure(error);
  }
}

export async function listAssetsAction(
  workspaceId: string,
  search?: string,
): Promise<ActionResult<AssetSummary[]>> {
  try {
    return { ok: true, data: await searchAssets(workspaceId, search) };
  } catch (error) {
    return failure(error);
  }
}

export async function saveAssetFromUrlAction(
  workspaceId: string,
  url: string,
  suggestedFilename?: string,
): Promise<ActionResult<AssetSummary>> {
  if (!idSchema.safeParse(workspaceId).success) return { ok: false, error: "Workspace tidak valid." };
  try {
    const { saveAssetFromUrl } = await import("./api");
    return { ok: true, data: await saveAssetFromUrl(workspaceId, url, suggestedFilename) };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAssetAction(
  assetId: string,
): Promise<ActionResult<{ success: boolean; id: string }>> {
  if (!idSchema.safeParse(assetId).success) return { ok: false, error: "Aset tidak valid." };
  try {
    return { ok: true, data: await removeAsset(assetId) };
  } catch (error) {
    return failure(error);
  }
}

export async function getStorageOverviewAction(
  workspaceId?: string,
): Promise<ActionResult<StorageOverview>> {
  if (workspaceId && !idSchema.safeParse(workspaceId).success) {
    return { ok: false, error: "Workspace tidak valid." };
  }
  try {
    return { ok: true, data: await fetchStorageOverview(workspaceId) };
  } catch (error) {
    return failure(error);
  }
}

export async function listAllStorageAssetsAction(options: {
  workspaceId?: string;
  search?: string;
  type?: "all" | "image" | "video";
  limit?: number;
  offset?: number;
} = {}): Promise<ActionResult<{ items: StorageAssetItem[]; total: number }>> {
  if (options.workspaceId && !idSchema.safeParse(options.workspaceId).success) {
    return { ok: false, error: "Workspace tidak valid." };
  }
  try {
    return { ok: true, data: await fetchAllStorageAssets(options) };
  } catch (error) {
    return failure(error);
  }
}
