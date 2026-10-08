"use server";

import { z } from "zod";
import { createTrustedPublicOrder, PublicOrderInputError } from "@/features/orders/public-order";
import { createRateLimiter } from "@/lib/rate-limit";

const orderLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

const orderBookingSchema = z.object({
  sellerSlug: z.string().trim().toLowerCase().min(1).max(253),
  idempotencyKey: z.string().uuid("Identitas permintaan tidak valid"),
  website: z.string().max(0, "Permintaan tidak valid"),
  privacyConsent: z.literal("on", "Persetujuan pemrosesan data wajib diberikan"),
  customerName: z.string().trim().min(2, "Nama lengkap pemesan minimal 2 karakter").max(120),
  customerEmail: z.string().trim().email("Format email tidak valid").max(254).toLowerCase(),
  customerWhatsapp: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit").max(30),
  groomBrideNames: z.string().trim().max(160).optional(),
  templateId: z.string().uuid().optional().or(z.literal("")),
  eventDate: z.string().trim().max(32).optional(),
  eventLocation: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export interface OrderBookingState {
  ok?: boolean;
  error?: string;
  orderId?: string;
  whatsappUrl?: string;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitCustomerOrderAction(
  _prev: OrderBookingState,
  formData: FormData,
): Promise<OrderBookingState> {
  const parsed = orderBookingSchema.safeParse({
    sellerSlug: field(formData, "sellerSlug"),
    idempotencyKey: field(formData, "idempotencyKey"),
    website: field(formData, "website"),
    privacyConsent: field(formData, "privacyConsent"),
    customerName: field(formData, "customerName"),
    customerEmail: field(formData, "customerEmail"),
    customerWhatsapp: field(formData, "customerWhatsapp"),
    groomBrideNames: field(formData, "groomBrideNames"),
    templateId: field(formData, "templateId"),
    eventDate: field(formData, "eventDate"),
    eventLocation: field(formData, "eventLocation"),
    notes: field(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid" };
  }

  const data = parsed.data;
  const rateKey = `${data.sellerSlug}|${data.customerEmail}|${data.customerWhatsapp.replace(/\D/g, "")}`;
  const gate = orderLimiter.check(rateKey);
  if (!gate.allowed) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${gate.retryAfterSeconds} detik.` };
  }

  try {
    const result = await createTrustedPublicOrder({
      ...data,
      templateId: data.templateId || undefined,
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof PublicOrderInputError) return { error: error.message };
    return { error: "Pesanan belum dapat diproses. Silakan coba kembali." };
  }
}
