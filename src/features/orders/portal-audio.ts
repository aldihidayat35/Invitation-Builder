import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import { insertAsset, markAssetReady } from "@/lib/db/repositories/assets";
import { assetUrl } from "@/features/assets/urls";
import { sniffAudio } from "@/lib/storage/audio-sniff";
import {
  getClientPortalDataByToken,
  ensureOrderInvitation,
} from "./service";

export const AUDIO_EXTS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
};

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB

export interface ProcessAudioUploadResult {
  ok: boolean;
  error?: string;
  data?: {
    assetId: string;
    url: string;
    filename: string;
  };
}

export async function processPortalAudioUpload(
  token: string,
  file: File,
): Promise<ProcessAudioUploadResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses portal tidak valid." };
  }

  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Berkas audio tidak ditemukan." };
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, error: "Ukuran berkas audio maksimal 20MB." };
  }

  try {
    const db = await getDb();
    const portal = await getClientPortalDataByToken(db, cleanToken);
    if (!portal) {
      return { ok: false, error: "Sesi portal tidak valid." };
    }

    let invitation = portal.invitation;
    if (!invitation) {
      if (portal.order?.templateId) {
        invitation = await ensureOrderInvitation(db, portal.order);
      }
      if (!invitation) {
        return { ok: false, error: "Proyek undangan belum siap atau template belum ditentukan." };
      }
    }

    const workspaceId = invitation.workspaceId || portal.order?.workspaceId;
    if (!workspaceId) {
      return { ok: false, error: "Workspace pesanan tidak ditemukan." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.byteLength === 0) {
      return { ok: false, error: "Berkas audio kosong." };
    }

    const sniffed = sniffAudio(bytes);
    if (!sniffed) {
      return {
        ok: false,
        error: "Berkas bukan format audio yang didukung (MP3, WAV, M4A, AAC, OGG).",
      };
    }

    const assetId = randomUUID();
    const ext = AUDIO_EXTS[sniffed.mime] || "mp3";
    const storageKey = `ws/${workspaceId}/${assetId}.${ext}`;

    const storage = getStorage();
    await storage.put(storageKey, bytes, sniffed.mime);

    const safeFilename = (file.name || `audio.${ext}`).replace(/[^\w.-]/g, "_").slice(0, 100);

    await insertAsset(db, {
      id: assetId,
      workspaceId,
      filename: safeFilename,
      mimeType: sniffed.mime,
      bytes: bytes.byteLength,
      storageKey,
      uploadedBy: portal.order?.clientUserId ?? undefined,
    });

    await markAssetReady(db, assetId, {
      mimeType: sniffed.mime,
      bytes: bytes.byteLength,
    });

    revalidatePath(`/c/${cleanToken}`);
    revalidatePath(`/portal/${cleanToken}`);

    return {
      ok: true,
      data: {
        assetId,
        url: assetUrl(assetId),
        filename: safeFilename,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengunggah berkas audio.",
    };
  }
}
