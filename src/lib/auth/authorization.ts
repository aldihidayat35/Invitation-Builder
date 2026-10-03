/**
 * Workspace authorization (PRD §4 roles). Pure + DB lookup of membership.
 * Owner/Admin manage everything; Designer edits/publishes templates;
 * Operator is read-only on templates (creates invitations from them in F8).
 */
import type { WorkspaceRole } from "../schema/domain";
import { getMemberRole } from "../db/repositories/workspaces";
import type { Database } from "../db/types";
import { ForbiddenError } from "./errors";

export const CAPABILITIES = [
  "template:read",
  "template:write",
  "template:publish",
  "template:archive",
  "asset:read",
  "asset:write",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const ROLE_CAPABILITIES: Readonly<Record<WorkspaceRole, readonly Capability[]>> = {
  owner: CAPABILITIES,
  admin: CAPABILITIES,
  designer: ["template:read", "template:write", "template:publish", "asset:read", "asset:write"],
  operator: ["template:read", "asset:read"],
};

export function roleCan(role: WorkspaceRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export interface Actor {
  readonly userId: string;
}

/** Resolves the actor's role in the workspace, or undefined for non-members. */
export async function findRole(
  db: Database,
  actor: Actor,
  workspaceId: string,
): Promise<WorkspaceRole | undefined> {
  return getMemberRole(db, workspaceId, actor.userId);
}

/** Throws ForbiddenError unless the actor is a member whose role grants `capability`. */
export async function requireCapability(
  db: Database,
  actor: Actor,
  workspaceId: string,
  capability: Capability,
): Promise<WorkspaceRole> {
  const role = await findRole(db, actor, workspaceId);
  if (!role) throw new ForbiddenError("Anda bukan anggota workspace ini.");
  if (!roleCan(role, capability)) throw new ForbiddenError();
  return role;
}
