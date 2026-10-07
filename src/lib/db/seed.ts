/**
 * Idempotent dev seed: one dev user, one dev workspace (+owner), one empty template.
 * Uses repositories only; contains no client data.
 */
import { assertPasswordPolicy, hashPassword } from "../auth/password";
import { createEmptyDocument } from "../schema/document";
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

export const DEV_USER_EMAIL = "dev@example.test";
export const DEV_WORKSPACE_SLUG = "dev-workspace";
export const DEV_TEMPLATE_NAME = "Empty Template";
export const DEMO_RESELLER_EMAIL = "reseller@example.test";
export const DEMO_RESELLER_SLUG = "mitra-berkah";
export const DEMO_CLIENT_EMAIL = "client@example.test";
export const DEMO_CLIENT_SLUG = "klien-berkah";

export interface SeedResult {
  userId: string;
  workspaceId: string;
  templateId: string;
  resellerUserId?: string;
  clientUserId?: string;
}

export interface SeedOptions {
  /** Dev login password. Applied only when the dev user has no password yet; never overwrites. */
  password?: string;
  /** Whether to seed a demo reseller account. Defaults to true. */
  withDemoReseller?: boolean;
}

export async function seedDev(db: Database, options: SeedOptions = {}): Promise<SeedResult> {
  const user =
    (await findUserByEmail(db, DEV_USER_EMAIL)) ??
    (await insertUser(db, {
      email: DEV_USER_EMAIL,
      name: "Dev User",
      passwordHash: null,
      systemRole: "owner",
    }));

  if (user.systemRole !== "owner") {
    await updateUserRole(db, user.id, "owner");
  }

  if (options.password) {
    assertPasswordPolicy(options.password);
    await setInitialPasswordHash(db, user.id, await hashPassword(options.password));
  }

  const workspace =
    (await findWorkspaceBySlug(db, DEV_WORKSPACE_SLUG)) ??
    (await createWorkspaceWithOwner(db, {
      name: "Dev Workspace",
      slug: DEV_WORKSPACE_SLUG,
      ownerUserId: user.id,
    }));

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
        initialCredits: 20,
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
      workspaceId: workspace.id,
      templateId: template.id,
      resellerUserId,
      clientUserId,
    };
  }

  return { userId: user.id, workspaceId: workspace.id, templateId: template.id, resellerUserId };
}
