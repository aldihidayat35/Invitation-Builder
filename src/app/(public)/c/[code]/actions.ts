"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addPortalGuest,
  archivePortalGuest,
  savePortalInvitationData,
  savePortalShareMessage,
  savePortalGallery,
  savePortalAudio,
  submitPortalDecision,
} from "@/features/orders";
import {
  getClientPortalDataByToken,
  ensureOrderInvitation,
  type PortalAudioSettings,
} from "@/features/orders/service";
import { getDb } from "@/lib/db/client";
import { insertAsset, markAssetReady } from "@/lib/db/repositories/assets";
import { getStorage } from "@/lib/storage";
import { sniffImage } from "@/lib/storage/image-sniff";
import { sniffAudio } from "@/lib/storage/audio-sniff";
import { EXTENSIONS_BY_MIME, type AllowedMimeType } from "@/lib/schema";
import { assetUrl } from "@/features/assets/urls";

export interface PortalActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface PortalUploadResult {
  ok: boolean;
  error?: string;
  data?: {
    assetId: string;
    url: string;
    filename: string;
    width?: number | null;
    height?: number | null;
  };
}

const decisionSchema = z.object({
  token: z.string().trim().min(1, "Token tidak valid."),
  decision: z.enum(["approve", "request_revision"]),
  note: z.string().optional(),
});

