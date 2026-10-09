"use server";

import { z } from "zod";
import { createPlatformOrder, PlatformOrderInputError } from "@/features/orders/platform-order";
import { createRateLimiter } from "@/lib/rate-limit";
import { randomUUID } from "node:crypto";

const orderLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const platformOrderSchema = z.object({
  idempotencyKey: z.string().optional(),
  website: z.string().max(0, "Permintaan tidak valid"),
  customerName: z.string().trim().min(2, "Nama pemesan minimal 2 karakter").max(120),
  customerWhatsapp: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit").max(30),
  customerEmail: z.string().trim().email("Format email tidak valid").max(254).optional().or(z.literal("")),
  groomBrideNames: z.string().trim().max(160).optional(),
  templateId: z.string().optional().or(z.literal("")),
  templateSlug: z.string().optional().or(z.literal("")),
  templateTitle: z.string().optional().or(z.literal("")),
  eventDate: z.string().trim().max(32).optional(),
  eventLocation: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export interface PlatformOrderActionState {
  ok?: boolean;
  error?: string;
  orderId?: string;
  whatsappUrl?: string;
  clientAccessToken?: string | null;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitPlatformOrderAction(
  _prev: PlatformOrderActionState,
  formData: FormData,
): Promise<PlatformOrderActionState> {
  const parsed = platformOrderSchema.safeParse({
    idempotencyKey: field(formData, "idempotencyKey") || randomUUID(),
    website: field(formData, "website"),
    customerName: field(formData, "customerName"),
    customerWhatsapp: field(formData, "customerWhatsapp"),
    customerEmail: field(formData, "customerEmail"),
    groomBrideNames: field(formData, "groomBrideNames"),
    templateId: field(formData, "templateId"),
    templateSlug: field(formData, "templateSlug"),
    templateTitle: field(formData, "templateTitle"),
    eventDate: field(formData, "eventDate"),
    eventLocation: field(formData, "eventLocation"),
    notes: field(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pesanan belum lengkap atau tidak valid." };
  }

  const data = parsed.data;
  const cleanPhone = data.customerWhatsapp.replace(/\D/g, "");
  const rateKey = `platform|${cleanPhone}`;
  const gate = orderLimiter.check(rateKey);
  if (!gate.allowed) {
    return { error: `Terlalu banyak permintaan. Silakan coba kembali dalam ${gate.retryAfterSeconds} detik.` };
  }

  try {
    const result = await createPlatformOrder({
      idempotencyKey: data.idempotencyKey,
      customerName: data.customerName,
      customerWhatsapp: data.customerWhatsapp,
      customerEmail: data.customerEmail || undefined,
      groomBrideNames: data.groomBrideNames || undefined,
      templateId: data.templateId || undefined,
      templateSlug: data.templateSlug || undefined,
      templateTitle: data.templateTitle || undefined,
      eventDate: data.eventDate || undefined,
      eventLocation: data.eventLocation || undefined,
      notes: data.notes || undefined,
    });

    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof PlatformOrderInputError) return { error: error.message };
    console.error("[submitPlatformOrderAction] Failed:", error);
    return { error: "Pesanan belum dapat disimpan saat ini. Silakan coba lagi atau hubungi admin langsung via WhatsApp." };
  }
}
