import { uploadPortalAudioAssetAction } from "../actions";

export interface PortalAudioUploadResponse {
  ok: boolean;
  error?: string;
  data?: {
    assetId: string;
    url: string;
    filename: string;
  };
}

/**
 * Robust audio uploader for client portal.
 * Uses direct REST Route Handler (`/api/portal/upload-audio`) first to bypass
 * Next.js Server Action 1MB body limit and avoid RSC React Error #441 on large audio files.
 * Automatically falls back to Server Action if needed.
 */
export async function uploadPortalAudioClient(
  token: string,
  file: File,
): Promise<PortalAudioUploadResponse> {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("file", file);

  // 1. Try dedicated API Route Handler
  try {
    const res = await fetch("/api/portal/upload-audio", {
      method: "POST",
      body: formData,
    });

    if (res.status === 413) {
      return { ok: false, error: "Ukuran berkas musik melebihi batas maksimal (20MB)." };
    }

    const json = (await res.json().catch(() => null)) as PortalAudioUploadResponse | null;
    if (json && typeof json.ok === "boolean") {
      if (!json.ok && json.error?.includes("Minified React error")) {
        return {
          ok: false,
          error: "Gagal mengunggah berkas musik. Pastikan format audio MP3/WAV/M4A dan ukuran maksimal 20MB.",
        };
      }
      return json;
    }

    if (!res.ok) {
      return { ok: false, error: `Gagal mengunggah musik (HTTP ${res.status}).` };
    }
  } catch (routeErr) {
    console.warn("Direct API route upload failed, trying server action fallback:", routeErr);
  }

  // 2. Fallback to Server Action
  try {
    const serverRes = await uploadPortalAudioAssetAction(token, formData);
    if (!serverRes.ok && serverRes.error?.includes("Minified React error")) {
      return {
        ok: false,
        error: "Gagal mengunggah berkas musik. Pastikan berkas berformat MP3, WAV, atau M4A dan ukuran maksimal 20MB.",
      };
    }
    return serverRes;
  } catch (actionErr: unknown) {
    console.error("Audio upload failed:", actionErr);
    const msg =
      actionErr instanceof Error && !actionErr.message.includes("Minified React error")
        ? actionErr.message
        : "Gagal mengunggah berkas musik. Pastikan berkas berformat MP3, WAV, atau M4A dan ukuran maksimal 20MB.";
    return { ok: false, error: msg };
  }
}
