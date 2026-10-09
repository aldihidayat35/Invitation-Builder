"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addPortalGuest,
  archivePortalGuest,
  savePortalInvitationData,
  submitPortalDecision,
} from "@/features/orders";

export interface PortalActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
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

