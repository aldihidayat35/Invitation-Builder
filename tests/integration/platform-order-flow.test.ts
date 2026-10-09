// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  createPlatformOrder,
  buildPlatformOrderWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/features/orders/platform-order";
import { getOrderDetail } from "@/features/orders/service";
import { updateAppSettings, getAppSettings } from "@/lib/db/repositories/settings";
import { listAllOrders } from "@/lib/db/repositories/orders";
import { seedDev } from "@/lib/db/seed";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
  await seedDev(conn.db);
});

afterAll(async () => {
  await conn.close();
});

describe("Platform Direct Order Flow & WhatsApp Integration", () => {
  it("normalizes Indonesian phone numbers into international WhatsApp format", () => {
    expect(normalizeWhatsAppNumber("081234567890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("6281234567890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("81234567890")).toBe("6281234567890");
  });

  it("builds a clean and structured WhatsApp order message URL", () => {
    const url = buildPlatformOrderWhatsAppUrl({
      adminPhone: "081234567890",
      appName: "Undangan.id",
      orderId: "c_1234567890abcdef",
      customerName: "Budi Santoso",
      customerWhatsapp: "081987654321",
      templateTitle: "Classic Floral",
      groomBrideNames: "Budi & Siti",
      eventDate: "2026-12-25",
      eventLocation: "Jakarta Selatan",
      notes: "Nuansa sage green",
    });

    expect(url).toContain("https://wa.me/6281234567890");
    expect(url).toContain(encodeURIComponent("*PESANAN BARU WEBSITE UNDANGAN - UNDANGAN.ID*"));
    expect(url).toContain(encodeURIComponent("• Nama Pemesan: Budi Santoso"));
    expect(url).toContain(encodeURIComponent("• Tema / Desain: Classic Floral"));
    expect(url).toContain(encodeURIComponent("• Nama Mempelai: Budi & Siti"));
    expect(url).toContain(encodeURIComponent("• Tanggal Acara: 2026-12-25"));
    expect(url).toContain(encodeURIComponent("• Lokasi Acara: Jakarta Selatan"));
    expect(url).toContain(encodeURIComponent("• Catatan Khusus: Nuansa sage green"));
  });

  it("creates a customer order with status 'new' and null sellerId, and generates clientAccessToken", async () => {
    const result = await createPlatformOrder(
      {
        customerName: "Ahmad Dahlan",
        customerWhatsapp: "081234567899",
        groomBrideNames: "Ahmad & Siti",
        templateTitle: "Royal Elegant",
        eventDate: "2026-11-20",
        notes: "Mohon konfirmasi secepatnya",
      },
      db(),
    );

    expect(result.orderId).toBeDefined();
    expect(result.whatsappUrl).toContain("https://wa.me/");
    expect(result.clientAccessToken).toBeDefined();
    expect(result.clientAccessToken).toMatch(/^c_/);

    const orders = await listAllOrders(db());
    const created = orders.find((o) => o.order.id === result.orderId);

    expect(created).toBeDefined();
    expect(created?.order.sellerId).toBeNull();
    expect(created?.order.customerName).toBe("Ahmad Dahlan");
    expect(created?.order.customerWhatsapp).toBe("081234567899");
    expect(created?.order.groomBrideNames).toBe("Ahmad & Siti");
    expect(created?.order.orderStatus).toBe("new");
    expect(created?.order.productionStatus).toBe("awaiting_client");
    expect(created?.seller).toBeNull();
  });

  it("dynamically picks up changed WhatsApp Admin number from app_settings", async () => {
    await updateAppSettings(db(), {
      contactWhatsapp: "6289988776655",
      appName: "Pernikahan Impian",
    });

    const result = await createPlatformOrder(
      {
        customerName: "Rian Pratama",
        customerWhatsapp: "081345678901",
        groomBrideNames: "Rian & Maya",
        templateTitle: "Modern Minimal",
      },
      db(),
    );

    expect(result.whatsappUrl).toContain("https://wa.me/6289988776655");
    expect(result.whatsappUrl).toContain(
      encodeURIComponent("*PESANAN BARU WEBSITE UNDANGAN - PERNIKAHAN IMPIAN*"),
    );
  });

  it("allows owner to view order details for platform direct orders with null sellerId", async () => {
    const result = await createPlatformOrder(
      {
        customerName: "Siti Rahma",
        customerWhatsapp: "081233445566",
        groomBrideNames: "Siti & Rudi",
        templateTitle: "Royal Elegant",
        notes: "Paket lengkap",
      },
      db(),
    );

    const ownerActor = { userId: "mock-owner-id", systemRole: "owner" as const };
    const detail = await getOrderDetail(db(), ownerActor, result.orderId);

    expect(detail).toBeDefined();
    expect(detail.order.id).toBe(result.orderId);
    expect(detail.order.customerName).toBe("Siti Rahma");
    expect(detail.order.sellerId).toBeNull();
    expect(detail.seller).toBeDefined();
    expect(detail.seller.agencyName).toBe("Platform Langsung (Website)");
  });

  it("allows owner to change master template and start studio project in 1-click", async () => {
    const { listPublicTemplates } = await import("@/lib/db/repositories/templates");
    const { changeOrderTemplate, createProjectForOrder } = await import("@/features/orders/service");
    const { findUserByEmail } = await import("@/lib/db/repositories/users");

    const adminUser = await findUserByEmail(db(), "admin@admin.com");
    expect(adminUser).toBeDefined();
    const ownerActor = { userId: adminUser!.id, systemRole: "owner" as const };

    const pubTemplates = await listPublicTemplates(db());
    expect(pubTemplates.length).toBeGreaterThan(1);

    const orderRes = await createPlatformOrder(
      {
        customerName: "Dian & Dimas",
        customerWhatsapp: "081299887766",
        groomBrideNames: "Dian & Dimas",
        templateTitle: pubTemplates[0].name,
      },
      db(),
    );

    // Ubah master template ke template kedua
    const targetTemplate = pubTemplates[1];
    const updatedOrder = await changeOrderTemplate(db(), ownerActor, orderRes.orderId, targetTemplate.id);
    expect(updatedOrder.templateId).toBe(targetTemplate.id);

    // Buat proyek studio (1-klik otomatis mengisi default workspace, assignee, dll)
    const projectRes = await createProjectForOrder(db(), ownerActor, orderRes.orderId);
    expect(projectRes.invitationId).toBeDefined();
    expect(projectRes.order.orderStatus).toBe("accepted");
    expect(projectRes.order.productionStatus).toBe("in_production");
  });
});

