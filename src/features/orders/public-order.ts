import "server-only";

import { getDb } from "@/lib/db/client";
import {
  createCustomerOrder,
  findCustomerOrderByIdempotencyKey,
} from "@/lib/db/repositories/orders";
import {
  findResellerProfileByCustomDomain,
  findResellerProfileBySlug,
} from "@/lib/db/repositories/resellers";
import { findTemplateById } from "@/lib/db/repositories/templates";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { buildCustomerOrderWhatsAppUrl } from "@/features/reseller/whatsapp";

export class PublicOrderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicOrderInputError";
  }
}

export interface TrustedPublicOrderInput {
  sellerSlug: string;
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  groomBrideNames?: string;
  templateId?: string;
  eventDate?: string;
  eventLocation?: string;
  notes?: string;
}

export async function createTrustedPublicOrder(
  data: TrustedPublicOrderInput,
): Promise<{ orderId: string; whatsappUrl: string }> {
  const db = await getDb();
  const seller =
    (await findResellerProfileBySlug(db, data.sellerSlug)) ??
    (await findResellerProfileByCustomDomain(db, data.sellerSlug));
  if (!seller?.isActive) {
    throw new PublicOrderInputError("Toko seller tidak tersedia.");
  }

  let templateTitle: string | undefined;
  if (data.templateId) {
    const template = await findTemplateById(db, data.templateId);
    if (
      !template ||
      template.status !== "published" ||
      !template.isPublic ||
      template.publishedVersionNo === null
    ) {
      throw new PublicOrderInputError("Template yang dipilih tidak tersedia.");
    }
    templateTitle = template.name;
  }

  const buildTrustedWhatsappUrl = (orderId: string) =>
    buildCustomerOrderWhatsAppUrl({
      sellerPhone: seller.whatsappContact,
      agencyName: seller.agencyName,
      orderId,
      customerName: data.customerName,
      customerWhatsapp: data.customerWhatsapp,
      templateTitle,
      groomBrideNames: data.groomBrideNames,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      notes: data.notes,
    });

  const existing = await findCustomerOrderByIdempotencyKey(db, data.idempotencyKey);
  if (existing) {
    return { orderId: existing.id, whatsappUrl: buildTrustedWhatsappUrl(existing.id) };
  }

  try {
    const parsedDate = data.eventDate ? new Date(data.eventDate) : null;
    const created = await createCustomerOrder(db, {
      sellerId: seller.id,
      idempotencyKey: data.idempotencyKey,
      templateId: data.templateId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerWhatsapp: data.customerWhatsapp,
      groomBrideNames: data.groomBrideNames || null,
      eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
      eventLocation: data.eventLocation || null,
      notes: data.notes || null,
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: null,
      action: "order.create",
      entityType: "customer_order",
      entityId: created.id,
      metadata: { sellerId: seller.id, templateId: data.templateId || null },
    });

    return { orderId: created.id, whatsappUrl: buildTrustedWhatsappUrl(created.id) };
  } catch (error) {
    const racedOrder = await findCustomerOrderByIdempotencyKey(db, data.idempotencyKey);
    if (racedOrder) {
      return { orderId: racedOrder.id, whatsappUrl: buildTrustedWhatsappUrl(racedOrder.id) };
    }
    throw error;
  }
}
