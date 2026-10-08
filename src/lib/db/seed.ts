/**
 * Idempotent dev seed: one dev user, one dev workspace (+owner), one empty template.
 * Uses repositories only; contains no client data.
 */
import { eq } from "drizzle-orm";
import { assertPasswordPolicy, hashPassword } from "../auth/password";
import { createEmptyDocument } from "../schema/document";
import { templateCategories, templates, users, workspaceMembers } from "./schema";
import {
  createResellerClient,
  createResellerWithProfile,
} from "./repositories/resellers";
import { findTemplateByName, insertTemplate } from "./repositories/templates";
import {
  findUserByEmail,
  insertUser,
  setInitialPasswordHash,
  updateUserRole,
} from "./repositories/users";
import { createWorkspaceWithOwner, findWorkspaceBySlug } from "./repositories/workspaces";
import type { Database } from "./types";

export const ADMIN_USER_EMAIL = "admin@admin.com";
export const ADMIN_DEFAULT_PASSWORD = "admin123";
export const DEV_USER_EMAIL = ADMIN_USER_EMAIL;
export const DEV_WORKSPACE_SLUG = "dev-workspace";
export const DEV_TEMPLATE_NAME = "Empty Template";
export const DEMO_RESELLER_EMAIL = "reseller@example.test";
export const DEMO_RESELLER_SLUG = "mitra-berkah";
export const DEMO_CLIENT_EMAIL = "client@example.test";
export const DEMO_CLIENT_SLUG = "klien-berkah";

export interface SeedResult {
  userId: string;
  adminUserId?: string;
  workspaceId: string;
  templateId: string;
  resellerUserId?: string;
  clientUserId?: string;
}

export interface SeedOptions {
  email?: string;
  name?: string;
  password?: string;
  withDemoReseller?: boolean;
}

