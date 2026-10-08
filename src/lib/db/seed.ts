/**
 * Idempotent dev seed: one dev user, one dev workspace (+owner), one empty template.
 * Uses repositories only; contains no client data.
 */
import { eq } from "drizzle-orm";
import { assertPasswordPolicy, hashPassword } from "../auth/password";
import { createEmptyDocument } from "../schema/document";
import { templates, users, workspaceMembers } from "./schema";
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

  let resellerUserId: string | undefined;
  if (options.withDemoReseller !== false) {
    const existingReseller = await findUserByEmail(db, DEMO_RESELLER_EMAIL);
    if (!existingReseller) {
      const res = await createResellerWithProfile(db, {
        email: DEMO_RESELLER_EMAIL,
        name: "Mitra Berkah Admin",
        passwordHash: options.password ? await hashPassword(options.password) : null,
        agencyName: "Mitra Berkah Wedding",
        slug: DEMO_RESELLER_SLUG,
        whatsappContact: "6281234567890",
        performedBy: user.id,
      });
      resellerUserId = res.user.id;
    } else {
      resellerUserId = existingReseller.id;
    }

    let clientUserId: string | undefined;
    if (resellerUserId) {
      const existingClient = await findUserByEmail(db, DEMO_CLIENT_EMAIL);
      if (!existingClient) {
        const clientRes = await createResellerClient(db, {
          resellerUserId,
          clientName: "Demo Client",
          clientEmail: DEMO_CLIENT_EMAIL,
          passwordHash: options.password ? await hashPassword(options.password) : null,
          workspaceName: "Demo Client Workspace",
          workspaceSlug: DEMO_CLIENT_SLUG,
        });
        clientUserId = clientRes.clientUser.id;
      } else {
        clientUserId = existingClient.id;
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
