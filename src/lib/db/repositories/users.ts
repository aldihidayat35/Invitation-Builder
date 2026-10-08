import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { assertPasswordPolicy, hashPassword } from "../../auth/password";
import type { SystemRole, UserStatus } from "../../schema/domain";
import {
  assets,
  customerOrders,
  invitations,
  resellerProfiles,
  sessions,
  templates,
  users,
  workspaceMembers,
  workspaces,
  type NewUser,
  type User,
} from "../schema";
import type { Database } from "../types";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  systemRole: SystemRole;
  status: UserStatus;
  resellerId: string | null;
  resellerName?: string | null;
  resellerAgencyName?: string | null;
  agencyName?: string | null;
  agencySlug?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsersSummary {
  total: number;
  owners: number;
  resellers: number;
  clients: number;
  active: number;
  disabled: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  systemRole: SystemRole;
  status?: UserStatus;
  resellerId?: string | null;
  agencyName?: string;
  slug?: string;
  whatsappContact?: string;
}

export interface UpdateUserInput {
  userId: string;
  name?: string;
  email?: string;
  systemRole?: SystemRole;
  status?: UserStatus;
  resellerId?: string | null;
  password?: string;
}

export interface DeleteUserResult {
  mode: "deleted" | "archived";
  user: User;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "user"
  );
}

export async function insertUser(db: Database, input: NewUser): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ ...input, email: input.email.trim() })
    .returning();
  if (!row) throw new Error("insertUser returned no row");
  return row;
}

/** Case-insensitive lookup (matches the unique lower(email) index). */
export async function findUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))
    .limit(1);
  return row;
}

