"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  archive,
  createInLibrary,
  describeTemplateError,
  duplicate,
  publish,
  rename,
} from "@/features/templates/api";
import type { ActionState } from "@/features/templates/components";

const idSchema = z.uuid();
const LIBRARY = "/dashboard/templates";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function failure(error: unknown): ActionState {
  if (!(error instanceof Error) || error.name === "Error")
    console.error("template action failed", error);
  return { error: describeTemplateError(error) };
}

export async function createTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = idSchema.safeParse(field(formData, "workspaceId"));
  if (!workspaceId.success) return { error: "Workspace tidak valid." };
  let createdId: string;
  try {
    createdId = (await createInLibrary(workspaceId.data, field(formData, "name"))).id;
  } catch (error) {
    return failure(error);
  }
  revalidatePath(LIBRARY);
  redirect(`${LIBRARY}/${createdId}`);
}

export async function renameTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "templateId"));
  if (!id.success) return { error: "Template tidak valid." };
  try {
    await rename(id.data, field(formData, "name"));
  } catch (error) {
    return failure(error);
  }
  revalidatePath(LIBRARY);
  revalidatePath(`${LIBRARY}/${id.data}`);
  return { ok: true, message: "Nama diperbarui." };
}

export async function duplicateTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "templateId"));
  if (!id.success) return { error: "Template tidak valid." };
  try {
    await duplicate(id.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(LIBRARY);
  return { ok: true, message: "Template diduplikasi." };
}

export async function archiveTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "templateId"));
  if (!id.success) return { error: "Template tidak valid." };
  try {
    await archive(id.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(LIBRARY);
  revalidatePath(`${LIBRARY}/${id.data}`);
  return { ok: true, message: "Template diarsipkan." };
}

export async function publishTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "templateId"));
  const revision = z.coerce.number().int().min(1).safeParse(field(formData, "expectedRevision"));
  if (!id.success || !revision.success) return { error: "Permintaan tidak valid." };
  try {
    const version = await publish(id.data, revision.data, field(formData, "note"));
    revalidatePath(LIBRARY);
    revalidatePath(`${LIBRARY}/${id.data}`);
    return { ok: true, message: `Versi v${version.versionNo} dipublish.` };
  } catch (error) {
    return failure(error);
  }
}
