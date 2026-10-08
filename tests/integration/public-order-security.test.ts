// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeUser } from "../helpers/world";
import { createWorkspaceWithOwner } from "@/lib/db/repositories/workspaces";
import { createResellerWithProfile, updateResellerStatus } from "@/lib/db/repositories/resellers";
import { listOrdersBySeller } from "@/lib/db/repositories/orders";
import { createTemplate, publishTemplate } from "@/features/templates/service";
import { templates } from "@/lib/db/schema";

vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }));

import { getDb } from "@/lib/db/client";
import { submitCustomerOrderAction } from "@/app/(public)/seller/[slug]/actions";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

function orderForm(input: {
  sellerSlug: string;
  idempotencyKey?: string;
  templateId?: string;
  email?: string;
}) {
  const form = new FormData();
  form.set("sellerSlug", input.sellerSlug);
  form.set("idempotencyKey", input.idempotencyKey ?? crypto.randomUUID());
  form.set("website", "");
  form.set("privacyConsent", "on");
  form.set("customerName", "Customer Aman");
  form.set("customerEmail", input.email ?? "customer-secure@example.test");
  form.set("customerWhatsapp", "081234567890");
  form.set("templateId", input.templateId ?? "");
  form.set("sellerId", crypto.randomUUID());
  form.set("sellerWhatsapp", "628000000000");
  return form;
}

beforeAll(async () => {
  conn = await createMigratedDb();
  vi.mocked(getDb).mockResolvedValue(db());
});

afterAll(async () => {
  await conn.close();
});

describe("public seller order security", () => {
  it("resolves trusted seller/template data and makes retries idempotent", async () => {
    const seller = await createResellerWithProfile(db(), {
      email: "trusted-seller@example.test",
      name: "Trusted Seller",
      agencyName: "Trusted Agency",
      slug: "trusted-agency",
      whatsappContact: "628111222333",
    });
    const owner = await makeUser(db(), "public-template-owner");
    const workspace = await createWorkspaceWithOwner(db(), {
      name: "Public Catalog",
      slug: "public-catalog-security",
      ownerUserId: owner.id,
    });
    const template = await createTemplate(
      db(),
      { userId: owner.id },
      { workspaceId: workspace.id, name: "Public Secure Template", document: fullDocument() },
    );
    await publishTemplate(
      db(),
      { userId: owner.id },
      {
        templateId: template.id,
        expectedRevision: template.revision,
      },
    );
    await db().update(templates).set({ isPublic: true }).where(eq(templates.id, template.id));

    const key = crypto.randomUUID();
    const first = await submitCustomerOrderAction(
      {},
      orderForm({ sellerSlug: seller.profile.slug, templateId: template.id, idempotencyKey: key }),
    );
    const retry = await submitCustomerOrderAction(
      {},
      orderForm({ sellerSlug: seller.profile.slug, templateId: template.id, idempotencyKey: key }),
    );

    expect(first.ok).toBe(true);
    expect(retry.orderId).toBe(first.orderId);
    expect(first.whatsappUrl).toContain("628111222333");
    expect(first.whatsappUrl).not.toContain("628000000000");
    expect(await listOrdersBySeller(db(), seller.profile.id)).toHaveLength(1);
  });

  it("rejects inactive sellers and unpublished templates", async () => {
    const seller = await createResellerWithProfile(db(), {
      email: "inactive-order-seller@example.test",
      name: "Inactive Seller",
      agencyName: "Inactive Agency",
      slug: "inactive-order-agency",
      whatsappContact: "628444555666",
    });
    const owner = await makeUser(db(), "draft-template-owner");
    const workspace = await createWorkspaceWithOwner(db(), {
      name: "Draft Catalog",
      slug: "draft-catalog-security",
      ownerUserId: owner.id,
    });
    const draft = await createTemplate(
      db(),
      { userId: owner.id },
      { workspaceId: workspace.id, name: "Draft Template", document: fullDocument() },
    );

    const draftResult = await submitCustomerOrderAction(
      {},
      orderForm({
        sellerSlug: seller.profile.slug,
        templateId: draft.id,
        email: "draft@example.test",
      }),
    );
    expect(draftResult.error).toMatch(/Template.*tidak tersedia/);

    await updateResellerStatus(db(), seller.profile.id, false);
    const inactiveResult = await submitCustomerOrderAction(
      {},
      orderForm({ sellerSlug: seller.profile.slug, email: "inactive@example.test" }),
    );
    expect(inactiveResult.error).toBe("Toko seller tidak tersedia.");
  });
});
