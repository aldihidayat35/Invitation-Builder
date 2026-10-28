import "server-only";

import { getDb } from "@/lib/db/client";
import {
  listMasterBanks as repoListMasterBanks,
  findMasterBankById as repoFindMasterBankById,
  findMasterBankByCode as repoFindMasterBankByCode,
  createMasterBank as repoCreateMasterBank,
  updateMasterBank as repoUpdateMasterBank,
  deleteMasterBank as repoDeleteMasterBank,
  toggleMasterBankStatus as repoToggleMasterBankStatus,
  resetMasterBanksToDefault as repoResetMasterBanksToDefault,
  DEFAULT_MASTER_BANKS,
} from "@/lib/db/repositories/master-banks";
import type { CreateMasterBankInput, UpdateMasterBankInput, MasterBankItem } from "./types";

export { DEFAULT_MASTER_BANKS };

export async function getMasterBanks(options?: { onlyActive?: boolean }): Promise<MasterBankItem[]> {
  const db = await getDb();
  return repoListMasterBanks(db, options);
}

export async function getMasterBankById(id: string): Promise<MasterBankItem | undefined> {
  const db = await getDb();
  return repoFindMasterBankById(db, id);
}

export async function getMasterBankByCode(code: string): Promise<MasterBankItem | undefined> {
  const db = await getDb();
  return repoFindMasterBankByCode(db, code);
}

export async function createMasterBank(input: CreateMasterBankInput): Promise<MasterBankItem> {
  const db = await getDb();
  return repoCreateMasterBank(db, input);
}

export async function updateMasterBank(id: string, input: UpdateMasterBankInput): Promise<MasterBankItem> {
  const db = await getDb();
  return repoUpdateMasterBank(db, id, input);
}

export async function deleteMasterBank(id: string): Promise<boolean> {
  const db = await getDb();
  return repoDeleteMasterBank(db, id);
}

export async function toggleMasterBankStatus(id: string, explicitStatus?: boolean): Promise<MasterBankItem> {
  const db = await getDb();
  return repoToggleMasterBankStatus(db, id, explicitStatus);
}

export async function resetMasterBanksToDefault(): Promise<MasterBankItem[]> {
  const db = await getDb();
  return repoResetMasterBanksToDefault(db);
}
