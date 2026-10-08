import { sql } from "drizzle-orm";
import { appSettings, type AppSettingRow, type NewAppSettingRow } from "../schema";
import type { Database } from "../types";
import { getDb } from "../client";

export const DEFAULT_APP_SETTINGS: AppSettingRow = {
  id: "global",
  appName: "Undangan.id",
  appTagline: "Undangan Digital, Lebih Berkesan",
  appLogo: null,
  companyName: "Undangan.id",
  contactPhone: "+62 812-3456-7890",
  contactWhatsapp: "6281234567890",
  contactEmail: "support@undangan.id",
  address: "Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta 12190",
  footerDescription:
    "Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.",
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Ensures table existence in case migrations have not been applied yet in this session.
 */
export async function ensureAppSettingsTable(db: Database): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
        "app_name" text DEFAULT 'Undangan.id' NOT NULL,
        "app_tagline" text DEFAULT 'Undangan Digital, Lebih Berkesan' NOT NULL,
        "app_logo" text,
        "company_name" text DEFAULT 'Undangan.id' NOT NULL,
        "contact_phone" text DEFAULT '+62 812-3456-7890' NOT NULL,
        "contact_whatsapp" text DEFAULT '6281234567890' NOT NULL,
        "contact_email" text DEFAULT 'support@undangan.id' NOT NULL,
        "address" text DEFAULT 'Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta 12190' NOT NULL,
        "footer_description" text DEFAULT 'Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
  } catch (err) {
    console.warn("[ensureAppSettingsTable] notice:", err);
  }
}

/**
 * Fetches the global application settings. If not found, initializes the default row.
 */
export async function getAppSettings(database?: Database): Promise<AppSettingRow> {
  try {
    const db = database || (await getDb());
    await ensureAppSettingsTable(db);

    const [row] = await db.select().from(appSettings).limit(1);
    if (row) {
      return row;
    }

    // Insert default settings
    const [inserted] = await db
      .insert(appSettings)
      .values({
        id: "global",
        appName: DEFAULT_APP_SETTINGS.appName,
        appTagline: DEFAULT_APP_SETTINGS.appTagline,
        appLogo: DEFAULT_APP_SETTINGS.appLogo,
        companyName: DEFAULT_APP_SETTINGS.companyName,
        contactPhone: DEFAULT_APP_SETTINGS.contactPhone,
        contactWhatsapp: DEFAULT_APP_SETTINGS.contactWhatsapp,
        contactEmail: DEFAULT_APP_SETTINGS.contactEmail,
        address: DEFAULT_APP_SETTINGS.address,
        footerDescription: DEFAULT_APP_SETTINGS.footerDescription,
      })
      .onConflictDoNothing()
      .returning();

    return inserted || DEFAULT_APP_SETTINGS;
  } catch (err) {
    console.warn("[getAppSettings] Fallback to default settings:", err);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * Updates application settings (Super Admin only).
 */
export async function updateAppSettings(
  db: Database,
  input: Partial<Omit<NewAppSettingRow, "id" | "createdAt" | "updatedAt">>
): Promise<AppSettingRow> {
  await ensureAppSettingsTable(db);

  const [existing] = await db.select().from(appSettings).limit(1);

  if (!existing) {
    const [inserted] = await db
      .insert(appSettings)
      .values({
        ...DEFAULT_APP_SETTINGS,
        ...input,
        id: "global",
        updatedAt: new Date(),
      })
      .returning();
    return inserted ?? DEFAULT_APP_SETTINGS;
  }

  const [updated] = await db
    .update(appSettings)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(sql`${appSettings.id} = ${existing.id}`)
    .returning();

  return updated ?? existing;
}
