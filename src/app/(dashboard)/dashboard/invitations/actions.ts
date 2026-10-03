"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addGuest,
  archiveGuest,
  create,
  describeInvitationError,
  publish,
  rollback,
  saveData,
} from "@/features/invitations/api";
import type {
  ActionState,
  SaveDataState,
} from "@/features/invitations/components/action-state";

const idSchema = z.uuid();
const LIST = "/dashboard/invitations";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function failure(error: unknown): ActionState {
  if (!(error instanceof Error) || error.name === "Error")
    console.error("invitation action failed", error);
  return { error: describeInvitationError(error) };
}

export async function createInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = idSchema.safeParse(field(formData, "workspaceId"));
  const templateId = idSchema.safeParse(field(formData, "templateId"));
  if (!workspaceId.success) return { error: "Workspace tidak valid." };
  if (!templateId.success) return { error: "Pilih template terlebih dahulu." };
  let createdId: string;
  try {
    createdId = (await create(workspaceId.data, templateId.data, field(formData, "title"))).id;
  } catch (error) {
    return failure(error);
  }
  revalidatePath(LIST);
  redirect(`${LIST}/${createdId}`);
}

/**
 * Autosave entry point (called directly by the Data Mode client component).
 * Values are untrusted strings; the service coerces and validates them.
 */
export async function saveInvitationDataAction(
  invitationId: string,
  values: Record<string, string>,
): Promise<SaveDataState> {
  if (!idSchema.safeParse(invitationId).success) {
    return { ok: false, errors: {}, error: "Undangan tidak valid." };
  }
  const safeValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") safeValues[key] = value;
  }
  try {
    const { issues } = await saveData(invitationId, safeValues);
    revalidatePath(`${LIST}/${invitationId}`);
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      if (issue.code !== "unknown_key" && !(issue.key in errors)) errors[issue.key] = issue.message;
    }
    return { ok: true, errors };
  } catch (error) {
    return { ok: false, errors: {}, error: failure(error).error ?? "Gagal menyimpan." };
  }
}

export async function addGuestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "invitationId"));
  if (!id.success) return { error: "Undangan tidak valid." };
  const party = Number(field(formData, "maxParty") || "1");
  try {
    await addGuest(id.data, field(formData, "name"), party);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`${LIST}/${id.data}`);
  return { ok: true, message: "Tamu ditambahkan." };
}

export async function archiveGuestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const invitationId = idSchema.safeParse(field(formData, "invitationId"));
  const guestId = idSchema.safeParse(field(formData, "guestId"));
  if (!invitationId.success || !guestId.success) return { error: "Permintaan tidak valid." };
  try {
    await archiveGuest(invitationId.data, guestId.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`${LIST}/${invitationId.data}`);
  return { ok: true, message: "Tamu dihapus." };
}

export async function publishInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "invitationId"));
  if (!id.success) return { error: "Undangan tidak valid." };
  let revisionNo: number;
  try {
    revisionNo = (await publish(id.data)).revisionNo;
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`${LIST}/${id.data}`);
  return { ok: true, message: `Revisi ${revisionNo} dipublish.` };
}

export async function rollbackInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = idSchema.safeParse(field(formData, "invitationId"));
  const revisionNo = Number(field(formData, "revisionNo"));
  if (!id.success || !Number.isInteger(revisionNo)) return { error: "Permintaan tidak valid." };
  try {
    await rollback(id.data, revisionNo);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`${LIST}/${id.data}`);
  return { ok: true, message: `Revisi ${revisionNo} diaktifkan.` };
}
