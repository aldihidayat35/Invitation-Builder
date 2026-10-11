import { asc, desc, eq, sql } from "drizzle-orm";
import {
  globalVariablePresets,
  type GlobalVariablePresetRow,
  type NewGlobalVariablePresetRow,
} from "../schema";
import type { Database } from "../types";

export interface CreateGlobalPresetInput {
  key: string;
  label: string;
  category?: string;
  type?: string;
  defaultValue?: string;
  description?: string;
  maxLength?: number | null;
}

export interface UpdateGlobalPresetInput {
  label?: string;
  category?: string;
  defaultValue?: string;
  description?: string;
  maxLength?: number | null;
}

/**
 * Ensures table existence for global_variable_presets.
 */
export async function ensureGlobalVariablePresetsTable(db: Database): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "global_variable_presets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "key" text NOT NULL UNIQUE,
        "label" text NOT NULL,
        "category" text DEFAULT 'kustom' NOT NULL,
        "type" text DEFAULT 'text' NOT NULL,
        "default_value" text DEFAULT '' NOT NULL,
        "description" text DEFAULT '' NOT NULL,
        "max_length" integer,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "global_variable_presets_key_uq" ON "global_variable_presets" ("key");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "global_variable_presets_cat_idx" ON "global_variable_presets" ("category");
    `);
  } catch (err) {
    console.warn("[ensureGlobalVariablePresetsTable] notice:", err);
  }
}

export async function listGlobalVariablePresets(db: Database): Promise<GlobalVariablePresetRow[]> {
  await ensureGlobalVariablePresetsTable(db);
  return db
    .select()
    .from(globalVariablePresets)
    .orderBy(asc(globalVariablePresets.createdAt));
}

export async function getGlobalVariablePresetByKey(
  db: Database,
  key: string,
): Promise<GlobalVariablePresetRow | null> {
  await ensureGlobalVariablePresetsTable(db);
  const rows = await db
    .select()
    .from(globalVariablePresets)
    .where(eq(globalVariablePresets.key, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGlobalVariablePresetById(
  db: Database,
  id: string,
): Promise<GlobalVariablePresetRow | null> {
  await ensureGlobalVariablePresetsTable(db);
  const rows = await db
    .select()
    .from(globalVariablePresets)
    .where(eq(globalVariablePresets.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createGlobalVariablePreset(
  db: Database,
  input: CreateGlobalPresetInput,
): Promise<GlobalVariablePresetRow> {
  await ensureGlobalVariablePresetsTable(db);
  const [created] = await db
    .insert(globalVariablePresets)
    .values({
      key: input.key.trim(),
      label: input.label.trim(),
      category: input.category?.trim() || "kustom",
      type: input.type?.trim() || "text",
      defaultValue: input.defaultValue ?? "",
      description: input.description ?? "",
      maxLength: input.maxLength !== undefined ? input.maxLength : null,
    })
    .onConflictDoUpdate({
      target: globalVariablePresets.key,
      set: {
        label: input.label.trim(),
        defaultValue: input.defaultValue ?? "",
        description: input.description ?? "",
        maxLength: input.maxLength !== undefined ? input.maxLength : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!created) {
    throw new Error("Gagal membuat preset global");
  }

  return created;
}

export async function updateGlobalVariablePreset(
  db: Database,
  id: string,
  input: UpdateGlobalPresetInput,
): Promise<GlobalVariablePresetRow | null> {
  await ensureGlobalVariablePresetsTable(db);
  const updateData: Partial<NewGlobalVariablePresetRow> = {
    updatedAt: new Date(),
  };

  if (input.label !== undefined) updateData.label = input.label.trim();
  if (input.category !== undefined) updateData.category = input.category.trim();
  if (input.defaultValue !== undefined) updateData.defaultValue = input.defaultValue;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.maxLength !== undefined) updateData.maxLength = input.maxLength;

  const [updated] = await db
    .update(globalVariablePresets)
    .set(updateData)
    .where(eq(globalVariablePresets.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteGlobalVariablePreset(
  db: Database,
  id: string,
): Promise<boolean> {
  await ensureGlobalVariablePresetsTable(db);
  const result = await db
    .delete(globalVariablePresets)
    .where(eq(globalVariablePresets.id, id))
    .returning({ id: globalVariablePresets.id });

  return result.length > 0;
}