export async function findUserById(db: Database, id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function listUsersByRole(db: Database, role: SystemRole): Promise<User[]> {
  return db.select().from(users).where(eq(users.systemRole, role)).orderBy(desc(users.createdAt));
}

export async function listUsersByReseller(db: Database, resellerId: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.resellerId, resellerId))
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(
  db: Database,
  userId: string,
  systemRole: SystemRole,
): Promise<User | undefined> {
  const [row] = await db
    .update(users)
    .set({ systemRole, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row;
}

/** Sets the password hash only when none exists (seed/bootstrap); never overwrites. */
export async function setInitialPasswordHash(
  db: Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(users)
    .set({ passwordHash })
    .where(and(eq(users.id, userId), isNull(users.passwordHash)));
}

/** Fetches full user list with aggregated roles and reseller metadata for admin management. */
export async function listUsersWithDetails(
  db: Database,
  options: {
    search?: string;
    role?: SystemRole | "all";
    status?: UserStatus | "all";
    limit?: number;
    offset?: number;
  } = {},
): Promise<UserListItem[]> {
  const conditions = [];

  if (options.role && options.role !== "all") {
    conditions.push(eq(users.systemRole, options.role));
  }

  if (options.status && options.status !== "all") {
    conditions.push(eq(users.status, options.status));
  }

  if (options.search?.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(sql`(lower(${users.name}) like ${q} or lower(${users.email}) like ${q})`);
  }

  const query = db.select().from(users);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = whereClause ? query.where(whereClause) : query;
  const userRows = await baseQuery
    .orderBy(desc(users.createdAt))
    .limit(options.limit ?? 200)
    .offset(options.offset ?? 0);

  if (userRows.length === 0) return [];

  // Fetch reseller profiles for users that are resellers
  const userIds = userRows.map((u) => u.id);
  const resellerProfilesList = await db
    .select()
    .from(resellerProfiles)
    .where(inArray(resellerProfiles.userId, userIds));
  const profileMap = new Map(resellerProfilesList.map((p) => [p.userId, p]));

  // Fetch parent resellers for client users
  const parentResellerIds = Array.from(
    new Set(userRows.map((u) => u.resellerId).filter((id): id is string => Boolean(id))),
  );
  let parentResellerMap = new Map<string, { name: string; agencyName?: string }>();

  if (parentResellerIds.length > 0) {
    const parentUsers = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(inArray(users.id, parentResellerIds));

    const parentProfiles = await db
      .select({
        userId: resellerProfiles.userId,
        agencyName: resellerProfiles.agencyName,
      })
      .from(resellerProfiles)
      .where(inArray(resellerProfiles.userId, parentResellerIds));

    const parentProfileMap = new Map(parentProfiles.map((p) => [p.userId, p.agencyName]));

    parentResellerMap = new Map(
      parentUsers.map((u) => [
        u.id,
        {
          name: u.name,
          agencyName: parentProfileMap.get(u.id),
        },
      ]),
    );
  }

  return userRows.map((u) => {
    const profile = profileMap.get(u.id);
    const parentReseller = u.resellerId ? parentResellerMap.get(u.resellerId) : undefined;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      systemRole: u.systemRole,
      status: u.status,
      resellerId: u.resellerId,
      resellerName: parentReseller?.name,
      resellerAgencyName: parentReseller?.agencyName,
      agencyName: profile?.agencyName,
      agencySlug: profile?.slug,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  });
}

/** Aggregates summary metric counts for all users across the platform. */
export async function getUsersSummary(db: Database): Promise<UsersSummary> {
  const all = await db
    .select({
      systemRole: users.systemRole,
      status: users.status,
    })
    .from(users);

  const summary: UsersSummary = {
    total: all.length,
    owners: 0,
    resellers: 0,
    clients: 0,
    active: 0,
    disabled: 0,
  };

  for (const u of all) {
    if (u.systemRole === "owner") summary.owners++;
    else if (u.systemRole === "reseller") summary.resellers++;
    else if (u.systemRole === "client") summary.clients++;

    if (u.status === "active") summary.active++;
    else if (u.status === "disabled") summary.disabled++;
  }

  return summary;
}

/** Creates a brand new user with dedicated personal workspace. */
export async function createUserWithWorkspace(
  db: Database,
  input: CreateUserInput,
): Promise<{ user: User; workspace: typeof workspaces.$inferSelect }> {
  return db.transaction(async (tx) => {
    const existing = await findUserByEmail(tx, input.email);
    if (existing) {
      throw new Error(`Email "${input.email}" sudah terdaftar pada pengguna lain.`);
    }

    let passwordHash: string | null = null;
    if (input.password && input.password.trim().length > 0) {
      assertPasswordPolicy(input.password);
      passwordHash = await hashPassword(input.password);
    }

    const [newUser] = await tx
      .insert(users)
      .values({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash,
        systemRole: input.systemRole,
        status: input.status ?? "active",
        resellerId: input.systemRole === "client" ? (input.resellerId ?? null) : null,
      })
      .returning();

    if (!newUser) {
      throw new Error("Gagal membuat data pengguna baru.");
    }

    // Provision personal workspace
    const rawSlug = `ws-${slugify(input.name)}-${Math.random().toString(36).substring(2, 6)}`;
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: `Workspace ${input.name.trim()}`,
        slug: rawSlug,
      })
      .returning();

    if (!workspace) {
      throw new Error("Gagal membuat workspace default pengguna.");
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: newUser.id,
      role: "owner",
    });

    // If reseller, create reseller profile
    if (input.systemRole === "reseller") {
      const agencyName = input.agencyName?.trim() || `${input.name} Agency`;
      const baseSlug = input.slug?.trim().toLowerCase() || slugify(agencyName);
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

      await tx.insert(resellerProfiles).values({
        userId: newUser.id,
        agencyName,
        slug: uniqueSlug,
        whatsappContact: input.whatsappContact?.trim() || "628000000000",
        isActive: (input.status ?? "active") === "active",
      });
    }

    return { user: newUser, workspace };
  });
}

/** Updates user core fields, role, status, and optionally password. */
export async function updateUserDetails(db: Database, input: UpdateUserInput): Promise<User> {
  return db.transaction(async (tx) => {
    const existing = await findUserById(tx, input.userId);
    if (!existing) {
      throw new Error("Pengguna tidak ditemukan.");
    }

    if (input.email && input.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const conflict = await findUserByEmail(tx, input.email);
      if (conflict && conflict.id !== input.userId) {
        throw new Error(`Email "${input.email}" sudah digunakan oleh akun lain.`);
      }
    }

    const updateValues: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateValues.name = input.name.trim();
    if (input.email !== undefined) updateValues.email = input.email.trim().toLowerCase();
    if (input.systemRole !== undefined) updateValues.systemRole = input.systemRole;
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.resellerId !== undefined) {
      updateValues.resellerId = input.systemRole === "client" ? input.resellerId : null;
    }

    if (input.password && input.password.trim().length > 0) {
      assertPasswordPolicy(input.password);
      updateValues.passwordHash = await hashPassword(input.password);
    }

    const [updated] = await tx
      .update(users)
      .set(updateValues)
      .where(eq(users.id, input.userId))
      .returning();

    if (!updated) {
      throw new Error("Gagal memperbarui data pengguna.");
    }

    if (
      input.password?.trim() ||
      (input.systemRole !== undefined && input.systemRole !== existing.systemRole) ||
      (input.status !== undefined && input.status !== existing.status)
    ) {
      await tx.delete(sessions).where(eq(sessions.userId, input.userId));
    }

    // Sync status with reseller profile if active/disabled changed
    if (input.status !== undefined && updated.systemRole === "reseller") {
      await tx
        .update(resellerProfiles)
        .set({
          isActive: input.status === "active",
          updatedAt: new Date(),
        })
        .where(eq(resellerProfiles.userId, input.userId));
    }

    return updated;
  });
}

