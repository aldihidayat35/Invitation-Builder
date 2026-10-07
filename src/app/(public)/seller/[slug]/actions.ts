"use server";

import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { createCustomerOrder } from "@/lib/db/repositories/orders";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { buildCustomerOrderWhatsAppUrl } from "@/features/reseller/whatsapp";

const orderBookingSchema = z.object({
  sellerId: z.string().uuid("ID seller tidak valid"),
  agencyName: z.string().trim().min(1),
  sellerWhatsapp: z.string().trim().min(6),
  customerName: z.string().trim().min(2, "Nama lengkap pemesan minimal 2 karakter"),
  customerEmail: z.string().trim().email("Format email tidak valid"),
  customerWhatsapp: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit"),
  groomBrideNames: z.string().trim().optional(),
  templateId: z.string().uuid().optional().or(z.literal("")),
  templateTitle: z.string().trim().optional(),
  eventDate: z.string().trim().optional(),
  eventLocation: z.string().trim().optional(),
  notes: z.string().trim().optional(),
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
    sellerId: field(formData, "sellerId"),
    agencyName: field(formData, "agencyName"),
    sellerWhatsapp: field(formData, "sellerWhatsapp"),
    customerName: field(formData, "customerName"),
    customerEmail: field(formData, "customerEmail"),
    customerWhatsapp: field(formData, "customerWhatsapp"),
    groomBrideNames: field(formData, "groomBrideNames"),
    templateId: field(formData, "templateId"),
    templateTitle: field(formData, "templateTitle"),
    eventDate: field(formData, "eventDate"),
    eventLocation: field(formData, "eventLocation"),
    notes: field(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid" };
  }

  const data = parsed.data;
  const db = await getDb();

  try {
    const parsedDate = data.eventDate ? new Date(data.eventDate) : null;

    const created = await createCustomerOrder(db, {
      sellerId: data.sellerId,
      templateId: data.templateId ? data.templateId : null,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerWhatsapp: data.customerWhatsapp,
      groomBrideNames: data.groomBrideNames || null,
      eventDate: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null,
      eventLocation: data.eventLocation || null,
      notes: data.notes || null,
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: null,
      action: "order.create",
      entityType: "customer_order",
      entityId: created.id,
      metadata: {
        sellerId: data.sellerId,
        customerEmail: data.customerEmail,
        customerWhatsapp: data.customerWhatsapp,
      },
    });

    const whatsappUrl = buildCustomerOrderWhatsAppUrl({
      sellerPhone: data.sellerWhatsapp,
      agencyName: data.agencyName,
      orderId: created.id,
      customerName: data.customerName,
      customerWhatsapp: data.customerWhatsapp,
      templateTitle: data.templateTitle,
      groomBrideNames: data.groomBrideNames,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      notes: data.notes,
    });

    return {
      ok: true,
      orderId: created.id,
      whatsappUrl,
    };
  } catch (error) {
    const errText = error instanceof Error ? error.message : String(error);
    return { error: `Gagal mengirimkan formulir pesanan: ${errText}` };
  }
}
