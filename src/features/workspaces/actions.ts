"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { selectActiveWorkspace } from "./api";

const workspaceIdSchema = z.string().uuid();

export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const workspaceId = workspaceIdSchema.safeParse(formData.get("workspaceId"));
  if (!workspaceId.success) throw new Error("Workspace tidak valid.");
  await selectActiveWorkspace(workspaceId.data);
  redirect("/dashboard");
}