/**
 * Safely deletes a user account.
 * - Prevents deleting the last remaining Super Admin.
 * - Removes sessions and workspace memberships.
 * - Cleans up dependent foreign keys.
 * - If immutable audit log constraints prevent hard delete, archives & anonymizes the account safely.
 */
export async function deleteUserAccount(db: Database, userId: string): Promise<DeleteUserResult> {
  const existing = await findUserById(db, userId);
  if (!existing) {
    throw new Error("Pengguna tidak ditemukan.");
  }

  if (existing.systemRole === "owner") {
    const [ownerCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.systemRole, "owner"));
    if ((ownerCount?.count ?? 0) <= 1) {
      throw new Error("Tidak dapat menghapus akun Super Admin terakhir di platform.");
    }
  }

  return db.transaction(async (tx) => {
    // 1. Delete all active sessions
    await tx.delete(sessions).where(eq(sessions.userId, userId));

    // 2. Remove workspace memberships
    await tx.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId));

    // 3. Unlink client assignments from other users
    await tx.update(users).set({ resellerId: null }).where(eq(users.resellerId, userId));

    // 4. Unlink client orders
    await tx
      .update(customerOrders)
      .set({ clientUserId: null })
      .where(eq(customerOrders.clientUserId, userId));

    // 5. Clean up reseller profile if applicable
    const [resellerProfile] = await tx
      .select()
      .from(resellerProfiles)
      .where(eq(resellerProfiles.userId, userId))
      .limit(1);

    if (resellerProfile) {
      const [orderCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(customerOrders)
        .where(eq(customerOrders.sellerId, resellerProfile.id));

      if ((orderCount?.count ?? 0) > 0) {
        throw new Error(
          `Mitra seller memiliki ${orderCount?.count} pesanan customer aktif. Silakan nonaktifkan akun atau kelola pesanan terlebih dahulu.`,
        );
      }

      await tx.delete(resellerProfiles).where(eq(resellerProfiles.userId, userId));
    }

    // 6. Clear nullable user references on created templates/invitations/assets
    await tx.update(templates).set({ createdBy: null }).where(eq(templates.createdBy, userId));

    await tx.update(invitations).set({ createdBy: null }).where(eq(invitations.createdBy, userId));

    await tx.update(assets).set({ uploadedBy: null }).where(eq(assets.uploadedBy, userId));

    // 7. Attempt hard delete of users row
    try {
      const [deleted] = await tx.delete(users).where(eq(users.id, userId)).returning();

      if (!deleted) {
        throw new Error("Gagal menghapus akun pengguna.");
      }

      return { mode: "deleted", user: deleted };
    } catch (err: unknown) {
      // If foreign key constraint (e.g. immutable audit log history) prevents hard deletion,
      // fallback to safe archive & anonymization per NFR-REL-001.
      const errorMsg = String(err);
      if (
        errorMsg.includes("audit_logs") ||
        errorMsg.includes("violates foreign key constraint") ||
        errorMsg.includes("restrict_violation")
      ) {
        const anonymizedEmail = `archived_${userId.slice(0, 8)}_${Date.now()}@archived.local`;
        const [archived] = await tx
          .update(users)
          .set({
            name: `[Akun Dihapus] ${existing.name}`,
            email: anonymizedEmail,
            status: "disabled",
            passwordHash: null,
            resellerId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();

        if (!archived) {
          throw new Error("Gagal mengarsipkan akun pengguna.");
        }

        return { mode: "archived", user: archived };
      }

      throw err;
    }
  });
}
