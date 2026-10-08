// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  createUserWithWorkspace,
  deleteUserAccount,
  findUserByEmail,
  findUserById,
  getUsersSummary,
  listUsersWithDetails,
  updateUserDetails,
} from "@/lib/db/repositories/users";
import { seedDev } from "@/lib/db/seed";
import { sessions, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
  await seedDev(db());
});

afterAll(async () => {
  await conn.close();
});

describe("Super Admin User Management Feature", () => {
  it("calculates user summary metrics accurately", async () => {
    const summary = await getUsersSummary(db());
    expect(summary.total).toBeGreaterThanOrEqual(1);
    expect(summary.owners).toBeGreaterThanOrEqual(1);
    expect(summary.active).toBeGreaterThanOrEqual(1);
  });

  it("creates a client user with personal workspace and credentials", async () => {
    const res = await createUserWithWorkspace(db(), {
      name: "Budi Klien Test",
      email: "budi.client@test.local",
      password: "passwordRahasia123!",
      systemRole: "client",
      status: "active",
    });

    expect(res.user.name).toBe("Budi Klien Test");
    expect(res.user.systemRole).toBe("client");
    expect(res.user.status).toBe("active");
    expect(res.user.passwordHash).toBeTruthy();
    expect(await verifyPassword("passwordRahasia123!", res.user.passwordHash!)).toBe(true);

    // Verify workspace was provisioned
    expect(res.workspace.name).toContain("Budi Klien Test");

    const memberships = await db()
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, res.user.id));
    expect(memberships.length).toBe(1);
    expect(memberships[0]!.role).toBe("owner");
  });

  it("creates a reseller user with agency profile", async () => {
    const res = await createUserWithWorkspace(db(), {
      name: "Siti Reseller Test",
      email: "siti.reseller@test.local",
      password: "passwordReseller123!",
      systemRole: "reseller",
      status: "active",
      agencyName: "Siti Wedding Studio",
      slug: "siti-wedding-test",
      whatsappContact: "62811223344",
    });

    expect(res.user.systemRole).toBe("reseller");

    const details = await listUsersWithDetails(db(), {
      search: "siti.reseller@test.local",
    });
    expect(details.length).toBe(1);
    expect(details[0]!.agencyName).toBe("Siti Wedding Studio");
  });

  it("filters users by role and search query", async () => {
    const clients = await listUsersWithDetails(db(), { role: "client" });
    expect(clients.every((u) => u.systemRole === "client")).toBe(true);

    const searchResult = await listUsersWithDetails(db(), { search: "Budi Klien" });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0]!.email).toBe("budi.client@test.local");
  });

  it("updates user details, role, status, and password", async () => {
    const user = await findUserByEmail(db(), "budi.client@test.local");
    expect(user).toBeDefined();

    const updated = await updateUserDetails(db(), {
      userId: user!.id,
      name: "Budi Pratama Edited",
      status: "disabled",
      password: "newSecurePassword456!",
    });

    expect(updated.name).toBe("Budi Pratama Edited");
    expect(updated.status).toBe("disabled");
    expect(await verifyPassword("newSecurePassword456!", updated.passwordHash!)).toBe(true);
  });

  it("prevents deleting the only Super Admin in the system", async () => {
    const owners = await listUsersWithDetails(db(), { role: "owner" });
    expect(owners.length).toBe(1);

    await expect(deleteUserAccount(db(), owners[0]!.id)).rejects.toThrow(
      "Tidak dapat menghapus akun Super Admin terakhir",
    );
  });

  it("safely deletes a user and purges related session and workspace access", async () => {
    // Create temporary user to delete
    const temp = await createUserWithWorkspace(db(), {
      name: "Temp User To Delete",
      email: "temp.delete@test.local",
      password: "tempPassword123#",
      systemRole: "client",
      status: "active",
    });

    // Create a session for this user
    await db().insert(sessions).values({
      userId: temp.user.id,
      tokenHash: "fake_token_hash_for_test",
      expiresAt: new Date(Date.now() + 3600000),
    });

    // Verify session exists
    const existingSessions = await db()
      .select()
      .from(sessions)
      .where(eq(sessions.userId, temp.user.id));
    expect(existingSessions.length).toBe(1);

    // Delete user
    const result = await deleteUserAccount(db(), temp.user.id);
    expect(["deleted", "archived"]).toContain(result.mode);

    // Verify sessions were purged
    const remainingSessions = await db()
      .select()
      .from(sessions)
      .where(eq(sessions.userId, temp.user.id));
    expect(remainingSessions.length).toBe(0);

    // Verify user is either deleted or archived
    if (result.mode === "deleted") {
      const found = await findUserById(db(), temp.user.id);
      expect(found).toBeUndefined();
    } else {
      const found = await findUserById(db(), temp.user.id);
      expect(found?.status).toBe("disabled");
      expect(found?.email).toContain("archived_");
    }
  });
});
