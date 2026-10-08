"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClientForReseller } from "@/features/reseller/api";
import type { ActionState } from "@/features/reseller/types";

const createClientSchema = z.object({
  clientName: z.string().trim().min(2, "Nama minimal 2 karakter"),
  clientEmail: z.string().trim().email("Format email tidak valid").toLowerCase(),
  password: z.string().min(10, "Password minimal 10 karakter"),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = createClientSchema.safeParse({
    clientName: field(formData, "clientName"),
    clientEmail: field(formData, "clientEmail"),
    password: field(formData, "password"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Data klien tidak valid" };
  }

  try {
    const res = await createClientForReseller(parseResult.data);
    revalidatePath("/dashboard/reseller");
    revalidatePath("/dashboard/reseller/clients");
    return { ok: true, message: `Akun klien ${res.clientUser.name} berhasil dibuat.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("users_email_lower_uq") || msg.includes("unique")) {
      return { error: "Email sudah terdaftar di sistem. Gunakan email lain." };
    }
    return { error: `Gagal membuat klien: ${msg}` };
  }
}
