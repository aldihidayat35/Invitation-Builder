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

export async function saveAssetFromUrl(
  workspaceId: string,
  url: string,
  suggestedFilename?: string,
): Promise<service.AssetSummary> {
  const { db, actor } = await context();
  let bytes: Uint8Array;

  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma === -1) throw new service.AssetRejectedError("Data URL tidak valid.");
    const base64 = url.slice(comma + 1);
    bytes = new Uint8Array(Buffer.from(base64, "base64"));
  } else if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      bytes = new Uint8Array(arrayBuf);
    } catch {
      throw new service.AssetRejectedError("Gagal mengunduh berkas dari URL.");
    }
  } else {
    throw new service.AssetRejectedError(
      "Format URL tidak didukung (harus http, https, atau data URL).",
    );
  }

  if (bytes.byteLength === 0) {
    throw new service.AssetRejectedError("Berkas kosong.");
  }
  if (bytes.byteLength > 10 * 1024 * 1024) {
    throw new service.AssetRejectedError("Ukuran berkas melebihi batas 10MB.");
  }

  const { sniffImage } = await import("@/lib/storage/image-sniff");
  const sniffed = sniffImage(bytes);
  if (!sniffed) {
    throw new service.AssetRejectedError("Berkas bukan gambar atau GIF yang valid.");
  }

  const rawName = (suggestedFilename || url.split("/").pop()?.split("?")[0] || "animasi.gif")
    .replace(/[^\w.-]/g, "_")
    .slice(0, 100);
  const ext = sniffed.mime === "image/gif" ? "gif" : "png";
  const filename = rawName.toLowerCase().endsWith(`.${ext}`) ? rawName : `${rawName}.${ext}`;

  const init = await service.initUpload(db, getStorage(), actor, {
    workspaceId,
    filename,
    mimeType: sniffed.mime,
    bytes: bytes.byteLength,
  });

  await service.receiveContent(db, getStorage(), actor, init.assetId, bytes);
  return service.finalizeUpload(db, getStorage(), actor, init.assetId);
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