export async function submitPortalDecisionAction(
  _prev: PortalActionResult,
  formData: FormData,
): Promise<PortalActionResult> {
  const parsed = decisionSchema.safeParse({
    token: formData.get("token"),
    decision: formData.get("decision"),
    note: formData.get("note")?.toString().trim() || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  try {
    await submitPortalDecision(parsed.data.token, parsed.data.decision, parsed.data.note);
    revalidatePath(`/c/${parsed.data.token}`);
    revalidatePath(`/portal/${parsed.data.token}`);
    return {
      ok: true,
      message:
        parsed.data.decision === "approve"
          ? "Undangan berhasil disetujui! Tim produksi akan segera menerbitkannya."
          : "Catatan revisi berhasil dikirim ke tim produksi.",
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal memproses keputusan." };
  }
}

const addGuestSchema = z.object({
  token: z.string().trim().min(1, "Token tidak valid."),
  name: z.string().trim().min(1, "Nama tamu wajib diisi.").max(120),
  maxParty: z.coerce.number().int().min(1).max(20).default(1),
});

export async function addPortalGuestAction(
  _prev: PortalActionResult,
  formData: FormData,
): Promise<PortalActionResult> {
  const parsed = addGuestSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    maxParty: formData.get("maxParty"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nama tamu tidak valid." };
  }

  try {
    await addPortalGuest(parsed.data.token, {
      name: parsed.data.name,
      maxParty: parsed.data.maxParty,
    });
    revalidatePath(`/c/${parsed.data.token}`);
    revalidatePath(`/portal/${parsed.data.token}`);
    return { ok: true, message: `Tamu "${parsed.data.name}" berhasil ditambahkan.` };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menambahkan tamu." };
  }
}

const archiveGuestSchema = z.object({
  token: z.string().trim().min(1, "Token tidak valid."),
  guestId: z.string().uuid("ID tamu tidak valid."),
});

export async function archivePortalGuestAction(
  _prev: PortalActionResult,
  formData: FormData,
): Promise<PortalActionResult> {
  const parsed = archiveGuestSchema.safeParse({
    token: formData.get("token"),
    guestId: formData.get("guestId"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  try {
    await archivePortalGuest(parsed.data.token, parsed.data.guestId);
    revalidatePath(`/c/${parsed.data.token}`);
    revalidatePath(`/portal/${parsed.data.token}`);
    return { ok: true, message: "Tamu berhasil dihapus dari daftar." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menghapus tamu." };
  }
}

export async function savePortalInvitationDataAction(
  token: string,
  values: Record<string, string>,
): Promise<PortalActionResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses tidak valid." };
  }

  try {
    const res = await savePortalInvitationData(cleanToken, values);
    revalidatePath(`/c/${cleanToken}`);
    revalidatePath(`/portal/${cleanToken}`);
    return {
      ok: true,
      message: "Data undangan berhasil disimpan.",
      errors: res.errors,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan data undangan.",
    };
  }
}

export async function savePortalGalleryAction(
  token: string,
  items: { assetId?: string; src?: string; alt?: string }[],
  enabled?: boolean,
): Promise<PortalActionResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses tidak valid." };
  }

  try {
    const res = await savePortalGallery(cleanToken, items, enabled);
    revalidatePath(`/c/${cleanToken}`);
    revalidatePath(`/portal/${cleanToken}`);
    if (res.slug) {
      revalidatePath(`/i/${res.slug}`);
    }
    return {
      ok: true,
      message: `Galeri foto (${res.count} foto) berhasil disimpan.`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan galeri foto.",
    };
  }
}

export async function savePortalShareMessageAction(
  token: string,
  templateText: string,
): Promise<PortalActionResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses tidak valid." };
  }

  if (!templateText.trim()) {
    return { ok: false, error: "Format pesan tidak boleh kosong." };
  }

  try {
    const res = await savePortalShareMessage(cleanToken, templateText);
    revalidatePath(`/c/${cleanToken}`);
    revalidatePath(`/portal/${cleanToken}`);
    return {
      ok: true,
      message: res.message || "Format pesan undangan berhasil disimpan.",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan format pesan.",
    };
  }
}

export async function uploadPortalAssetAction(
  token: string,
  formData: FormData,
): Promise<PortalUploadResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses portal tidak valid." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Berkas tidak ditemukan." };
  }

  const MAX_BYTES = 15 * 1024 * 1024; // 15MB
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Ukuran berkas maksimal 15MB." };
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
      return { ok: false, error: "Berkas gambar kosong." };
    }

    const sniffed = sniffImage(bytes);
    if (!sniffed) {
      return {
        ok: false,
        error: "Berkas bukan format gambar yang didukung (JPEG, PNG, WebP, AVIF, GIF).",
      };
    }

    const assetId = randomUUID();
    const exts = EXTENSIONS_BY_MIME[sniffed.mime as AllowedMimeType];
    const ext = exts?.[0] || "jpg";
    const storageKey = `ws/${workspaceId}/${assetId}.${ext}`;

    const storage = getStorage();
    await storage.put(storageKey, bytes, sniffed.mime);

    const safeFilename = (file.name || `foto.${ext}`).replace(/[^\w.-]/g, "_").slice(0, 100);

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
      width: sniffed.width,
      height: sniffed.height,
    });

    revalidatePath(`/c/${cleanToken}`);
    revalidatePath(`/portal/${cleanToken}`);

    return {
      ok: true,
      data: {
        assetId,
        url: assetUrl(assetId),
        filename: safeFilename,
        width: sniffed.width,
        height: sniffed.height,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengunggah gambar.",
    };
  }
}

export async function savePortalAudioAction(
  token: string,
  audioSettings: PortalAudioSettings,
): Promise<PortalActionResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses portal tidak valid." };
  }

  try {
    const res = await savePortalAudio(cleanToken, audioSettings);
    revalidatePath(`/c/${cleanToken}`);
    revalidatePath(`/portal/${cleanToken}`);
    if (res.slug) {
      revalidatePath(`/i/${res.slug}`);
    }
    return {
      ok: true,
      message: audioSettings.enabled
        ? `Pengaturan musik latar "${audioSettings.title || "Lagu Pilihan"}" berhasil disimpan.`
        : "Musik latar berhasil dinonaktifkan.",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan musik latar.",
    };
  }
}

const AUDIO_EXTS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
};

export async function uploadPortalAudioAssetAction(
  token: string,
  formData: FormData,
): Promise<PortalUploadResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "Token akses portal tidak valid." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Berkas audio tidak ditemukan." };
  }

  const MAX_BYTES = 20 * 1024 * 1024; // 20MB
  if (file.size > MAX_BYTES) {
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


