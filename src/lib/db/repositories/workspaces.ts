import { and, eq } from "drizzle-orm";
import type { WorkspaceRole } from "../../schema/domain";
import { workspaceMembers, workspaces, type Workspace } from "../schema";
import type { Database } from "../types";

export async function findWorkspaceBySlug(
  db: Database,
  slug: string,
): Promise<Workspace | undefined> {
  const [row] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return row;
}

export async function findWorkspaceById(
  db: Database,
  workspaceId: string,
): Promise<Workspace | undefined> {
  const [row] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return row;
}

export async function ensureWorkspaceMember(
  db: Database,
  input: { workspaceId: string; userId: string; role: WorkspaceRole },
): Promise<void> {
  await db
    .insert(workspaceMembers)
    .values(input)
    // Existing membership may carry a stronger role (for example owner).
    .onConflictDoNothing();
}

/** Creates a workspace and its owner membership atomically. */
export async function createWorkspaceWithOwner(
  db: Database,
  input: { name: string; slug: string; ownerUserId: string },
): Promise<Workspace> {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: input.name, slug: input.slug })
      .returning();
    if (!workspace) throw new Error("createWorkspaceWithOwner returned no row");
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: workspace.id, userId: input.ownerUserId, role: "owner" });
    return workspace;
  });
}

export async function getMemberRole(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | undefined> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return row?.role;
}

export interface Membership {
  workspace: Workspace;
  role: WorkspaceRole;
}

export async function listMemberships(db: Database, userId: string): Promise<Membership[]> {
  const rows = await db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name);
  return rows;
}
