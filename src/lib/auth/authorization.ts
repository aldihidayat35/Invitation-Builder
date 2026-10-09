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
  "catalog:manage",
  "order:read_own",
  "order:qualify",
  "order:assign",
  "template:read",
  "template:write",
  "template:publish",
  "template:archive",
  "asset:read",
  "asset:write",
  "invitation:read",
  "invitation:write",
  "invitation:project_manage",
  "invitation:content_write",
  "invitation:design_write",
  "invitation:guest_manage",
  "invitation:review",
  "invitation:approve",
  "invitation:publish",
  "invitation:rollback",
  "rsvp:read",
  "rsvp:moderate",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const ROLE_CAPABILITIES: Readonly<Record<WorkspaceRole, readonly Capability[]>> = {
  owner: CAPABILITIES,
  admin: CAPABILITIES,
  designer: [
    "template:read",
    "template:write",
    "template:publish",
    "asset:read",
    "asset:write",
    "invitation:read",
    "invitation:write",
    "invitation:design_write",
    "invitation:review",
    "rsvp:read",
  ],
  operator: [
    "template:read",
    "asset:read",
    "invitation:read",
    "invitation:write",
    "invitation:project_manage",
    "invitation:content_write",
    "invitation:guest_manage",
    "invitation:review",
    "rsvp:read",
    "rsvp:moderate",
  ],
};

const CLIENT_CAPABILITIES: readonly Capability[] = [
  "asset:read",
  "asset:write",
  "invitation:read",
  "invitation:content_write",
  "invitation:guest_manage",
  "invitation:review",
  "invitation:approve",
  "rsvp:read",
];

export function roleCan(role: WorkspaceRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export interface Actor {
  readonly userId: string;
  readonly systemRole?: string;
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
  if (actor.systemRole === "owner") {
    return "owner";
  }
  if (actor.systemRole === "client" && !CLIENT_CAPABILITIES.includes(capability)) {
    throw new ForbiddenError(
      "Akun klien hanya dapat mengelola data acara, tamu, preview, dan persetujuan.",
    );
  }
  if (
    actor.systemRole === "reseller" &&
    capability !== "order:read_own" &&
    capability !== "order:qualify"
  ) {
    throw new ForbiddenError(
      "Seller tidak memiliki hak akses untuk mengubah data website undangan yang menjadi kewenangan Admin.",
    );
  }
  const role = await findRole(db, actor, workspaceId);
  if (!role) throw new ForbiddenError("Anda bukan anggota workspace ini.");
  if (!roleCan(role, capability)) throw new ForbiddenError();
  return role;
}
