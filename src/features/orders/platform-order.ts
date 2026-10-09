import "server-only";

import { getDb } from "@/lib/db/client";
import {
  createCustomerOrder,
  findCustomerOrderByIdempotencyKey,
} from "@/lib/db/repositories/orders";
import { findTemplateById, findTemplateBySlug } from "@/lib/db/repositories/templates";
import { getAppSettings } from "@/lib/db/repositories/settings";
import { insertAuditLog } from "@/lib/db/repositories/audit";

export class PlatformOrderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformOrderInputError";
  }
}

export interface PlatformOrderInput {
  idempotencyKey?: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  groomBrideNames?: string;
  templateId?: string;
  templateSlug?: string;
  templateTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  notes?: string;
}

export interface BuildPlatformOrderWhatsAppUrlParams {
  adminPhone: string;
  appName: string;
  orderId?: string;
  customerName: string;
  customerWhatsapp: string;
  templateTitle?: string;
  groomBrideNames?: string;
  eventDate?: string;
  eventLocation?: string;
  notes?: string;
}

/**
 * Normalizes phone number into international WhatsApp wa.me format (628...).
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  let clean = rawPhone.replace(/\D/g, "").trim();
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  } else if (!clean.startsWith("62") && clean.length > 0) {
    clean = "62" + clean;
  }
  return clean || "6281234567890";
}

/**
 * Builds direct WhatsApp URL with formatted Indonesian message for platform orders.
 */
export function buildPlatformOrderWhatsAppUrl(
  params: BuildPlatformOrderWhatsAppUrlParams,
): string {
  const cleanPhone = normalizeWhatsAppNumber(params.adminPhone);
  const appTitle = params.appName.trim().toUpperCase() || "UNDANGAN DIGITAL";

  const lines: string[] = [
    `*PESANAN BARU WEBSITE UNDANGAN - ${appTitle}*`,
    `Halo Admin, saya ingin memesan website undangan digital dengan rincian berikut:`,
    "",
    `• Nama Pemesan: ${params.customerName.trim()}`,
    `• Nomor WhatsApp: ${params.customerWhatsapp.trim()}`,
  ];

  if (params.groomBrideNames?.trim()) {
    lines.push(`• Nama Mempelai: ${params.groomBrideNames.trim()}`);
  }

  if (params.templateTitle?.trim()) {
    lines.push(`• Tema / Desain: ${params.templateTitle.trim()}`);
  }

  if (params.eventDate?.trim()) {
    lines.push(`• Tanggal Acara: ${params.eventDate.trim()}`);
  }

  if (params.eventLocation?.trim()) {
    lines.push(`• Lokasi Acara: ${params.eventLocation.trim()}`);
  }

  if (params.notes?.trim()) {
    lines.push(`• Catatan Khusus: ${params.notes.trim()}`);
  }

  if (params.orderId) {
    lines.push(`• Kode Referensi: #${params.orderId.slice(0, 8)}`);
  }

  lines.push("");
  lines.push("Mohon info langkah selanjutnya dan estimasi pengerjaannya. Terima kasih!");

  const text = lines.join("\n");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

import type { Database } from "@/lib/db/types";

/**
 * Creates a direct customer order originating from the main platform landing page or product detail page.
 */
export async function createPlatformOrder(
  data: PlatformOrderInput,
  database?: Database,
): Promise<{
  orderId: string;
  whatsappUrl: string;
  clientAccessToken?: string | null;
}> {
  const db = database ?? (await getDb());
  const settings = await getAppSettings(db);
  const adminPhone = settings.contactWhatsapp || "6281234567890";
  const appName = settings.appName || "Undangan.id";

  let resolvedTemplateId: string | null = null;
  let resolvedTemplateTitle: string | undefined = data.templateTitle?.trim();

  // Resolve template by ID if provided
  if (data.templateId) {
    const template = await findTemplateById(db, data.templateId);
    if (template) {
      resolvedTemplateId = template.id;
      resolvedTemplateTitle = template.name;
    }
  }

  // Resolve template by Slug if provided and ID was not found
  if (!resolvedTemplateId && data.templateSlug) {
    const template = await findTemplateBySlug(db, data.templateSlug);
    if (template) {
      resolvedTemplateId = template.id;
      resolvedTemplateTitle = template.name;
    }
  }

  const buildUrl = (orderId: string) =>
    buildPlatformOrderWhatsAppUrl({
      adminPhone,
      appName,
      orderId,
      customerName: data.customerName,
      customerWhatsapp: data.customerWhatsapp,
      templateTitle: resolvedTemplateTitle,
      groomBrideNames: data.groomBrideNames,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      notes: data.notes,
    });

  // Check idempotency if key provided
  if (data.idempotencyKey) {
    const existing = await findCustomerOrderByIdempotencyKey(db, data.idempotencyKey);
    if (existing) {
      return {
        orderId: existing.id,
        whatsappUrl: buildUrl(existing.id),
        clientAccessToken: existing.clientAccessToken,
      };
    }
  }

  const parsedDate = data.eventDate ? new Date(data.eventDate) : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

  try {
    const created = await createCustomerOrder(db, {
      sellerId: null,
      idempotencyKey: data.idempotencyKey ?? null,
      templateId: resolvedTemplateId,
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail?.trim() || null,
      customerWhatsapp: data.customerWhatsapp.trim(),
      groomBrideNames: data.groomBrideNames?.trim() || null,
      eventDate: validDate,
      eventLocation: data.eventLocation?.trim() || null,
      notes: data.notes?.trim() || null,
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: null,
      action: "order.create_direct",
      entityType: "customer_order",
      entityId: created.id,
      metadata: {
        platformDirect: true,
        templateId: resolvedTemplateId,
        templateTitle: resolvedTemplateTitle ?? null,
      },
    });

    return {
      orderId: created.id,
      whatsappUrl: buildUrl(created.id),
      clientAccessToken: created.clientAccessToken,
    };
  } catch (error) {
    if (data.idempotencyKey) {
      const racedOrder = await findCustomerOrderByIdempotencyKey(db, data.idempotencyKey);
      if (racedOrder) {
        return {
          orderId: racedOrder.id,
          whatsappUrl: buildUrl(racedOrder.id),
          clientAccessToken: racedOrder.clientAccessToken,
        };
      }
    }
    throw error;
  }
}
