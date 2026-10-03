import { hashPassword } from "@/lib/auth/password";
import { insertUser } from "@/lib/db/repositories/users";
import { createWorkspaceWithOwner } from "@/lib/db/repositories/workspaces";
import { workspaceMembers } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import type { WorkspaceRole } from "@/lib/schema/domain";

/** Cheap scrypt params: tests exercise logic, not hash cost (params are embedded in the hash). */
export const TEST_SCRYPT = { N: 1024, r: 8, p: 1 } as const;
export const TEST_PASSWORD = "correct-horse-battery";

export async function makeUser(
  db: Database,
  label: string,
  password: string | null = TEST_PASSWORD,
) {
  return insertUser(db, {
    email: `${label}@example.test`,
    name: label,
    passwordHash: password === null ? null : await hashPassword(password, TEST_SCRYPT),
  });
}

export async function addMember(
  db: Database,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  await db.insert(workspaceMembers).values({ workspaceId, userId, role });
}

/** Two isolated workspaces (A, B), each with its own owner; A also has a designer and an operator. */
export async function makeWorld(db: Database) {
  const ownerA = await makeUser(db, "owner-a");
  const ownerB = await makeUser(db, "owner-b");
  const designerA = await makeUser(db, "designer-a");
  const operatorA = await makeUser(db, "operator-a");
  const wsA = await createWorkspaceWithOwner(db, {
    name: "Workspace A",
    slug: "workspace-a",
    ownerUserId: ownerA.id,
  });
  const wsB = await createWorkspaceWithOwner(db, {
    name: "Workspace B",
    slug: "workspace-b",
    ownerUserId: ownerB.id,
  });
  await addMember(db, wsA.id, designerA.id, "designer");
  await addMember(db, wsA.id, operatorA.id, "operator");
  return {
    wsA,
    wsB,
    ownerA: { userId: ownerA.id },
    ownerB: { userId: ownerB.id },
    designerA: { userId: designerA.id },
    operatorA: { userId: operatorA.id },
  };
}
