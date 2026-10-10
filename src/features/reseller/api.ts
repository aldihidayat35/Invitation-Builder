import "server-only";

import { requireReseller } from "@/lib/auth/server";
import { assertPasswordPolicy, hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  createResellerClient,
  findResellerProfileByCustomDomain,
  findResellerProfileBySlug,
  findResellerProfileByUserId,
  updateResellerBranding,
  type UpdateResellerBrandingInput,
} from "@/lib/db/repositories/resellers";
import {
  getSellerOrderStats,
  listOrdersBySeller,
  getOrderTrends,
} from "@/lib/db/repositories/orders";
import { listUsersByReseller } from "@/lib/db/repositories/users";
import { listPublicTemplates } from "@/lib/db/repositories/templates";
import type { ResellerClientItem, ResellerOrderItem, ResellerOverviewStats } from "./types";
import {
  newDomainVerificationToken,
  normalizeCustomDomain,
  verifyResellerDomain,
} from "./domain-service";

/** Fetches dashboard summary statistics for the authenticated reseller. */
export async function getResellerOverview(): Promise<ResellerOverviewStats> {
  const { profile, user } = await requireReseller();
  const db = await getDb();

  const [clients, orderStats] = await Promise.all([
    listUsersByReseller(db, user.id),
    getSellerOrderStats(db, profile.id),
  ]);

  return {
    totalOrders: orderStats.totalOrders,
    newOrders: orderStats.newOrders,
    inProgressOrders: orderStats.inProgressOrders,
    completedOrders: orderStats.completedOrders,
    totalClients: clients.length,
    agencyName: profile.agencyName,
    slug: profile.slug,
    customDomain: profile.customDomain,
    domainStatus: profile.domainStatus,
    domainVerificationToken: profile.domainVerificationToken,
    domainVerifiedAt: profile.domainVerifiedAt,
    domainLastCheckedAt: profile.domainLastCheckedAt,
    tlsStatus: profile.tlsStatus,
  };
}

/** Fetches order volume trends for the authenticated reseller's storefront. */
export async function getResellerOrderTrends(days: number = 14) {
  const { profile } = await requireReseller();
  const db = await getDb();
  return getOrderTrends(db, { sellerId: profile.id, days });
}

/** Lists all customer orders received via this seller's storefront. */
export async function getResellerOrders(limit: number = 100): Promise<ResellerOrderItem[]> {
  const { profile } = await requireReseller();
  const db = await getDb();

  const orders = await listOrdersBySeller(db, profile.id, limit);
  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerWhatsapp: o.customerWhatsapp,
    groomBrideNames: o.groomBrideNames,
    eventDate: o.eventDate,
    eventLocation: o.eventLocation,
    status: o.orderStatus,
    productionStatus: o.productionStatus,
    paymentStatus: o.paymentStatus,
    notes: o.notes,
    adminNotes: o.adminNotes,
    clientAccessToken: o.clientAccessToken,
    createdAt: o.createdAt,
  }));
}

