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
import type {
  TemplateSupportedFeature,
} from "@/features/templates/types";
import type { TemplateCategory, TemplateStyle, TemplateTier } from "@/lib/schema/domain";
import { requireOwner } from "@/lib/auth/server";

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
  await requireOwner();
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
  await requireOwner();
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
  await requireOwner();
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
  await requireOwner();
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
  await requireOwner();
  const id = idSchema.safeParse(field(formData, "templateId"));
  const revision = z.coerce.number().int().min(1).safeParse(field(formData, "expectedRevision"));
  if (!id.success || !revision.success) return { error: "Permintaan tidak valid." };
  try {
    const version = await publish(id.data, revision.data, field(formData, "note"));
    revalidatePath(LIBRARY);
    revalidatePath(`${LIBRARY}/${id.data}`);
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath("/templates/[slug]", "page");
    revalidatePath("/i/[slug]", "page");
    return { ok: true, message: `Versi v${version.versionNo} dipublish.` };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const id = idSchema.safeParse(field(formData, "templateId"));
  if (!id.success) return { error: "Template tidak valid." };
  try {
    const { deleteTemplatePermanently } = await import("@/features/templates/api");
    await deleteTemplatePermanently(id.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(LIBRARY);
  return { ok: true, message: "Template berhasil dihapus permanen." };
}

export async function updateTemplateCatalogAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const id = idSchema.safeParse(field(formData, "templateId"));
  if (!id.success) return { error: "Template tidak valid." };

  try {
    const rawTags = field(formData, "tags");
    const tags = rawTags
      ? rawTags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const rawFeatures = formData.getAll("supportedFeatures").map(String);
    const price = parseInt(field(formData, "price"), 10) || 0;
    const isPublic = formData.get("isPublic") === "on" || formData.get("isPublic") === "true";
    const isFeatured = formData.get("isFeatured") === "on" || formData.get("isFeatured") === "true";
    const previewVideoUrl = field(formData, "previewVideoUrl").trim() || null;
    const previewMockupUrl = field(formData, "previewMockupUrl").trim() || previewVideoUrl;

    const { updateCatalogMetadata } = await import("@/features/templates/api");
    const demoInvitationSlug = field(formData, "demoInvitationSlug").trim() || null;
    await updateCatalogMetadata(id.data, {
      slug: field(formData, "slug").trim() || null,
      description: field(formData, "description").trim() || null,
      category: (field(formData, "category") || "wedding") as TemplateCategory,
      style: (field(formData, "style") || "modern_minimalist") as TemplateStyle,
      tier: (field(formData, "tier") || "standard") as TemplateTier,
      price,
      isPublic,
      isFeatured,
      thumbnailUrl: field(formData, "thumbnailUrl").trim() || null,
      previewMockupUrl,
      previewVideoUrl,
      tags,
      supportedFeatures: rawFeatures as TemplateSupportedFeature[],
      demoInvitationSlug,
      metadata: {
        supportedFeatures: rawFeatures as TemplateSupportedFeature[],
        demoInvitationSlug: demoInvitationSlug || undefined,
        previewVideoUrl: previewVideoUrl || undefined,
      },
    });

    revalidatePath(LIBRARY);
    revalidatePath(`${LIBRARY}/${id.data}`);
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath("/templates/[slug]", "page");
    return { ok: true, message: "Metadata katalog berhasil disimpan." };
  } catch (error) {
    return failure(error);
  }
}
