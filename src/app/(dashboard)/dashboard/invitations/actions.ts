"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addGuest,
  archive,
  archiveGuest,
  create,
  describeInvitationError,
  importGuestsCsv,
  publish,
  remove,
  restore,
  rollback,
  saveData,
} from "@/features/invitations/api";
import type {
  ActionState,
  ImportState,
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

export async function addGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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

/** Guest CSV import: `intent=preview` validates only, `intent=import` commits valid rows. */
export async function importGuestsAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const id = idSchema.safeParse(field(formData, "invitationId"));
  if (!id.success) return { error: "Undangan tidak valid." };
  const csv = field(formData, "csv");
  if (csv.trim() === "") return { error: "Tempel atau pilih file CSV terlebih dahulu." };
  const commit = field(formData, "intent") === "import";
  try {
    const { plan, created } = await importGuestsCsv(id.data, csv, !commit);
    if (commit) revalidatePath(`${LIST}/${id.data}`);
    return { plan, ...(commit && { created }) };
  } catch (error) {
    return { error: failure(error).error ?? "Gagal mengimpor." };
  }
}

export async function deleteInvitationAction(
  invitationId: string,
): Promise<ActionState> {
  const id = idSchema.safeParse(invitationId);
  if (!id.success) return { error: "Undangan tidak valid." };
  try {
    const res = await remove(id.data);
    revalidatePath(LIST);
    return {
      ok: true,
      message: res.deleted
        ? "Undangan berhasil dihapus permanen."
        : "Undangan telah dipindahkan ke tab Diarsipkan.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveInvitationAction(
  invitationId: string,
): Promise<ActionState> {
  const id = idSchema.safeParse(invitationId);
  if (!id.success) return { error: "Undangan tidak valid." };
  try {
    await archive(id.data);
    revalidatePath(LIST);
    return { ok: true, message: "Undangan berhasil diarsipkan." };
  } catch (error) {
    return failure(error);
  }
}

export async function restoreInvitationAction(
  invitationId: string,
): Promise<ActionState> {
  const id = idSchema.safeParse(invitationId);
  if (!id.success) return { error: "Undangan tidak valid." };
  try {
    await restore(id.data);
    revalidatePath(LIST);
    return { ok: true, message: "Undangan berhasil dipulihkan ke status aktif." };
  } catch (error) {
    return failure(error);
  }
}
