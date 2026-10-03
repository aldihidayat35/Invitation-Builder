"use server";

import { z } from "zod";
import {
  beginUpload,
  completeUpload,
  describeAssetError,
  searchAssets,
  type AssetSummary,
  type UploadInit,
} from "./api";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const idSchema = z.uuid();

function failure(error: unknown): { ok: false; error: string } {
  const known = error instanceof Error && error.name !== "Error";
  if (!known) console.error("asset action failed", error);
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
