import "server-only";

import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import {
  getUsersSummary,
  listUsersWithDetails,
  type UserListItem,
  type UsersSummary,
} from "@/lib/db/repositories/users";
import { resellerProfiles, users } from "@/lib/db/schema";
import type { SystemRole, UserStatus } from "@/lib/schema/domain";
import type { AvailableResellerOption } from "./types";

export interface ListUsersFilter {
  search?: string;
  role?: SystemRole | "all";
  status?: UserStatus | "all";
  limit?: number;
  offset?: number;
}

/** Fetches full user directory for Super Admin user management. */
export async function getAdminUsersList(
  filter: ListUsersFilter = {},
): Promise<UserListItem[]> {
  await requireOwner();
  const db = await getDb();
  return listUsersWithDetails(db, filter);
}

/** Aggregates summary KPI numbers for platform users. */
export async function getAdminUsersSummary(): Promise<UsersSummary> {
  await requireOwner();
  const db = await getDb();
  return getUsersSummary(db);
}

/** Lists active resellers to populate the parent reseller dropdown in client user forms. */
export async function getAvailableResellers(): Promise<AvailableResellerOption[]> {
  await requireOwner();
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      agencyName: resellerProfiles.agencyName,
      agencySlug: resellerProfiles.slug,
    })
    .from(users)
    .leftJoin(resellerProfiles, eq(resellerProfiles.userId, users.id))
    .where(eq(users.systemRole, "reseller"))
    .orderBy(users.name);

  return rows;
}
