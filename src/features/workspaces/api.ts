import "server-only";

import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { ACTIVE_WORKSPACE_COOKIE, requireUser } from "@/lib/auth/server";
import { getMemberRole } from "@/lib/db/repositories/workspaces";

export async function selectActiveWorkspace(workspaceId: string): Promise<void> {
  const user = await requireUser();
  const role = await getMemberRole(await getDb(), workspaceId, user.id);
  if (!role) throw new Error("Workspace tidak tersedia untuk akun ini.");

  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.AUTH_INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