/** Lists all clients / customer orders under this reseller agency. */
export async function getResellerClientsList(): Promise<ResellerClientItem[]> {
  const { user, profile } = await requireReseller();
  const db = await getDb();

  const orders = await listOrdersBySeller(db, profile.id, 100);
  const orderClients: ResellerClientItem[] = orders.map((o) => ({
    id: o.id,
    name: o.customerName + (o.groomBrideNames ? ` (${o.groomBrideNames})` : ""),
    email: o.customerEmail,
    whatsapp: o.customerWhatsapp,
    clientAccessToken: o.clientAccessToken,
    status: o.productionStatus.replaceAll("_", " "),
    createdAt: o.createdAt,
  }));

  const legacyClients = await listUsersByReseller(db, user.id);
  const legacyClientItems: ResellerClientItem[] = legacyClients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    whatsapp: null,
    clientAccessToken: null,
    status: c.status,
    createdAt: c.createdAt,
  }));

  return [...orderClients, ...legacyClientItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Creates a client under this reseller. */
export async function createClientForReseller(input: {
  clientName: string;
  clientEmail: string;
  password: string;
}) {
  const { user } = await requireReseller();
  const db = await getDb();

  const effectivePassword = input.password.trim();
  assertPasswordPolicy(effectivePassword);
  const passwordHash = await hashPassword(effectivePassword);

  const slug = `client-${Date.now().toString(36)}`;

  const result = await createResellerClient(db, {
    resellerUserId: user.id,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    passwordHash,
    workspaceName: `${input.clientName} Workspace`,
    workspaceSlug: slug,
  });

  await insertAuditLog(db, {
    workspaceId: result.workspace.id,
    actorId: user.id,
    action: "reseller.client_create",
    entityType: "user",
    entityId: result.clientUser.id,
    metadata: {
      clientEmail: result.clientUser.email,
      workspaceSlug: slug,
    },
  });

  return result;
}

/** Fetches reseller profile for branding & storefront settings. */
export async function getResellerBrandingProfile() {
  const { profile } = await requireReseller();
  return {
    id: profile.id,
    agencyName: profile.agencyName,
    slug: profile.slug,
    whatsappContact: profile.whatsappContact,
    logoUrl: profile.logoUrl,
    brandColor: profile.brandColor,
    customDomain: profile.customDomain,
    heroImageUrl: profile.heroImageUrl,
    heroTitle: profile.heroTitle,
    heroSubtitle: profile.heroSubtitle,
    heroBadge: profile.heroBadge,
    domainStatus: profile.domainStatus,
    domainVerificationToken: profile.domainVerificationToken,
    domainVerifiedAt: profile.domainVerifiedAt,
    domainLastCheckedAt: profile.domainLastCheckedAt,
    tlsStatus: profile.tlsStatus,
    tlsActivatedAt: profile.tlsActivatedAt,
  };
}

/** Updates reseller agency branding & storefront settings. */
export async function updateAgencyBranding(input: UpdateResellerBrandingInput) {
  const { profile, user } = await requireReseller();
  const db = await getDb();

  const normalizedDomain = input.customDomain ? normalizeCustomDomain(input.customDomain) : null;
  const domainChanged = normalizedDomain !== profile.customDomain;
  const updated = await updateResellerBranding(db, profile.id, {
    ...input,
    customDomain: normalizedDomain,
    ...(domainChanged && {
      domainStatus: normalizedDomain ? "pending" : "unconfigured",
      domainVerificationToken: normalizedDomain ? newDomainVerificationToken() : null,
      domainVerifiedAt: null,
      domainLastCheckedAt: null,
      tlsStatus: normalizedDomain ? "pending" : "unconfigured",
      tlsActivatedAt: null,
    }),
  });

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: user.id,
    action: "reseller.update",
    entityType: "reseller_profile",
    entityId: profile.id,
    metadata: { type: "branding_update", agencyName: input.agencyName },
  });

  return updated;
}

export async function verifyOwnCustomDomain() {
  const { profile, user } = await requireReseller();
  const db = await getDb();
  const updated = await verifyResellerDomain(
    db,
    { userId: user.id, systemRole: user.systemRole },
    profile.id,
  );
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: user.id,
    action: "reseller.update",
    entityType: "reseller_domain",
    entityId: profile.id,
    metadata: { type: "domain_verification", status: updated.domainStatus },
  });
  return updated;
}

/** Fetches agency branding details for client display (white-label badge & support). */
export async function getClientAgencyBranding(resellerUserId: string, dbOverride?: Database) {
  const db = dbOverride ?? (await getDb());
  const profile = await findResellerProfileByUserId(db, resellerUserId);
  if (!profile || !profile.isActive) return null;
  return {
    agencyName: profile.agencyName,
    whatsappContact: profile.whatsappContact,
    logoUrl: profile.logoUrl,
    brandColor: profile.brandColor,
    customDomain: profile.customDomain,
  };
}

export async function getPublicSellerStorefront(identifier: string) {
  const db = await getDb();
  const profile =
    (await findResellerProfileBySlug(db, identifier)) ??
    (await findResellerProfileByCustomDomain(db, identifier));
  if (!profile?.isActive) return null;
  const templates = await listPublicTemplates(db);
  return {
    profile: {
      id: profile.id,
      agencyName: profile.agencyName,
      slug: profile.slug,
      whatsappContact: profile.whatsappContact,
      logoUrl: profile.logoUrl,
      brandColor: profile.brandColor,
      customDomain: profile.customDomain,
      heroImageUrl: profile.heroImageUrl,
      heroTitle: profile.heroTitle,
      heroSubtitle: profile.heroSubtitle,
      heroBadge: profile.heroBadge,
    },
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      category: t.category,
      style: t.style,
      thumbnailUrl: t.thumbnailUrl,
      previewMockupUrl: t.previewMockupUrl,
      price: t.price,
      tier: t.tier,
      status: t.status,
      metadata: t.metadata,
      tags: t.tags,
    })),
  };
}