export async function seedDev(db: Database, options: SeedOptions = {}): Promise<SeedResult> {
  const adminEmail = options.email ?? ADMIN_USER_EMAIL;
  const adminName = options.name ?? "Super Admin";
  const password = options.password ?? ADMIN_DEFAULT_PASSWORD;

  // Clean up old dev@example.test user if migrating to admin@admin.com so exactly 1 owner exists
  if (adminEmail === ADMIN_USER_EMAIL) {
    const oldDev = await findUserByEmail(db, "dev@example.test");
    const currentAdmin = await findUserByEmail(db, ADMIN_USER_EMAIL);
    if (oldDev && !currentAdmin) {
      await db
        .update(users)
        .set({ email: ADMIN_USER_EMAIL, name: adminName, updatedAt: new Date() })
        .where(eq(users.id, oldDev.id));
    } else if (oldDev && currentAdmin && oldDev.id !== currentAdmin.id) {
      await db.update(templates).set({ createdBy: currentAdmin.id }).where(eq(templates.createdBy, oldDev.id));
      await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, oldDev.id));
      await db.delete(users).where(eq(users.id, oldDev.id));
    }
  }

  const user =
    (await findUserByEmail(db, adminEmail)) ??
    (await insertUser(db, {
      email: adminEmail,
      name: adminName,
      passwordHash: null,
      systemRole: "owner",
    }));

  if (user.systemRole !== "owner") {
    await updateUserRole(db, user.id, "owner");
  }

  if (password) {
    assertPasswordPolicy(password);
    const hash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash: hash, status: "active", updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const workspace =
    (await findWorkspaceBySlug(db, DEV_WORKSPACE_SLUG)) ??
    (await createWorkspaceWithOwner(db, {
      name: "Dev Workspace",
      slug: DEV_WORKSPACE_SLUG,
      ownerUserId: user.id,
    }));

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    })
    .onConflictDoNothing();

  const template =
    (await findTemplateByName(db, workspace.id, DEV_TEMPLATE_NAME)) ??
    (await insertTemplate(db, {
      workspaceId: workspace.id,
      name: DEV_TEMPLATE_NAME,
      draftDocument: createEmptyDocument(),
      createdBy: user.id,
    }));

  const defaultCategories = [
    { slug: "wedding", name: "Pernikahan (Wedding)", description: "Undangan akad dan resepsi pernikahan", sortOrder: 1 },
    { slug: "engagement", name: "Tunangan (Engagement)", description: "Undangan lamaran dan pertunangan", sortOrder: 2 },
    { slug: "birthday", name: "Ulang Tahun (Birthday)", description: "Undangan pesta ulang tahun & sweet seventeen", sortOrder: 3 },
    { slug: "aqiqah", name: "Tasyakuran & Aqiqah", description: "Undangan aqiqah, kelahiran & syukuran", sortOrder: 4 },
    { slug: "graduation", name: "Wisuda (Graduation)", description: "Undangan kelulusan dan tasyakuran wisuda", sortOrder: 5 },
    { slug: "corporate", name: "Formal & Corporate", description: "Undangan seminar, gala dinner, & gathering kantor", sortOrder: 6 },
    { slug: "other", name: "Lainnya", description: "Kategori umum dan perayaan lainnya", sortOrder: 7 },
  ];

  for (const cat of defaultCategories) {
    await db
      .insert(templateCategories)
      .values(cat)
      .onConflictDoNothing();
  }

  const catalogTemplatesSeed = [
    {
      name: "Classic Floral",
      slug: "classic-floral-botanical",
      description: "Desain undangan botanical dengan sentuhan floral lembut dan aksen sage green yang menenangkan.",
      category: "wedding",
      style: "botanical_sage",
      price: 89000,
      tier: "standard",
      isPublic: true,
      isFeatured: true,
      thumbnailUrl: "/images/template-botanical.jpg",
      previewMockupUrl: "/images/template-botanical.jpg",
      tags: ["floral", "botanical", "sage", "pernikahan", "elegan"],
      metadata: {
        colorPalette: [
          { hex: "#8A9A86", name: "Sage Green", isPrimary: true },
          { hex: "#F4F1EA", name: "Ivory Warm" },
          { hex: "#4A5847", name: "Forest Green" },
        ],
        supportedFeatures: ["rsvp", "google_maps", "digital_gift", "audio_player", "countdown", "gallery_slider"],
        layoutFormat: "vertical_scroll",
      },
    },
    {
      name: "Royal Elegant",
      slug: "royal-elegant-jawa",
      description: "Kemewahan motif batik Kencana dan aksen emas megah untuk perayaan agung adat Nusantara.",
      category: "wedding",
      style: "traditional_jawa",
      price: 119000,
      tier: "premium",
      isPublic: true,
      isFeatured: true,
      thumbnailUrl: "/images/template-jawa.jpg",
      previewMockupUrl: "/images/template-jawa.jpg",
      tags: ["jawa", "tradisional", "gold", "batik", "luxury"],
      metadata: {
        colorPalette: [
          { hex: "#D4AF37", name: "Gold Kencana", isPrimary: true },
          { hex: "#2C221E", name: "Dark Walnut" },
        ],
        supportedFeatures: ["rsvp", "google_maps", "digital_gift", "audio_player", "countdown", "envelope_cover"],
        layoutFormat: "vertical_scroll",
      },
    },
    {
      name: "Modern Minimal",
      slug: "modern-minimal-boho",
      description: "Konsep rustic terracotta kontemporer dengan tipografi editorial modern yang bersih dan berkarakter.",
      category: "wedding",
      style: "rustic_boho",
      price: 99000,
      tier: "standard",
      isPublic: true,
      isFeatured: true,
      thumbnailUrl: "/images/template-boho.jpg",
      previewMockupUrl: "/images/template-boho.jpg",
      tags: ["boho", "terracotta", "minimalis", "modern", "aesthetic"],
      metadata: {
        colorPalette: [
          { hex: "#C86D51", name: "Terracotta", isPrimary: true },
          { hex: "#F7F2EE", name: "Sand Cream" },
        ],
        supportedFeatures: ["rsvp", "google_maps", "digital_gift", "audio_player", "countdown", "story_timeline"],
        layoutFormat: "vertical_scroll",
      },
    },
    {
      name: "Serene Promise",
      slug: "serene-promise-tunangan",
      description: "Nuansa blush pastel romantis untuk momen lamaran dan pertunangan yang penuh kehangatan.",
      category: "engagement",
      style: "modern_minimalist",
      price: 79000,
      tier: "standard",
      isPublic: true,
      isFeatured: false,
      thumbnailUrl: "/images/template-botanical.jpg",
      previewMockupUrl: "/images/template-botanical.jpg",
      tags: ["tunangan", "engagement", "blush", "pastel", "romantis"],
      metadata: {
        colorPalette: [
          { hex: "#E8B4B8", name: "Blush Rose", isPrimary: true },
          { hex: "#FFFFFF", name: "Pure White" },
        ],
        supportedFeatures: ["rsvp", "google_maps", "countdown"],
        layoutFormat: "vertical_scroll",
      },
    },
    {
      name: "Sweet Seventeen",
      slug: "sweet-seventeen-celebration",
      description: "Undangan ulang tahun ke-17 yang ceria, modis, dan interaktif dengan hitung mundur acara.",
      category: "birthday",
      style: "clean_editorial",
      price: 69000,
      tier: "standard",
      isPublic: true,
      isFeatured: false,
      thumbnailUrl: "/images/template-boho.jpg",
      previewMockupUrl: "/images/template-boho.jpg",
      tags: ["ulang tahun", "birthday", "sweet seventeen", "party"],
      metadata: {
        colorPalette: [
          { hex: "#D87093", name: "Berry Pink", isPrimary: true },
        ],
        supportedFeatures: ["rsvp", "google_maps", "countdown", "audio_player"],
        layoutFormat: "vertical_scroll",
      },
    },
  ];

  for (const tpl of catalogTemplatesSeed) {
    const existing = await findTemplateByName(db, workspace.id, tpl.name);
    if (!existing) {
      await insertTemplate(db, {
        workspaceId: workspace.id,
        name: tpl.name,
        slug: tpl.slug,
        description: tpl.description,
        category: tpl.category,
        style: tpl.style,
        price: tpl.price,
        tier: tpl.tier,
        isPublic: tpl.isPublic,
        isFeatured: tpl.isFeatured,
        thumbnailUrl: tpl.thumbnailUrl,
        previewMockupUrl: tpl.previewMockupUrl,
        tags: tpl.tags,
        metadata: tpl.metadata as any,
        status: "published",
        publishedVersionNo: 1,
        publishedRevision: 1,
        revision: 1,
        draftDocument: createEmptyDocument(),
        createdBy: user.id,
      });
    }
  }

  let resellerUserId: string | undefined;
  if (options.withDemoReseller !== false) {
    const existingReseller = await findUserByEmail(db, DEMO_RESELLER_EMAIL);
    if (!existingReseller) {
      const res = await createResellerWithProfile(db, {
        email: DEMO_RESELLER_EMAIL,
        name: "Mitra Berkah Admin",
        passwordHash: password ? await hashPassword(password) : null,
        agencyName: "Mitra Berkah Wedding",
        slug: DEMO_RESELLER_SLUG,
        whatsappContact: "6281234567890",
        performedBy: user.id,
      });
      resellerUserId = res.user.id;
    } else {
      resellerUserId = existingReseller.id;
      if (password) {
        await db
          .update(users)
          .set({ passwordHash: await hashPassword(password), status: "active", updatedAt: new Date() })
          .where(eq(users.id, existingReseller.id));
      }
    }

    let clientUserId: string | undefined;
    if (resellerUserId) {
      const existingClient = await findUserByEmail(db, DEMO_CLIENT_EMAIL);
      if (!existingClient) {
        const clientRes = await createResellerClient(db, {
          resellerUserId,
          clientName: "Demo Client",
          clientEmail: DEMO_CLIENT_EMAIL,
          passwordHash: password ? await hashPassword(password) : null,
          workspaceName: "Demo Client Workspace",
          workspaceSlug: DEMO_CLIENT_SLUG,
        });
        clientUserId = clientRes.clientUser.id;
      } else {
        clientUserId = existingClient.id;
        if (password) {
          await db
            .update(users)
            .set({ passwordHash: await hashPassword(password), status: "active", updatedAt: new Date() })
            .where(eq(users.id, existingClient.id));
        }
      }
    }

    return {
      userId: user.id,
      adminUserId: user.id,
      workspaceId: workspace.id,
      templateId: template.id,
      resellerUserId,
      clientUserId,
    };
  }

  return {
    userId: user.id,
    adminUserId: user.id,
    workspaceId: workspace.id,
    templateId: template.id,
    resellerUserId,
  };
}
