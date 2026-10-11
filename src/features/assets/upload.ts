import { finalizeUploadAction, initUploadAction } from "./actions";
import type { AssetSummary } from "./api";
import { optimizeImageBeforeUpload } from "./image-optimizer";

export async function uploadAssetFile(
  workspaceId: string,
  file: File,
): Promise<{ ok: true; asset: AssetSummary } | { ok: false; error: string }> {
  const processedFile = await optimizeImageBeforeUpload(file);
  const ext = processedFile.name.split(".").pop()?.toLowerCase() ?? "";

  let resolvedMime = processedFile.type;
  if (!resolvedMime || resolvedMime === "application/octet-stream") {
    if (ext === "mp3") resolvedMime = "audio/mpeg";
    else if (ext === "m4a") resolvedMime = "audio/mp4";
    else if (ext === "aac") resolvedMime = "audio/aac";
    else if (ext === "ogg" || ext === "oga") resolvedMime = "audio/ogg";
    else if (ext === "wav") resolvedMime = "audio/wav";
    else if (ext === "weba") resolvedMime = "audio/webm";
    else if (ext === "flac") resolvedMime = "audio/flac";
  }

  const init = await initUploadAction(workspaceId, {
    filename: processedFile.name,
    mimeType: resolvedMime,
    bytes: processedFile.size,
  });
  if (!init.ok) return init;

  let response: Response;
  try {
    response = await fetch(init.data.upload.url, {
      method: init.data.upload.method,
      headers: init.data.upload.headers,
      body: processedFile,
    });
  } catch {
    return { ok: false, error: "Upload gagal. Periksa koneksi." };
  }
  if (!response.ok) {
    let message = "Upload ditolak server.";
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    return { ok: false, error: message };
  }

  const done = await finalizeUploadAction(init.data.assetId);
  return done.ok ? { ok: true, asset: done.data } : done;
}

export async function uploadBlobAsAsset(
  workspaceId: string,
  blob: Blob,
  filename: string,
): Promise<{ ok: true; asset: AssetSummary } | { ok: false; error: string }> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  return uploadAssetFile(workspaceId, file);
}
