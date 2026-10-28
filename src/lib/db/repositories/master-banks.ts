import { asc, eq, sql } from "drizzle-orm";
import { masterBanks, type MasterBankRow, type NewMasterBankRow } from "../schema";
import type { Database } from "../types";

export const DEFAULT_MASTER_BANKS: Array<
  Omit<NewMasterBankRow, "id" | "createdAt" | "updatedAt">
> = [
  { code: "bca", name: "BCA", category: "bank", logoUrl: "/images/banks/bca.svg", isActive: true, sortOrder: 1 },
  { code: "mandiri", name: "Bank Mandiri", category: "bank", logoUrl: "/images/banks/mandiri.svg", isActive: true, sortOrder: 2 },
  { code: "bri", name: "BRI", category: "bank", logoUrl: "/images/banks/bri.svg", isActive: true, sortOrder: 3 },
  { code: "bni", name: "BNI", category: "bank", logoUrl: "/images/banks/bni.svg", isActive: true, sortOrder: 4 },
  { code: "bsi", name: "BSI", category: "bank", logoUrl: "/images/banks/bsi.svg", isActive: true, sortOrder: 5 },
  { code: "cimb", name: "CIMB Niaga", category: "bank", logoUrl: "/images/banks/cimb.svg", isActive: true, sortOrder: 6 },
  { code: "permata", name: "Bank Permata", category: "bank", logoUrl: "/images/banks/permata.svg", isActive: true, sortOrder: 7 },
  { code: "jago", name: "Bank Jago", category: "bank", logoUrl: "/images/banks/jago.svg", isActive: true, sortOrder: 8 },
  { code: "seabank", name: "SeaBank", category: "bank", logoUrl: "/images/banks/seabank.svg", isActive: true, sortOrder: 9 },
  { code: "blu", name: "Blu by BCA Digital", category: "bank", logoUrl: "/images/banks/blu.svg", isActive: true, sortOrder: 10 },
  { code: "dana", name: "DANA", category: "ewallet", logoUrl: "/images/banks/dana.svg", isActive: true, sortOrder: 11 },
  { code: "gopay", name: "GoPay", category: "ewallet", logoUrl: "/images/banks/gopay.svg", isActive: true, sortOrder: 12 },
  { code: "ovo", name: "OVO", category: "ewallet", logoUrl: "/images/banks/ovo.svg", isActive: true, sortOrder: 13 },
  { code: "shopeepay", name: "ShopeePay", category: "ewallet", logoUrl: "/images/banks/shopeepay.svg", isActive: true, sortOrder: 14 },
  { code: "linkaja", name: "LinkAja", category: "ewallet", logoUrl: "/images/banks/linkaja.svg", isActive: true, sortOrder: 15 },
  { code: "qris", name: "QRIS", category: "qris", logoUrl: "/images/banks/qris.svg", isActive: true, sortOrder: 16 },
];

/**
 * Ensures table existence and seeds default master banks if empty.
 */
export async function ensureMasterBanksTable(db: Database): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "master_banks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "category" text DEFAULT 'bank' NOT NULL,
        "logo_url" text NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "master_banks_code_uq" ON "master_banks" ("code");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "master_banks_sort_idx" ON "master_banks" ("sort_order");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "master_banks_active_idx" ON "master_banks" ("is_active");
    `);

    // Check count and seed initial 16 banks if empty
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterBanks);

    if ((countRow?.count ?? 0) === 0) {
      for (const item of DEFAULT_MASTER_BANKS) {
        await db.insert(masterBanks).values(item).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("[ensureMasterBanksTable] notice:", err);
  }
}

export async function listMasterBanks(
  db: Database,
  options?: { onlyActive?: boolean; activeOnly?: boolean },
): Promise<MasterBankRow[]> {
  await ensureMasterBanksTable(db);
  const query = db
    .select()
    .from(masterBanks);

  const shouldFilterActive = options?.onlyActive ?? options?.activeOnly;
  if (shouldFilterActive) {
    const rows = await query
      .where(eq(masterBanks.isActive, true))
      .orderBy(asc(masterBanks.sortOrder), asc(masterBanks.name));
    return rows;
  }

  const rows = await query.orderBy(asc(masterBanks.sortOrder), asc(masterBanks.name));
  return rows;
}

export async function findMasterBankById(
  db: Database,
  id: string,
): Promise<MasterBankRow | undefined> {
  await ensureMasterBanksTable(db);
  const [row] = await db
    .select()
    .from(masterBanks)
    .where(eq(masterBanks.id, id))
    .limit(1);
  return row;
}

export async function findMasterBankByCode(
  db: Database,
  code: string,
): Promise<MasterBankRow | undefined> {
  await ensureMasterBanksTable(db);
  const normalized = code.toLowerCase().trim();
  const [row] = await db
    .select()
    .from(masterBanks)
    .where(sql`lower(${masterBanks.code}) = ${normalized}`)
    .limit(1);
  return row;
}

export async function createMasterBank(
  db: Database,
  input: Omit<NewMasterBankRow, "id" | "createdAt" | "updatedAt">,
): Promise<MasterBankRow> {
  await ensureMasterBanksTable(db);
  const [inserted] = await db
    .insert(masterBanks)
    .values({
      ...input,
      code: input.code.toLowerCase().trim(),
      updatedAt: new Date(),
    })
    .returning();

  if (!inserted) throw new Error("Gagal menambahkan bank master baru.");
  return inserted;
}

export async function updateMasterBank(
  db: Database,
  id: string,
  input: Partial<Omit<NewMasterBankRow, "id" | "createdAt" | "updatedAt">>,
): Promise<MasterBankRow> {
  await ensureMasterBanksTable(db);
  const [updated] = await db
    .update(masterBanks)
    .set({
      ...input,
      ...(input.code ? { code: input.code.toLowerCase().trim() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(masterBanks.id, id))
    .returning();

  if (!updated) throw new Error("Bank master tidak ditemukan untuk diperbarui.");
  return updated;
}

export async function deleteMasterBank(db: Database, id: string): Promise<boolean> {
  await ensureMasterBanksTable(db);
  const result = await db.delete(masterBanks).where(eq(masterBanks.id, id)).returning({ id: masterBanks.id });
  return result.length > 0;
}

export async function toggleMasterBankStatus(
  db: Database,
  id: string,
  explicitStatus?: boolean,
): Promise<MasterBankRow> {
  await ensureMasterBanksTable(db);
  const current = await findMasterBankById(db, id);
  if (!current) throw new Error("Bank tidak ditemukan.");

  const nextActive = typeof explicitStatus === "boolean" ? explicitStatus : !current.isActive;
  const [updated] = await db
    .update(masterBanks)
    .set({
      isActive: nextActive,
      updatedAt: new Date(),
    })
    .where(eq(masterBanks.id, id))
    .returning();

  if (!updated) throw new Error("Gagal mengubah status aktif bank.");
  return updated;
}

export async function resetMasterBanksToDefault(db: Database): Promise<MasterBankRow[]> {
  await ensureMasterBanksTable(db);
  for (const item of DEFAULT_MASTER_BANKS) {
    const existing = await findMasterBankByCode(db, item.code);
    if (!existing) {
      await db.insert(masterBanks).values(item).onConflictDoNothing();
    } else {
      await db
        .update(masterBanks)
        .set({
          name: item.name,
          category: item.category,
          logoUrl: item.logoUrl,
          isActive: true,
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(masterBanks.id, existing.id));
    }
  }
  return listMasterBanks(db);
}
