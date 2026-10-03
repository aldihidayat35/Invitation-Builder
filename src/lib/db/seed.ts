/**
 * Idempotent dev seed: one dev user, one dev workspace (+owner), one empty template.
 * Uses repositories only; contains no client data.
 */
import { assertPasswordPolicy, hashPassword } from "../auth/password";
import { createEmptyDocument } from "../schema/document";
import { findTemplateByName, insertTemplate } from "./repositories/templates";
import { findUserByEmail, insertUser, setInitialPasswordHash } from "./repositories/users";
import { createWorkspaceWithOwner, findWorkspaceBySlug } from "./repositories/workspaces";
import type { Database } from "./types";

export const DEV_USER_EMAIL = "dev@example.test";
export const DEV_WORKSPACE_SLUG = "dev-workspace";
export const DEV_TEMPLATE_NAME = "Empty Template";

export interface SeedResult {
  userId: string;
  workspaceId: string;
  templateId: string;
}

export interface SeedOptions {
  /** Dev login password. Applied only when the dev user has no password yet; never overwrites. */
  password?: string;
}

export async function seedDev(db: Database, options: SeedOptions = {}): Promise<SeedResult> {
  const user =
    (await findUserByEmail(db, DEV_USER_EMAIL)) ??
    (await insertUser(db, { email: DEV_USER_EMAIL, name: "Dev User", passwordHash: null }));

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

  return { userId: user.id, workspaceId: workspace.id, templateId: template.id };
}
