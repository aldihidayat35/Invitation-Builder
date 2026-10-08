"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/server";
import {
  deleteTemplateCategory,
  insertTemplateCategory,
  updateTemplateCategory,
} from "@/lib/db/repositories/template-categories";
import type { ActionState } from "@/features/templates/components";

const CATEGORIES_PATH = "/dashboard/templates/categories";
const TEMPLATES_PATH = "/dashboard/templates";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function failure(error: unknown): ActionState {
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "Terjadi kesalahan saat memproses kategori." };
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const db = await getDb();

  const name = field(formData, "name").trim();
  let slug = field(formData, "slug").trim().toLowerCase();
  const description = field(formData, "description").trim() || null;
  const sortOrder = parseInt(field(formData, "sortOrder"), 10) || 0;

  if (!name) {
    return { error: "Nama kategori wajib diisi." };
  }

  if (!slug) {
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const slugSchema = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Format slug hanya boleh huruf kecil, angka, dan strip (-).");
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { error: parsedSlug.error.issues[0]?.message ?? "Slug tidak valid." };
  }

  try {
    await insertTemplateCategory(db, {
      name,
      slug,
      description,
      sortOrder,
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(CATEGORIES_PATH);
  revalidatePath(TEMPLATES_PATH);
  return { ok: true, message: `Kategori "${name}" berhasil dibuat.` };
}

export async function updateCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const db = await getDb();

  const id = field(formData, "id").trim();
  const name = field(formData, "name").trim();
  const slug = field(formData, "slug").trim().toLowerCase();
  const description = field(formData, "description").trim() || null;
  const sortOrder = parseInt(field(formData, "sortOrder"), 10) || 0;

  if (!id) return { error: "ID kategori tidak valid." };
  if (!name) return { error: "Nama kategori wajib diisi." };

  const slugSchema = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Format slug hanya boleh huruf kecil, angka, dan strip (-).");
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { error: parsedSlug.error.issues[0]?.message ?? "Slug tidak valid." };
  }

  try {
    await updateTemplateCategory(db, id, {
      name,
      slug,
      description,
      sortOrder,
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(CATEGORIES_PATH);
  revalidatePath(TEMPLATES_PATH);
  return { ok: true, message: `Kategori "${name}" berhasil diperbarui.` };
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const db = await getDb();

  const id = field(formData, "id").trim();
  if (!id) return { error: "ID kategori tidak valid." };

  try {
    const deleted = await deleteTemplateCategory(db, id);
    revalidatePath(CATEGORIES_PATH);
    revalidatePath(TEMPLATES_PATH);
    return { ok: true, message: `Kategori "${deleted.name}" berhasil dihapus.` };
  } catch (error) {
    return failure(error);
  }
}
